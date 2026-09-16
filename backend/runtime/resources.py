"""Serving a Resource as a working REST collection.

Every operation here reads and writes the same ResourceRecord rows, which is
the whole point: a POST followed by a GET returns what you just created.
"""

import math
import re
import uuid

from django.utils import timezone

from apis.models import Resource, ResourceRecord

from .template_engine import resolve_json

# Query parameters that control the response rather than filter the data.
CONTROL_PARAMS = {"page", "limit", "sort", "order", "q"}

DEFAULT_LIMIT = 25
MAX_LIMIT = 200


def match_resource(workspace_slug: str, full_path: str):
    """Find the resource serving this path, and the record id if one is given.

    Returns (resource, record_key) where record_key is None for a collection
    level request. Longest path wins, so /accounts/transactions is not
    swallowed by /accounts.
    """
    candidates = Resource.objects.filter(
        workspace__slug=workspace_slug, is_deployed=True
    ).select_related("workspace")

    path = "/" + full_path.strip("/")
    best = None
    best_key = None

    for resource in candidates:
        base = resource.normalized_path
        if path == base:
            if best is None or len(base) > len(best.normalized_path):
                best, best_key = resource, None
        elif path.startswith(base + "/"):
            remainder = path[len(base) + 1 :]
            if "/" in remainder:
                continue
            if best is None or len(base) > len(best.normalized_path):
                best, best_key = resource, remainder

    return best, best_key


def handle_resource_request(resource, record_key, method, body, query_params):
    """Run one operation and return {"status": int, "body": ...}."""
    writing = method in ("POST", "PUT", "PATCH", "DELETE")
    if writing and not resource.allow_writes:
        return {
            "status": 405,
            "body": {
                "error": "READ_ONLY",
                "message": f"{resource.name} is read only.",
            },
        }

    if record_key is None:
        if method == "GET":
            return _list(resource, query_params)
        if method == "POST":
            return _create(resource, body)
        return _method_not_allowed(["GET", "POST"] if resource.allow_writes else ["GET"])

    if method == "GET":
        return _retrieve(resource, record_key)
    if method in ("PUT", "PATCH"):
        return _update(resource, record_key, body, replace=method == "PUT")
    if method == "DELETE":
        return _delete(resource, record_key)

    allowed = ["GET"] + (["PUT", "PATCH", "DELETE"] if resource.allow_writes else [])
    return _method_not_allowed(allowed)


def _method_not_allowed(allowed):
    return {
        "status": 405,
        "body": {"error": "METHOD_NOT_ALLOWED", "allowed_methods": allowed},
        "headers": {"Allow": ", ".join(allowed)},
    }


def _not_found(resource, key):
    return {
        "status": 404,
        "body": {
            "error": "NOT_FOUND",
            "message": f"No {resource.name} with {resource.id_field} {key}.",
        },
    }


def _list(resource, query_params):
    """Collection read, with filtering, search, sorting and pagination.

    Any query parameter that is not a control parameter filters on a field of
    the same name, which is what makes a generated resource usable as a stand
    in for a real list endpoint.
    """
    records = list(resource.records.all())
    rows = [r.data for r in records]

    for key, value in (query_params or {}).items():
        if key in CONTROL_PARAMS:
            continue
        wanted = value[0] if isinstance(value, list) else value
        rows = [r for r in rows if _matches(r.get(key), wanted)]

    search = _single(query_params.get("q")) if query_params else None
    if search:
        needle = str(search).lower()
        rows = [r for r in rows if needle in str(r).lower()]

    sort_field = _single(query_params.get("sort")) if query_params else None
    if sort_field:
        descending = str(_single(query_params.get("order")) or "").lower() == "desc"
        rows.sort(key=lambda r: _sort_key(r.get(sort_field)), reverse=descending)

    total = len(rows)
    limit = _positive_int(_single(query_params.get("limit")) if query_params else None, DEFAULT_LIMIT)
    limit = min(limit, MAX_LIMIT)
    page = _positive_int(_single(query_params.get("page")) if query_params else None, 1)

    start = (page - 1) * limit
    window = rows[start : start + limit]

    return {
        "status": 200,
        "body": {
            "data": window,
            "meta": {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": max(1, math.ceil(total / limit)) if limit else 1,
            },
        },
    }


