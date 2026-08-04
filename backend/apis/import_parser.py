"""Universal import: Postman collections, OpenAPI, curl."""

import json
import re
from urllib.parse import urlparse
from typing import Any


def import_from_format(format_type: str, content: Any) -> dict:
    if format_type == "postman":
        data = content if isinstance(content, dict) else json.loads(content)
        return parse_postman_collection(data)
    if format_type in ("openapi", "swagger"):
        data = content if isinstance(content, dict) else json.loads(content)
        return parse_openapi(data)
    if format_type == "curl":
        text = content if isinstance(content, str) else str(content)
        return parse_curl(text)
    if format_type == "json":
        data = content if isinstance(content, dict) else json.loads(content)
        if "item" in data and "info" in data:
            return parse_postman_collection(data)
        if "paths" in data or "openapi" in data or "swagger" in data:
            return parse_openapi(data)
        return {"collections": [], "apis": [parse_raw_json_api(data)], "datasets": []}
    raise ValueError(f"Unsupported format: {format_type}")


def parse_postman_collection(data: dict) -> dict:
    root_name = data.get("info", {}).get("name", "Imported Collection")
    collections: list[dict] = []
    standalone_apis: list[dict] = []
    datasets: list[dict] = []

    def parse_request(item: dict) -> dict | None:
        req = item.get("request")
        if not req:
            return None
        method = (req.get("method") or "GET").upper()
        url = req.get("url")
        path = "/"
        if isinstance(url, str):
            parsed = urlparse(url)
            path = parsed.path or "/"
        elif isinstance(url, dict):
            raw = url.get("raw", "")
            if raw:
                parsed = urlparse(raw)
                path = parsed.path or "/"
            else:
                path_parts = url.get("path", [""])
                if isinstance(path_parts, list):
                    path = "/" + "/".join(str(p) for p in path_parts if p)
                else:
                    path = str(path_parts)

        path = _normalize_path(path)
        name = item.get("name", path)

        body_example: dict = {}
        body_raw = None
        body = req.get("body") or {}
        if body.get("mode") == "raw" and body.get("raw"):
            body_raw = body["raw"]
            try:
                body_example = json.loads(body_raw)
                if not isinstance(body_example, dict):
                    body_example = {"value": body_example}
            except json.JSONDecodeError:
                body_example = {"_raw": body_raw[:500]}

        response_body = _mock_response_from_body(body_example, name)
        responses = [
            {
                "status_code": 200,
                "name": "Success",
                "body": response_body,
            },
            {
                "status_code": 400,
                "name": "Bad Request",
                "body": {"error": "VALIDATION_ERROR", "message": "Invalid request"},
            },
        ]

        # Postman saved examples
        for resp in item.get("response", [])[:3]:
            code = resp.get("code", 200)
            try:
                rb = json.loads(resp.get("body", "{}"))
            except (json.JSONDecodeError, TypeError):
                rb = {"body": resp.get("body", "")}
            responses.append(
                {
                    "status_code": code,
                    "name": resp.get("name", f"Example {code}"),
                    "body": rb if isinstance(rb, dict) else {"data": rb},
                }
            )

        return {
            "name": name,
            "description": item.get("description", f"Imported from Postman: {name}"),
            "category": "Imported",
            "method": method,
            "endpoint": path,
            "body_type": "json",
            "body_example": body_example,
            "responses": responses[:6],
            "rules": [],
            "tags": ["postman-import"],
        }

    def walk_items(items: list, collection_name: str) -> list[dict]:
        apis = []
        for item in items:
            if "item" in item:
                folder_name = item.get("name", collection_name)
                sub_apis = walk_items(item["item"], folder_name)
                if sub_apis:
                    collections.append({"name": folder_name, "apis": sub_apis})
            else:
                api = parse_request(item)
                if api:
                    apis.append(api)
        return apis

    top_items = data.get("item", [])
    top_apis = []
    for item in top_items:
        if "item" in item:
            folder_name = item.get("name", "Folder")
            sub = walk_items(item["item"], folder_name)
            if sub:
                collections.append({"name": folder_name, "apis": sub})
        else:
            api = parse_request(item)
            if api:
                top_apis.append(api)

    if top_apis and not collections:
        collections.append({"name": root_name, "apis": top_apis})
    elif top_apis:
        standalone_apis.extend(top_apis)

    # Collection variables as dataset
    variables = data.get("variable", [])
    if variables:
        var_data = {v.get("key", "var"): v.get("value", "") for v in variables if v.get("key")}
        if var_data:
            datasets.append(
                {
                    "name": f"{root_name} — variables",
                    "description": "Postman collection variables",
                    "data": var_data,
                }
            )

    # Generate sample dataset from first API bodies
    sample_records = []
    all_apis = top_apis + [a for c in collections for a in c.get("apis", [])]
    for api in all_apis[:20]:
        ex = api.get("body_example", {})
        if ex and isinstance(ex, dict) and ex != {"_raw": ex.get("_raw")}:
            sample_records.append({**ex, "_endpoint": api.get("endpoint")})
    if sample_records:
        datasets.append(
            {
                "name": f"{root_name} — sample requests",
                "description": "Generated from Postman request bodies",
                "data": {"records": sample_records},
            }
        )

    return {
        "collections": collections,
        "apis": standalone_apis,
        "datasets": datasets,
        "source": "postman",
        "summary": {
            "collection_count": len(collections),
            "api_count": sum(len(c["apis"]) for c in collections) + len(standalone_apis),
            "dataset_count": len(datasets),
        },
    }


