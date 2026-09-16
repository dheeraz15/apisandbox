"""Export MockAPIs / Collections to Postman v2.1 and OpenAPI 3.0."""

from __future__ import annotations

import json
from typing import Any, Iterable


def _path_to_postman(path: str) -> dict:
    parts = [p for p in (path or "/").strip("/").split("/") if p]
    return {
        "raw": "{{baseUrl}}" + (path if path.startswith("/") else f"/{path}"),
        "host": ["{{baseUrl}}"],
        "path": parts or [""],
    }


def _response_body(api) -> Any:
    responses = api.responses or []
    for r in responses:
        if int(r.get("status_code", 0)) == 200:
            return r.get("body", {})
    if responses:
        return responses[0].get("body", {})
    return {}


def api_to_postman_item(api) -> dict:
    method = (api.method or "GET").upper()
    body = None
    if method in ("POST", "PUT", "PATCH") and api.body_example:
        body = {
            "mode": "raw",
            "raw": json.dumps(api.body_example, indent=2),
            "options": {"raw": {"language": "json"}},
        }
    item: dict[str, Any] = {
        "name": api.name,
        "request": {
            "method": method,
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "url": _path_to_postman(api.endpoint),
            "description": api.description or "",
        },
        "response": [
            {
                "name": f"{r.get('name') or r.get('status_code')} example",
                "originalRequest": {
                    "method": method,
                    "header": [],
                    "url": _path_to_postman(api.endpoint),
                },
                "status": str(r.get("status_code", 200)),
                "code": int(r.get("status_code", 200)),
                "_postman_previewlanguage": "json",
                "body": json.dumps(r.get("body", {}), indent=2),
            }
            for r in (api.responses or [])[:5]
        ],
    }
    if body:
        item["request"]["body"] = body
    return item


def export_apis_postman(apis: Iterable, name: str = "API Sandbox export") -> dict:
    items = [api_to_postman_item(a) for a in apis]
    return {
        "info": {
            "name": name,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
            "description": "Exported from API Sandbox",
        },
        "item": items,
        "variable": [{"key": "baseUrl", "value": "https://example.com"}],
    }


def export_collection_postman(collection) -> dict:
    apis = list(collection.apis.all().order_by("name"))
    return export_apis_postman(apis, name=collection.name)


def _openapi_path_params(api) -> list:
    params = []
    for p in api.path_params or []:
        name = p.get("name") or p.get("key")
        if not name:
            continue
        params.append(
            {
                "name": name,
                "in": "path",
                "required": True,
                "schema": {"type": p.get("type", "string")},
            }
        )
    for q in api.query_params or []:
        name = q.get("name") or q.get("key")
        if not name:
            continue
        params.append(
            {
                "name": name,
                "in": "query",
                "required": bool(q.get("required")),
                "schema": {"type": q.get("type", "string")},
            }
        )
    return params


def api_to_openapi_path(api) -> dict:
    method = (api.method or "get").lower()
    op: dict[str, Any] = {
        "summary": api.name,
        "description": api.description or "",
        "operationId": f"{method}_{(api.endpoint or 'root').strip('/').replace('/', '_').replace('{', '').replace('}', '') or 'root'}",
        "tags": [api.category or "default"],
        "parameters": _openapi_path_params(api),
        "responses": {},
    }
    if method in ("post", "put", "patch") and api.body_example is not None:
        op["requestBody"] = {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {"type": "object"},
                    "example": api.body_example,
                }
            },
        }
    responses = api.responses or [{"status_code": 200, "body": {}}]
    for r in responses:
        code = str(r.get("status_code", 200))
        op["responses"][code] = {
            "description": r.get("name") or code,
            "content": {
                "application/json": {
                    "example": r.get("body", {}),
                }
            },
        }
    return {method: op}


def export_apis_openapi(apis: Iterable, title: str = "API Sandbox export") -> dict:
    paths: dict[str, dict] = {}
    for api in apis:
        path = api.endpoint if (api.endpoint or "").startswith("/") else f"/{api.endpoint}"
        paths.setdefault(path, {}).update(api_to_openapi_path(api))
    return {
        "openapi": "3.0.3",
        "info": {
            "title": title,
            "version": "1.0.0",
            "description": "Exported from API Sandbox",
        },
        "paths": paths,
    }


def export_collection_openapi(collection) -> dict:
    apis = list(collection.apis.all().order_by("name"))
    return export_apis_openapi(apis, title=collection.name)
