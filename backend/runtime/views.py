"""Django view that routes incoming mock API requests to the engine."""

import json
import re
from django.http import JsonResponse, HttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from apis.models import MockAPI
from .engine import MockAPIEngine


def handle_mock_request(request, workspace_slug, endpoint_path, custom_domain=None):
    """Shared mock handler for platform /api/{workspace}/... and custom domains."""
    method = request.method
    full_path = "/" + endpoint_path.lstrip("/") if endpoint_path else "/"

    apis = MockAPI.objects.filter(
        workspace__slug=workspace_slug,
        is_deployed=True,
        method=method,
    ).select_related("custom_domain", "workspace")

    if custom_domain is not None:
        # Only endpoints bound to this custom domain
        apis = apis.filter(custom_domain=custom_domain)
    else:
        # Platform host: only endpoints without a custom domain binding
        apis = apis.filter(custom_domain__isnull=True)

    matched_api = None
    path_params = {}

    for api in apis:
        params = _match_path(api.endpoint, full_path)
        if params is not None:
            matched_api = api
            path_params = params
            break

    if not matched_api:
        # Path may exist under a different method — give a clearer error
        path_candidates = MockAPI.objects.filter(
            workspace__slug=workspace_slug,
            is_deployed=True,
        ).select_related("custom_domain")
        if custom_domain is not None:
            path_candidates = path_candidates.filter(custom_domain=custom_domain)
        else:
            path_candidates = path_candidates.filter(custom_domain__isnull=True)

        other_methods = []
        for api in path_candidates:
            if _match_path(api.endpoint, full_path) is not None:
                other_methods.append(api.method)

        if other_methods:
            return JsonResponse(
                {
                    "error": "Method not allowed",
                    "path": full_path,
                    "method": method,
                    "allowed_methods": sorted(set(other_methods)),
                    "hint": f"This endpoint is deployed as {', '.join(sorted(set(other_methods)))}. Retry with the correct HTTP method.",
                    "domain": custom_domain.domain if custom_domain else "platform",
                },
                status=405,
                headers={"Allow": ", ".join(sorted(set(other_methods + ["OPTIONS"])))},
            )

        return JsonResponse(
            {
                "error": "Endpoint not found",
                "path": full_path,
                "method": method,
                "domain": custom_domain.domain if custom_domain else "platform",
            },
            status=404,
        )

    body = None
    if method in ("POST", "PUT", "PATCH"):
        content_type = request.content_type or ""
        if "json" in content_type:
            try:
                body = json.loads(request.body)
            except (json.JSONDecodeError, ValueError):
                body = {"raw": request.body.decode("utf-8", errors="replace")}
        elif "form" in content_type:
            body = dict(request.POST)
        else:
            try:
                body = json.loads(request.body)
            except (json.JSONDecodeError, ValueError):
                body = request.body.decode("utf-8", errors="replace")

    headers = {k: v for k, v in request.headers.items()}
    query_params = dict(request.GET)

    engine = MockAPIEngine(matched_api)
    result = engine.process_request(
        method=method,
        path=full_path,
        headers=headers,
        query_params=query_params,
        body=body,
        path_params=path_params,
        client_ip=_get_client_ip(request),
    )

    response = JsonResponse(
        result["body"],
        status=result["status"],
        safe=isinstance(result["body"], dict),
    )

    for key, value in result.get("headers", {}).items():
        response[key] = value

    if matched_api.cors_enabled:
        cors = matched_api.cors_config or {}
        origin = request.headers.get("Origin", "*")
        allowed = cors.get("origins", ["*"])
        if "*" in allowed or origin in allowed:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = ",".join(
                cors.get("methods", ["GET", "POST", "PUT", "PATCH", "DELETE"])
            )
            response["Access-Control-Allow-Headers"] = ",".join(
                cors.get(
                    "headers",
                    ["Content-Type", "Authorization", "X-API-Key"],
                )
            )

    response["X-Sandbox-Latency-Ms"] = str(result["latency_ms"])
    response["X-Sandbox-Scenario"] = result.get("scenario", "default")
    if custom_domain:
        response["X-Sandbox-Domain"] = custom_domain.domain

    return response


@method_decorator(csrf_exempt, name="dispatch")
class MockAPIHandlerView(View):
    def dispatch(self, request, workspace_slug, endpoint_path):
        custom_domain = getattr(request, "custom_domain", None)
        # On a custom domain, /api/{workspace}/... still works for bound endpoints
        return handle_mock_request(
            request,
            workspace_slug=workspace_slug,
            endpoint_path=endpoint_path,
            custom_domain=custom_domain,
        )

    def options(self, request, workspace_slug, endpoint_path):
        response = HttpResponse(status=204)
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Methods"] = (
            "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS"
        )
        response["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, X-API-Key"
        )
        return response


def _match_path(pattern: str, path: str) -> dict | None:
    regex_parts = []
    param_names = []
    for part in pattern.strip("/").split("/"):
        if part.startswith("{") and part.endswith("}"):
            name = part[1:-1]
            param_names.append(name)
            regex_parts.append("(?P<" + name + ">[^/]+)")
        else:
            regex_parts.append(re.escape(part))

    regex = "^/" + "/".join(regex_parts) + "/?$"
    match = re.match(regex, path)
    if match:
        return match.groupdict()
    return None


def _get_client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")
