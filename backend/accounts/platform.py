"""Platform operator APIs — staff/superuser only."""

from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate, TruncHour
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from logs.models import RequestLog
from workspaces.models import Workspace, WorkspaceMember
from .models import GoogleAccount


def _parse_dt(value, default=None):
    if not value:
        return default
    try:
        dt = timezone.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt)
        return dt
    except ValueError:
        return default


@api_view(["GET"])
@permission_classes([IsAdminUser])
def platform_overview(request):
    now = timezone.now()
    users = User.objects.all()
    logs = RequestLog.objects.all()
    return Response(
        {
            "users_total": users.count(),
            "users_staff": users.filter(is_staff=True).count(),
            "users_active_7d": users.filter(last_login__gte=now - timedelta(days=7)).count(),
            "workspaces_total": Workspace.objects.count(),
            "members_total": WorkspaceMember.objects.count(),
            "requests_total": logs.count(),
            "requests_24h": logs.filter(created_at__gte=now - timedelta(hours=24)).count(),
            "requests_7d": logs.filter(created_at__gte=now - timedelta(days=7)).count(),
            "avg_latency_24h": round(
                logs.filter(created_at__gte=now - timedelta(hours=24)).aggregate(
                    avg=Avg("latency_ms")
                )["avg"]
                or 0,
                1,
            ),
        }
    )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def platform_users(request):
    q = (request.query_params.get("q") or "").strip()
    qs = User.objects.all().order_by("-date_joined")
    if q:
        qs = qs.filter(
            Q(email__icontains=q)
            | Q(username__icontains=q)
            | Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
        )
    from_dt = _parse_dt(request.query_params.get("from"))
    to_dt = _parse_dt(request.query_params.get("to"))
    if from_dt:
        qs = qs.filter(date_joined__gte=from_dt)
    if to_dt:
        qs = qs.filter(date_joined__lte=to_dt)

    limit = min(int(request.query_params.get("limit", 100)), 500)
    offset = max(int(request.query_params.get("offset", 0)), 0)
    total = qs.count()
    rows = []
    for u in qs[offset : offset + limit]:
        google = GoogleAccount.objects.filter(user=u).exists()
        memberships = list(
            WorkspaceMember.objects.filter(user=u).select_related("workspace")[:20]
        )
        ws_ids = [m.workspace_id for m in memberships]
        req_count = (
            RequestLog.objects.filter(workspace_id__in=ws_ids).count() if ws_ids else 0
        )
        rows.append(
            {
                "id": u.id,
                "email": u.email,
                "name": u.first_name or u.username,
                "is_staff": u.is_staff,
                "is_superuser": u.is_superuser,
                "is_active": u.is_active,
                "date_joined": u.date_joined,
                "last_login": u.last_login,
                "google_linked": google,
                "workspace_count": WorkspaceMember.objects.filter(user=u).count(),
                "workspaces": [
                    {"slug": m.workspace.slug, "name": m.workspace.name, "role": m.role}
                    for m in memberships
                ],
                "request_count": req_count,
            }
        )
    return Response({"total": total, "offset": offset, "limit": limit, "results": rows})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def platform_logs(request):
    qs = RequestLog.objects.select_related(
        "workspace", "api", "collection"
    ).order_by("-created_at")

    q = (request.query_params.get("q") or "").strip()
    if q:
        qs = qs.filter(
            Q(path__icontains=q)
            | Q(api__name__icontains=q)
            | Q(request_id__icontains=q)
            | Q(trace_id__icontains=q)
            | Q(client_ip__icontains=q)
            | Q(domain_host__icontains=q)
            | Q(workspace__slug__icontains=q)
            | Q(workspace__name__icontains=q)
        )
    method = request.query_params.get("method")
    if method:
        qs = qs.filter(method=method.upper())
    status = request.query_params.get("status")
    if status:
        try:
            qs = qs.filter(status_code=int(status))
        except ValueError:
            pass
    workspace = request.query_params.get("workspace")
    if workspace:
        qs = qs.filter(workspace__slug=workspace)
    from_dt = _parse_dt(request.query_params.get("from"))
    to_dt = _parse_dt(request.query_params.get("to"))
    if from_dt:
        qs = qs.filter(created_at__gte=from_dt)
    if to_dt:
        qs = qs.filter(created_at__lte=to_dt)

    limit = min(int(request.query_params.get("limit", 100)), 500)
    offset = max(int(request.query_params.get("offset", 0)), 0)
    total = qs.count()
    results = []
    for log in qs[offset : offset + limit]:
        results.append(
            {
                "id": str(log.id),
                "created_at": log.created_at,
                "method": log.method,
                "path": log.path,
                "status_code": log.status_code,
                "latency_ms": log.latency_ms,
                "client_ip": log.client_ip,
                "request_id": getattr(log, "request_id", "") or "",
                "trace_id": getattr(log, "trace_id", "") or "",
                "api_version": getattr(log, "api_version", "") or "",
                "domain_host": getattr(log, "domain_host", "") or "",
                "workspace": log.workspace.slug if log.workspace_id else None,
                "workspace_name": log.workspace.name if log.workspace_id else None,
                "api_name": log.api.name if log.api_id else None,
                "finding": log.finding or "",
            }
        )
    return Response({"total": total, "offset": offset, "limit": limit, "results": results})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def platform_analytics(request):
    days = int(request.query_params.get("days", 7))
    since = _parse_dt(
        request.query_params.get("from"),
        timezone.now() - timedelta(days=days),
    )
    until = _parse_dt(request.query_params.get("to"))
    logs = RequestLog.objects.filter(created_at__gte=since)
    if until:
        logs = logs.filter(created_at__lte=until)

    total = logs.count()
    errors = logs.filter(status_code__gte=400).count() if total else 0
    return Response(
        {
            "from": since.isoformat() if since else None,
            "to": (until or timezone.now()).isoformat(),
            "total_requests": total,
            "error_rate": round(errors / total * 100, 1) if total else 0,
            "avg_latency_ms": round(logs.aggregate(avg=Avg("latency_ms"))["avg"] or 0, 1),
            "by_status": list(
                logs.values("status_code").annotate(count=Count("id")).order_by("-count")[:20]
            ),
            "by_method": list(
                logs.values("method").annotate(count=Count("id")).order_by("-count")
            ),
            "by_workspace": list(
                logs.filter(workspace__isnull=False)
                .values("workspace_id", "workspace__slug", "workspace__name")
                .annotate(count=Count("id"), avg_latency=Avg("latency_ms"))
                .order_by("-count")[:25]
            ),
            "by_day": list(
                logs.annotate(day=TruncDate("created_at"))
                .values("day")
                .annotate(count=Count("id"))
                .order_by("day")
            ),
            "by_hour": list(
                logs.filter(created_at__gte=timezone.now() - timedelta(hours=24))
                .annotate(hour=TruncHour("created_at"))
                .values("hour")
                .annotate(count=Count("id"))
                .order_by("hour")
            ),
            "top_paths": list(
                logs.values("path", "method")
                .annotate(count=Count("id"))
                .order_by("-count")[:20]
            ),
        }
    )