def parse_openapi(data: dict) -> dict:
    paths = data.get("paths", {})
    collection_name = data.get("info", {}).get("title", "OpenAPI Import")
    apis = []

    for path, methods in paths.items():
        if not isinstance(methods, dict):
            continue
        norm_path = _normalize_path(path)
        for method, spec in methods.items():
            if method.upper() not in ("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"):
                continue
            if not isinstance(spec, dict):
                continue
            name = spec.get("operationId") or spec.get("summary") or f"{method.upper()} {norm_path}"
            body_example = {}
            for param in spec.get("parameters", []):
                if param.get("in") == "query" and param.get("name"):
                    body_example[param["name"]] = _schema_sample(param.get("schema", {}))
            req_body = spec.get("requestBody", {})
            content = req_body.get("content", {})
            json_ct = content.get("application/json", {})
            schema = json_ct.get("schema", {})
            if schema:
                body_example = _schema_to_example(schema)

            responses = []
            for code, rspec in spec.get("responses", {}).items():
                try:
                    status = int(code)
                except ValueError:
                    continue
                rb = {}
                rcontent = rspec.get("content", {})
                if "application/json" in rcontent:
                    rb = _schema_to_example(rcontent["application/json"].get("schema", {}))
                if not rb:
                    rb = {"message": rspec.get("description", "Response")}
                responses.append({"status_code": status, "name": rspec.get("description", str(status)), "body": rb})

            if not responses:
                responses = [
                    {
                        "status_code": 200,
                        "name": "Success",
                        "body": _mock_response_from_body(body_example, name),
                    }
                ]

            apis.append(
                {
                    "name": name,
                    "description": spec.get("description", name),
                    "category": "Imported",
                    "method": method.upper(),
                    "endpoint": norm_path,
                    "body_type": "json",
                    "body_example": body_example,
                    "responses": responses[:8],
                    "rules": [],
                    "tags": ["openapi-import"],
                }
            )

    return {
        "collections": [{"name": collection_name, "apis": apis}] if apis else [],
        "apis": [],
        "datasets": [],
        "source": "openapi",
        "summary": {
            "collection_count": 1 if apis else 0,
            "api_count": len(apis),
            "dataset_count": 0,
        },
    }


def parse_curl(text: str) -> dict:
    text = " ".join(text.strip().split())
    method = "GET"
    m = re.search(r"-X\s+(\w+)", text, re.I)
    if m:
        method = m.group(1).upper()
    url_m = re.search(r"curl\s+(?:[^\s]+\s+)*['\"]?(https?://[^\s'\"]+)['\"]?", text, re.I)
    if not url_m:
        url_m = re.search(r"['\"]?(https?://[^\s'\"]+)['\"]?", text)
    if not url_m:
        raise ValueError("Could not find URL in curl command")
    parsed = urlparse(url_m.group(1))
    path = _normalize_path(parsed.path or "/")

    body_example = {}
    d_m = re.search(r"-d\s+['\"](.+?)['\"](?:\s|$)", text, re.S)
    if not d_m:
        d_m = re.search(r"--data(?:-raw)?\s+['\"](.+?)['\"]", text, re.S)
    if d_m:
        try:
            body_example = json.loads(d_m.group(1))
            if not isinstance(body_example, dict):
                body_example = {"value": body_example}
        except json.JSONDecodeError:
            body_example = {"_raw": d_m.group(1)[:500]}

    name = f"{method} {path}"
    return {
        "collections": [],
        "apis": [
            {
                "name": name,
                "description": "Imported from curl",
                "category": "Imported",
                "method": method,
                "endpoint": path,
                "body_type": "json",
                "body_example": body_example,
                "responses": [
                    {
                        "status_code": 200,
                        "name": "Success",
                        "body": _mock_response_from_body(body_example, name),
                    }
                ],
                "rules": [],
                "tags": ["curl-import"],
            }
        ],
        "datasets": [],
        "source": "curl",
        "summary": {"collection_count": 0, "api_count": 1, "dataset_count": 0},
    }