def _create(resource, body):
    if not isinstance(body, dict):
        return {
            "status": 400,
            "body": {"error": "INVALID_BODY", "message": "Send a JSON object."},
        }

    record = generate_record(resource)
    record.update(body)

    key = str(record.get(resource.id_field) or uuid.uuid4())
    record[resource.id_field] = key

    if resource.records.filter(key=key).exists():
        return {
            "status": 409,
            "body": {
                "error": "ALREADY_EXISTS",
                "message": f"A {resource.name} with {resource.id_field} {key} already exists.",
            },
        }

    ResourceRecord.objects.create(resource=resource, key=key, data=record)
    return {"status": 201, "body": record}


def _retrieve(resource, key):
    row = resource.records.filter(key=key).first()
    if not row:
        return _not_found(resource, key)
    return {"status": 200, "body": row.data}


def _update(resource, key, body, replace):
    row = resource.records.filter(key=key).first()
    if not row:
        return _not_found(resource, key)
    if not isinstance(body, dict):
        return {
            "status": 400,
            "body": {"error": "INVALID_BODY", "message": "Send a JSON object."},
        }

    data = dict(body) if replace else {**row.data, **body}
    # The id in the URL wins, so a body cannot quietly move a record.
    data[resource.id_field] = key

    row.data = data
    row.save(update_fields=["data", "updated_at"])
    return {"status": 200, "body": data}


def _delete(resource, key):
    row = resource.records.filter(key=key).first()
    if not row:
        return _not_found(resource, key)
    row.delete()
    return {"status": 200, "body": {"deleted": True, resource.id_field: key}}


def generate_record(resource, index=0) -> dict:
    """Render one record from the resource's template."""
    template = resource.item_template or {}
    context = {
        "_seed": (resource.behavior or {}).get("seed"),
        "_index": index,
        "request": {"method": "", "path": "", "headers": {}, "query": {}, "body": {}, "path_params": {}},
        "workspace": {
            "id": str(resource.workspace_id),
            "slug": resource.workspace.slug,
            "name": resource.workspace.name,
        },
        "env": {},
        "scenario": {},
    }
    rendered = resolve_json(template, context)
    return rendered if isinstance(rendered, dict) else {}


def seed_records(resource, count: int) -> int:
    """Fill a resource with generated records. Returns how many were written."""
    count = max(0, min(int(count or 0), 500))
    created = 0
    seed = (resource.behavior or {}).get("seed")

    for i in range(count):
        # Each record needs its own generator, or a seeded resource would
        # produce the same record N times.
        if seed is not None:
            resource.behavior = {**(resource.behavior or {}), "seed": seed + i}
        record = generate_record(resource, index=i)
        key = str(record.get(resource.id_field) or uuid.uuid4())
        record[resource.id_field] = key
        if resource.records.filter(key=key).exists():
            continue
        ResourceRecord.objects.create(resource=resource, key=key, data=record)
        created += 1

    if seed is not None:
        resource.behavior = {**(resource.behavior or {}), "seed": seed}
    return created


def _matches(actual, wanted) -> bool:
    if actual is None:
        return False
    return str(actual).lower() == str(wanted).lower()


def _sort_key(value):
    # Keep numbers ordered numerically and everything else as text, without
    # blowing up when a field is missing from some records.
    if isinstance(value, (int, float)):
        return (0, value, "")
    return (1, 0, str(value or ""))


def _single(value):
    if isinstance(value, list):
        return value[0] if value else None
    return value


def _positive_int(value, fallback):
    try:
        n = int(value)
        return n if n > 0 else fallback
    except (TypeError, ValueError):
        return fallback


def touch(resource):
    Resource.objects.filter(pk=resource.pk).update(
        total_requests=resource.total_requests + 1, updated_at=timezone.now()
    )
