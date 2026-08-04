"""Middleware for multi-tenant custom domains."""

from __future__ import annotations

from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.utils.deprecation import MiddlewareMixin

from workspaces.domain_verify import platform_hosts


MANAGEMENT_PREFIXES = (
    "/api/v1/",
    "/admin/",
    "/static/",
    "/favicon.ico",
)


class CustomDomainMiddleware(MiddlewareMixin):
    """
    1) Allow verified custom domain Host values (multi-tenant ALLOWED_HOSTS).
    2) Route mock API traffic on custom domains to the runtime engine without
       requiring /api/{workspace} in the path.
    """

    def process_request(self, request):
        host = (request.META.get("HTTP_HOST") or "").split(":")[0].lower().rstrip(".")
        request.custom_domain = None  # type: ignore[attr-defined]
        request.custom_domain_workspace = None  # type: ignore[attr-defined]

        if not host or host in platform_hosts():
            return None

        # Lazy import to avoid app-registry issues at import time
        from workspaces.models import WorkspaceDomain

        domain = (
            WorkspaceDomain.objects.filter(domain=host, verified=True)
            .select_related("workspace")
            .first()
        )
        if not domain:
            return None

        # Allow this host for the remainder of the request lifecycle
        if "*" not in settings.ALLOWED_HOSTS and host not in settings.ALLOWED_HOSTS:
            settings.ALLOWED_HOSTS.append(host)

        request.custom_domain = domain  # type: ignore[attr-defined]
        request.custom_domain_workspace = domain.workspace  # type: ignore[attr-defined]

        path = request.path or "/"
        if any(path.startswith(p) for p in MANAGEMENT_PREFIXES):
            return None

        # Legacy path still works: /api/{workspace}/...
        if path.startswith("/api/") and not path.startswith("/api/v1/"):
            return None

        return self._handle_custom_domain_mock(request, domain, path)

    def _handle_custom_domain_mock(self, request, domain, path):
        from runtime.views import handle_mock_request

        if request.method == "OPTIONS":
            response = HttpResponse(status=204)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS"
            )
            response["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-API-Key"
            )
            return response

        endpoint_path = path if path.startswith("/") else f"/{path}"
        return handle_mock_request(
            request,
            workspace_slug=domain.workspace.slug,
            endpoint_path=endpoint_path,
            custom_domain=domain,
        )