def parse_raw_json_api(data: dict) -> dict:
    method = data.get("method", "POST").upper()
    path = _normalize_path(data.get("endpoint", data.get("path", "/")))
    return {
        "name": data.get("name", path),
        "description": data.get("description", ""),
        "method": method,
        "endpoint": path,
        "body_type": "json",
        "body_example": data.get("body_example", data.get("body", {})),
        "responses": data.get("responses", [{"status_code": 200, "name": "Success", "body": {}}]),
        "rules": data.get("rules", []),
        "tags": ["json-import"],
    }


def _normalize_path(path: str) -> str:
    path = path.strip()
    if not path.startswith("/"):
        path = "/" + path
    # Replace Postman path params :id with {id}
    path = re.sub(r":(\w+)", r"{\1}", path)
    return path or "/"


def _schema_sample(schema: dict) -> Any:
    return _schema_to_example(schema)


def _schema_to_example(schema: dict) -> dict:
    if not schema:
        return {}
    if "example" in schema:
        ex = schema["example"]
        return ex if isinstance(ex, dict) else {"value": ex}
    st = schema.get("type", "object")
    if st == "object":
        props = schema.get("properties", {})
        return {k: _schema_to_example(v) if isinstance(v, dict) else "sample" for k, v in props.items()}
    if st == "array":
        items = schema.get("items", {})
        return [_schema_to_example(items) if isinstance(items, dict) else "item"]
    if st == "string":
        return "string"
    if st == "integer":
        return 0
    if st == "number":
        return 0.0
    if st == "boolean":
        return True
    return {}


def _mock_response_from_body(body_example: dict, name: str) -> dict:
    if not body_example or body_example.get("_raw"):
        return {
            "success": True,
            "message": f"Mock response for {name}",
            "id": "{{faker.string.uuid}}",
            "timestamp": "{{timestamp}}",
        }
    out = {}
    for key, val in body_example.items():
        if key.startswith("_"):
            continue
        lk = key.lower()
        if "email" in lk:
            out[key] = "{{faker.internet.email}}"
        elif "name" in lk:
            out[key] = "{{faker.person.fullName}}"
        elif "phone" in lk or "mobile" in lk:
            out[key] = "{{faker.phone.number}}"
        elif "id" in lk or lk.endswith("id"):
            out[key] = "{{faker.string.uuid}}"
        elif "amount" in lk or "balance" in lk or "price" in lk:
            out[key] = "{{random.float}}"
        elif isinstance(val, bool):
            out[key] = val
        elif isinstance(val, int):
            out[key] = "{{random.int}}"
        elif isinstance(val, float):
            out[key] = "{{random.float}}"
        elif isinstance(val, list):
            out[key] = val
        elif isinstance(val, dict):
            out[key] = _mock_response_from_body(val, key)
        else:
            out[key] = f"{{{{request.body.{key}}}}}"
    out.setdefault("success", True)
    return out


from django.utils import timezone as dj_timezone


def persist_import(workspace_id: str, parsed: dict, deploy: bool = True) -> dict:
    from workspaces.models import Workspace
    from apis.models import MockAPI, Collection, Dataset

    workspace = Workspace.objects.get(id=workspace_id)
    created_collections = []
    created_apis = []
    created_datasets = []

    def save_api(spec: dict, collection=None):
        api = MockAPI.objects.create(
            workspace=workspace,
            collection=collection,
            name=spec.get("name", "Imported API")[:255],
            description=spec.get("description", "")[:2000],
            category=spec.get("category", "Imported"),
            method=spec.get("method", "GET"),
            endpoint=spec.get("endpoint", "/")[:500],
            body_type=spec.get("body_type", "json"),
            body_example=spec.get("body_example", {}),
            responses=spec.get("responses", []),
            rules=spec.get("rules", []),
            tags=spec.get("tags", []),
            cors_enabled=True,
            is_deployed=deploy,
            deployed_at=dj_timezone.now() if deploy else None,
        )
        created_apis.append(str(api.id))
        return api

    for col_data in parsed.get("collections", []):
        col = Collection.objects.create(
            workspace=workspace,
            name=col_data.get("name", "Imported")[:255],
            description=f"Imported collection ({parsed.get('source', 'import')})",
        )
        created_collections.append(str(col.id))
        for api_spec in col_data.get("apis", []):
            save_api(api_spec, collection=col)

    for api_spec in parsed.get("apis", []):
        save_api(api_spec)

    for ds_data in parsed.get("datasets", []):
        ds = Dataset.objects.create(
            workspace=workspace,
            name=ds_data.get("name", "Imported dataset")[:255],
            description=ds_data.get("description", ""),
            data=ds_data.get("data", {}),
        )
        created_datasets.append(str(ds.id))

    return {
        "collections": created_collections,
        "apis": created_apis,
        "datasets": created_datasets,
        "summary": parsed.get("summary", {}),
        "source": parsed.get("source"),
    }
