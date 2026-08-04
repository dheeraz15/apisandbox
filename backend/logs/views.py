import json
import secrets
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from .models import RequestLog, IncomingWebhook, WebhookDelivery, OutgoingWebhook
from .serializers import (
    RequestLogSerializer,
    IncomingWebhookSerializer,
    WebhookDeliverySerializer,
    OutgoingWebhookSerializer,
)
from workspaces.permissions import user_workspace_ids, require_workspace_access, IsWorkspaceMember


class RequestLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RequestLogSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        qs = RequestLog.objects.select_related("api", "workspace", "collection").filter(
            workspace_id__in=user_workspace_ids(self.request.user)
        )
        workspace = self.request.query_params.get("workspace")
        if workspace:
            qs = qs.filter(workspace__slug=workspace)
        api_id = self.request.query_params.get("api")
        if api_id:
            qs = qs.filter(api_id=api_id)
        collection = self.request.query_params.get("collection")
        if collection:
            qs = qs.filter(collection_id=collection)
        status_code = self.request.query_params.get("status")
        if status_code:
            qs = qs.filter(status_code=status_code)
        method = self.request.query_params.get("method")
        if method:
            qs = qs.filter(method=method.upper())
        finding = self.request.query_params.get("finding")
        if finding:
            qs = qs.filter(finding__icontains=finding)
        search = self.request.query_params.get("search")
        if search:
            qs = (
                qs.filter(path__icontains=search)
                | qs.filter(api__name__icontains=search)
                | qs.filter(finding__icontains=search)
            )
        return qs

    @action(detail=False, methods=["get"])
    def export(self, request):
        import csv
        import io

        qs = self.filter_queryset(self.get_queryset())[:1000]
        format_type = request.query_params.get("format", "json")

        if format_type == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(
                [
                    "time",
                    "method",
                    "path",
                    "status",
                    "latency_ms",
                    "api",
                    "collection",
                    "finding",
                    "scenario",
                    "client_ip",
                ]
            )
            for log in qs:
                writer.writerow(
                    [
                        log.created_at.isoformat(),
                        log.method,
                        log.path,
                        log.status_code,
                        log.latency_ms,
                        log.api.name if log.api else "",
                        log.collection.name if log.collection else "",
                        log.finding,
                        log.scenario_used,
                        log.client_ip,
                    ]
                )
            response = HttpResponse(output.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="logs.csv"'
            return response

        data = RequestLogSerializer(qs, many=True).data
        response = HttpResponse(
            json.dumps(data, indent=2, default=str),
            content_type="application/json",
        )
        response["Content-Disposition"] = 'attachment; filename="logs.json"'
        return response

    @action(detail=True, methods=["post"])
    def replay(self, request, pk=None):
        log = self.get_object()
        if not log.api:
            return Response({"error": "Original API no longer exists"}, status=404)

        from runtime.engine import MockAPIEngine

        engine = MockAPIEngine(log.api)
        result = engine.process_request(
            method=log.method,
            path=log.path,
            headers=log.request_headers,
            query_params=log.query_params or {},
            body=log.request_body,
            client_ip="127.0.0.1",
            dry_run=True,
        )
        return Response(result)


class IncomingWebhookViewSet(viewsets.ModelViewSet):
    serializer_class = IncomingWebhookSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        qs = IncomingWebhook.objects.filter(
            workspace_id__in=user_workspace_ids(self.request.user)
        )
        workspace = self.request.query_params.get("workspace")
        if workspace:
            qs = qs.filter(workspace__slug=workspace)
        return qs

    def perform_create(self, serializer):
        workspace = serializer.validated_data.get("workspace")
        if workspace:
            require_workspace_access(self.request.user, workspace_id=workspace.id, edit=True)
        secret = serializer.validated_data.get("secret") or secrets.token_hex(16)
        serializer.save(secret=secret)

    def perform_update(self, serializer):
        require_workspace_access(
            self.request.user, workspace_id=self.get_object().workspace_id, edit=True
        )
        serializer.save()

    def perform_destroy(self, instance):
        require_workspace_access(
            self.request.user, workspace_id=instance.workspace_id, edit=True
        )
        instance.delete()

    @action(detail=True, methods=["get"])
    def deliveries(self, request, pk=None):
        webhook = self.get_object()
        qs = webhook.deliveries.all()
        since = request.query_params.get("since")
        if since:
            qs = qs.filter(created_at__gt=since)
        sort = request.query_params.get("sort", "newest")
        if sort == "oldest":
            qs = qs.order_by("created_at")
        else:
            qs = qs.order_by("-created_at")
        limit = min(int(request.query_params.get("limit", 100)), 500)
        return Response(WebhookDeliverySerializer(qs[:limit], many=True).data)

    @action(detail=True, methods=["get"], url_path="deliveries/export")
    def export_deliveries(self, request, pk=None):
        import csv
        import io

        webhook = self.get_object()
        qs = webhook.deliveries.all().order_by("-created_at")[:1000]
        format_type = request.query_params.get("format", "csv")

        if format_type == "json":
            data = WebhookDeliverySerializer(qs, many=True).data
            response = HttpResponse(
                json.dumps(data, indent=2, default=str),
                content_type="application/json",
            )
            response["Content-Disposition"] = f'attachment; filename="webhook-{webhook.slug}.json"'
            return response

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["time", "method", "client_ip", "content_type", "body_preview"])
        for d in qs:
            body_preview = json.dumps(d.body)[:500] if d.body else d.raw_body[:500]
            writer.writerow(
                [
                    d.created_at.isoformat(),
                    d.method,
                    d.client_ip or "",
                    d.content_type,
                    body_preview,
                ]
            )
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="webhook-{webhook.slug}.csv"'
        return response


