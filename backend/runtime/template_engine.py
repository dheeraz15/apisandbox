"""Template variable resolver for mock API responses."""

import re
import uuid
import random
import time
from datetime import datetime, timezone
from faker import Faker

fake = Faker()
VARIABLE_PATTERN = re.compile(r"\{\{([^}]+)\}\}")


def resolve_template(template, context: dict) -> str:
    if not isinstance(template, str):
        return template

    def replace_var(match):
        var_path = match.group(1).strip()
        return str(_resolve_variable(var_path, context))

    return VARIABLE_PATTERN.sub(replace_var, template)


def resolve_json(obj, context: dict):
    if isinstance(obj, str):
        resolved = resolve_template(obj, context)
        try:
            import json

            return json.loads(resolved)
        except (json.JSONDecodeError, ValueError):
            return resolved
    elif isinstance(obj, dict):
        return {k: resolve_json(v, context) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [resolve_json(item, context) for item in obj]
    return obj


def _resolve_variable(path: str, context: dict) -> str:
    if path == "uuid":
        return str(uuid.uuid4())
    if path == "timestamp":
        return str(int(time.time()))
    if path == "randomInt":
        return str(random.randint(1, 100000))
    if path == "randomFloat":
        return str(round(random.uniform(0, 10000), 2))
    if path == "date":
        return datetime.now(timezone.utc).isoformat()

    if path.startswith("faker."):
        faker_method = path[6:]
        method = getattr(fake, faker_method, None)
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
        env_vars = context.get("env", {})
        key = path[4:]
        return str(env_vars.get(key, ""))

    return f"{{{{unknown:{path}}}}}"


def _get_nested(obj, path: str, default=""):
    parts = path.split(".")
    current = obj
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part, default)
        else:
            return default
    return str(current) if current is not None else default
