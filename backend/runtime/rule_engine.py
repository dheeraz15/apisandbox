"""Rule evaluation engine for conditional mock API responses."""

import re


def evaluate_rules(rules: list, context: dict) -> tuple[dict | None, str | None]:
    """Return (response, rule_name) for the first matching rule."""
    for rule in rules:
        if _evaluate_condition(rule.get("condition", {}), context):
            return rule.get("response"), rule.get("name") or "unnamed_rule"
    return None, None


def _evaluate_condition(condition: dict, context: dict) -> bool:
    if not condition:
        return True

    if "and" in condition:
        return all(
            _evaluate_condition(c, context) for c in condition["and"]
        )
    if "or" in condition:
        return any(
            _evaluate_condition(c, context) for c in condition["or"]
        )

    field = condition.get("field", "")
    operator = condition.get("operator", "equals")
    value = condition.get("value", "")

    actual = _resolve_field(field, context)

    return _compare(actual, operator, value)


def _resolve_field(field: str, context: dict):
    if field.startswith("request.body."):
        body = context.get("request", {}).get("body", {})
        if isinstance(body, dict):
            return _get_nested(body, field[13:])
        return body
    if field.startswith("request.query."):
        return context.get("request", {}).get("query", {}).get(
            field[14:], None
        )
    if field.startswith("request.headers."):
        headers = context.get("request", {}).get("headers", {})
        key = field[16:].lower()
        return headers.get(key) or headers.get(field[16:], None)
    if field.startswith("request.path."):
        return context.get("request", {}).get("path_params", {}).get(
            field[13:], None
        )
    if field.startswith("scenario."):
        return context.get("scenario", {}).get(field[9:], None)
    return None


def _get_nested(obj, path: str):
    parts = path.split(".")
    current = obj
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            return None
    return current


def _compare(actual, operator: str, expected) -> bool:
    if actual is None:
        return operator == "not_exists"

    actual_str = str(actual)
    expected_str = str(expected) if expected is not None else ""

    operators = {
        "equals": lambda: actual_str == expected_str,
        "not_equals": lambda: actual_str != expected_str,
        "contains": lambda: expected_str in actual_str,
        "not_contains": lambda: expected_str not in actual_str,
        "startsWith": lambda: actual_str.startswith(expected_str),
        "endsWith": lambda: actual_str.endswith(expected_str),
        "exists": lambda: actual is not None,
        "not_exists": lambda: actual is None,
        "regex": lambda: bool(re.match(expected_str, actual_str)),
        ">": lambda: _try_float(actual) > _try_float(expected),
        "<": lambda: _try_float(actual) < _try_float(expected),
        ">=": lambda: _try_float(actual) >= _try_float(expected),
        "<=": lambda: _try_float(actual) <= _try_float(expected),
    }

    fn = operators.get(operator)
    return fn() if fn else False


def _try_float(val):
    try:
        return float(val)
    except (TypeError, ValueError):
        return 0.0