class OutgoingWebhookViewSet(viewsets.ModelViewSet):
    serializer_class = OutgoingWebhookSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        qs = OutgoingWebhook.objects.select_related("api").filter(
            workspace_id__in=user_workspace_ids(self.request.user)
        )
        workspace = self.request.query_params.get("workspace")
        if workspace:
            qs = qs.filter(workspace__slug=workspace)
        return qs

    def perform_create(self, serializer):
        workspace = serializer.validated_data.get("workspace")
        if workspace:
            require_workspace_access(self.request.user, workspace_id=workspace.id, edit=True)
        serializer.save()

    def perform_update(self, serializer):
        require_workspace_access(
            self.request.user, workspace_id=self.get_object().workspace_id, edit=True
        )
        serializer.save()

    def perform_destroy(self, instance):
        require_workspace_access(
            self.request.user, workspace_id=instance.workspace_id, edit=True
        )
        instance.delete()


@method_decorator(csrf_exempt, name="dispatch")
class WebhookReceiverView(View):
    """Accept webhook payloads on any method (public inbox URL)."""

    def dispatch(self, request, workspace_slug, hook_slug):
        try:
            webhook = IncomingWebhook.objects.select_related("workspace").get(
                workspace__slug=workspace_slug,
                slug=hook_slug,
                is_active=True,
            )
        except IncomingWebhook.DoesNotExist:
            return JsonResponse({"error": "Webhook not found"}, status=404)

        from django.conf import settings

        max_bytes = int(getattr(settings, "MAX_REQUEST_BODY_BYTES", 1_048_576))
        content_length = request.META.get("CONTENT_LENGTH")
        if content_length and int(content_length) > max_bytes:
            return JsonResponse({"error": "Payload too large"}, status=413)

        raw = request.body.decode("utf-8", errors="replace")
        if len(raw.encode("utf-8")) > max_bytes:
            return JsonResponse({"error": "Payload too large"}, status=413)

        body = {}
        content_type = request.content_type or ""
        if raw:
            try:
                body = json.loads(raw)
            except (json.JSONDecodeError, ValueError):
                body = {"_raw": raw}

        # When a secret is configured, require a matching header
        if webhook.secret:
            provided = request.headers.get("X-Webhook-Secret", "")
            if not provided or not secrets.compare_digest(provided, webhook.secret):
                return JsonResponse({"error": "Invalid webhook secret"}, status=401)

        delivery = WebhookDelivery.objects.create(
            webhook=webhook,
            method=request.method,
            headers={k: v for k, v in request.headers.items()},
            query_params=dict(request.GET),
            body=body if isinstance(body, (dict, list)) else {"value": body},
            raw_body=raw[:1_000_000],  # cap at 1MB stored
            content_type=content_type,
            client_ip=request.META.get("REMOTE_ADDR"),
        )

        webhook.hit_count += 1
        webhook.last_hit_at = timezone.now()
        webhook.save(update_fields=["hit_count", "last_hit_at"])

        return JsonResponse(
            {
                "received": True,
                "delivery_id": str(delivery.id),
                "webhook": webhook.name,
            },
            status=200,
        )
