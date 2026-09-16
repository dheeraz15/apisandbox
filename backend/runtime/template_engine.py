"""Template variable resolver for mock API responses.

Two things happen here. Strings are scanned for ``{{variable}}`` placeholders
and substituted, and JSON structures are walked so a ``$repeat`` block can
expand into a list of generated items.

Everything random goes through the generator held on the context, so an
endpoint with a seed produces byte-identical output on every call. That is what
makes a mock usable in a snapshot test.
"""

import json
import random
import re
import time
import uuid
from datetime import datetime, timedelta, timezone

from faker import Faker

VARIABLE_PATTERN = re.compile(r"\{\{([^}]+)\}\}")

REPEAT_KEY = "$repeat"
ITEM_KEY = "$item"

# A repeat block is capped so a typo cannot ask for a million records and take
# the process down with it.
MAX_REPEAT = 1000

_shared_faker = Faker()


class Generator:
    """Source of every random value produced while rendering one response.

    Without a seed it delegates to a process-wide Faker, which keeps the old
    behaviour of fresh values per call. With a seed, both Faker and the random
    number generator are reset so the same request always renders the same
    response.
    """

    def __init__(self, seed=None):
        self.seed = seed
        if seed is None:
            self.random = random
            self.faker = _shared_faker
        else:
            self.random = random.Random(seed)
            self.faker = Faker()
            self.faker.seed_instance(seed)

    def uuid(self) -> str:
        if self.seed is None:
            return str(uuid.uuid4())
        # uuid4 does not accept a seed, so build one from seeded randomness.
        return str(uuid.UUID(int=self.random.getrandbits(128), version=4))


def build_context_generator(context: dict) -> Generator:
    """Return the generator for this render, creating it on first use."""
    gen = context.get("_generator")
    if gen is None:
        gen = Generator(context.get("_seed"))
        context["_generator"] = gen
    return gen


def resolve_template(template, context: dict) -> str:
    if not isinstance(template, str):
        return template

    def replace_var(match):
        return str(_resolve_variable(match.group(1).strip(), context))

    return VARIABLE_PATTERN.sub(replace_var, template)


def resolve_json(obj, context: dict):
    if isinstance(obj, str):
        resolved = resolve_template(obj, context)
        try:
            return json.loads(resolved)
        except (json.JSONDecodeError, ValueError):
            return resolved
    if isinstance(obj, dict):
        if REPEAT_KEY in obj:
            return _expand_repeat(obj, context)
        return {k: resolve_json(v, context) for k, v in obj.items()}
    if isinstance(obj, list):
        return [resolve_json(item, context) for item in obj]
    return obj


def _expand_repeat(block: dict, context: dict):
    """Expand ``{"$repeat": 5, "$item": {...}}`` into a list of five items.

    ``$repeat`` may also be a two element list, ``[2, 5]``, to pick a random
    count in that range, which is handy when a list length should vary.
    """
    count = block.get(REPEAT_KEY)
    gen = build_context_generator(context)

    if isinstance(count, list) and len(count) == 2:
        try:
            low, high = int(count[0]), int(count[1])
        except (TypeError, ValueError):
            return []
        if low > high:
            low, high = high, low
        count = gen.random.randint(max(low, 0), max(high, 0))

    try:
        count = int(count)
    except (TypeError, ValueError):
        return []

    count = max(0, min(count, MAX_REPEAT))
    template = block.get(ITEM_KEY)
    if template is None:
        return []

    items = []
    previous_index = context.get("_index")
    for i in range(count):
        context["_index"] = i
        items.append(resolve_json(template, context))
    if previous_index is None:
        context.pop("_index", None)
    else:
        context["_index"] = previous_index
    return items


def _resolve_variable(path: str, context: dict):
    gen = build_context_generator(context)

    if path == "uuid":
        return gen.uuid()
    if path == "timestamp":
        return str(int(time.time()))
    if path == "randomInt":
        return str(gen.random.randint(1, 100000))
    if path == "randomFloat":
        return str(round(gen.random.uniform(0, 10000), 2))
    if path == "randomBool":
        return "true" if gen.random.random() < 0.5 else "false"
    if path == "date":
        return datetime.now(timezone.utc).isoformat()
    if path == "index":
        return str(context.get("_index", 0))

    # {{randomInt:1:10}} draws from an inclusive range.
    if path.startswith("randomInt:"):
        bounds = path.split(":")[1:]
        if len(bounds) == 2:
            try:
                low, high = int(bounds[0]), int(bounds[1])
                if low > high:
                    low, high = high, low
                return str(gen.random.randint(low, high))
            except ValueError:
                pass
        return f"{{{{unknown:{path}}}}}"

    # {{randomFrom:pending|active|closed}} picks one of the listed values.
    if path.startswith("randomFrom:"):
        choices = [c for c in path[len("randomFrom:") :].split("|") if c != ""]
        if choices:
            return gen.random.choice(choices)
        return f"{{{{unknown:{path}}}}}"

    # {{dateOffset:-7d}} and {{dateOffset:3h}} give times relative to now, so a
    # response can carry a plausible "created two days ago".
    if path.startswith("dateOffset:"):
        return _date_offset(path[len("dateOffset:") :])

    if path.startswith("faker."):
        method = getattr(gen.faker, path[6:], None)
        if callable(method):
            return str(method())
        return f"{{{{unknown:{path}}}}}"

    # {{request.path.id}} means the captured path parameter, not an attribute of
    # the path string, so it is resolved against path_params first.
    if path.startswith("request.path."):
        params = context.get("request", {}).get("path_params", {})
        return _get_nested(params, path[len("request.path.") :])

    if path.startswith("request."):
        return _get_nested(context.get("request", {}), path[8:])

    if path.startswith("workspace."):
        return _get_nested(context.get("workspace", {}), path[10:])

    if path.startswith("env."):
        return str(context.get("env", {}).get(path[4:], ""))

    return f"{{{{unknown:{path}}}}}"


_OFFSET_PATTERN = re.compile(r"^([+-]?\d+)([smhdw])$")
_OFFSET_UNITS = {
    "s": "seconds",
    "m": "minutes",
    "h": "hours",
    "d": "days",
    "w": "weeks",
}


def _date_offset(spec: str) -> str:
    match = _OFFSET_PATTERN.match(spec.strip())
    if not match:
        return f"{{{{unknown:dateOffset:{spec}}}}}"
    amount, unit = int(match.group(1)), match.group(2)
    moment = datetime.now(timezone.utc) + timedelta(**{_OFFSET_UNITS[unit]: amount})
    return moment.isoformat()


def _get_nested(obj, path: str, default=""):
    current = obj
    for part in path.split("."):
        if isinstance(current, dict):
            current = current.get(part, default)
        else:
            return default
    return str(current) if current is not None else default
