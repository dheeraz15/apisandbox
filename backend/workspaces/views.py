from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Avg
from django.db.models.functions import TruncHour, TruncDate
from logs.models import RequestLog, WebhookDelivery
from .models import Workspace, WorkspaceVariable, WorkspaceMember, WorkspaceInvite, WorkspaceDomain
from .serializers import (
    WorkspaceSerializer,
    WorkspaceListSerializer,
    WorkspaceVariableSerializer,
    WorkspaceMemberSerializer,
    WorkspaceInviteSerializer,
    WorkspaceDomainSerializer,
)


class WorkspaceViewSet(viewsets.ModelViewSet):
    lookup_field = "slug"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Workspace.objects.all()
        return Workspace.objects.filter(members__user=user).distinct()

    def get_serializer_class(self):
        if self.action == "list":
            return WorkspaceListSerializer
        return WorkspaceSerializer

    def perform_create(self, serializer):
        workspace = serializer.save(created_by=self.request.user)
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=self.request.user,
            role="owner",
        )

    def _get_membership(self, workspace):
        if not self.request.user.is_authenticated:
            return None
        return workspace.members.filter(user=self.request.user).first()

    @action(detail=True, methods=["get"])
    def stats(self, request, slug=None):
        workspace = self.get_object()
        today = timezone.now().date()
        apis = workspace.apis.all()
        deployed = apis.filter(is_deployed=True).count()
        last_deployment = (
            apis.filter(deployed_at__isnull=False)
            .order_by("-deployed_at")
            .values_list("deployed_at", flat=True)
            .first()
        )
        return Response(
            {
                "api_count": apis.count(),
                "requests_today": RequestLog.objects.filter(
                    workspace=workspace, created_at__date=today
                ).count(),
                "total_requests": RequestLog.objects.filter(
                    workspace=workspace
                ).count(),
                "active_endpoints": deployed,
                "last_deployment": last_deployment,
                "member_count": workspace.members.count(),
                "collection_count": workspace.collections.count(),
            }
        )

    @action(detail=True, methods=["get"])
    def analytics(self, request, slug=None):
        workspace = self.get_object()
        from_param = request.query_params.get("from")
        to_param = request.query_params.get("to")
        days = int(request.query_params.get("days", 7))

        if from_param:
            try:
                since = timezone.datetime.fromisoformat(from_param.replace("Z", "+00:00"))
                if timezone.is_naive(since):
                    since = timezone.make_aware(since)
            except ValueError:
                since = timezone.now() - timedelta(days=days)
        else:
            since = timezone.now() - timedelta(days=days)

        until = None
        if to_param:
            try:
                until = timezone.datetime.fromisoformat(to_param.replace("Z", "+00:00"))
                if timezone.is_naive(until):
                    until = timezone.make_aware(until)
            except ValueError:
                until = None

        logs = RequestLog.objects.filter(workspace=workspace, created_at__gte=since)
        if until:
            logs = logs.filter(created_at__lte=until)

        by_status = list(
            logs.values("status_code")
            .annotate(count=Count("id"))
            .order_by("-count")[:20]
        )
        by_method = list(
            logs.values("method").annotate(count=Count("id")).order_by("-count")
        )
        by_api = list(
            logs.filter(api__isnull=False)
            .values("api_id", "api__name", "api__endpoint", "api__method")
            .annotate(count=Count("id"), avg_latency=Avg("latency_ms"))
            .order_by("-count")[:15]
        )
        by_collection = list(
            logs.filter(collection__isnull=False)
            .values("collection_id", "collection__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        by_finding = list(
            logs.exclude(finding="")
            .values("finding")
            .annotate(count=Count("id"))
            .order_by("-count")[:15]
        )
        by_day = list(
            logs.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        by_hour = list(
            logs.filter(created_at__gte=timezone.now() - timedelta(hours=24))
            .annotate(hour=TruncHour("created_at"))
            .values("hour")
            .annotate(count=Count("id"))
            .order_by("hour")
        )
        error_rate = 0
        total = logs.count()
        if total:
            errors = logs.filter(status_code__gte=400).count()
            error_rate = round(errors / total * 100, 1)
        avg_latency = logs.aggregate(avg=Avg("latency_ms"))["avg"] or 0

        webhook_deliveries = WebhookDelivery.objects.filter(
            webhook__workspace=workspace, created_at__gte=since
        )
        webhook_total = webhook_deliveries.count()
        by_webhook = list(
            webhook_deliveries.values("webhook_id", "webhook__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        return Response(
            {
                "from": since.isoformat(),
                "to": (until or timezone.now()).isoformat(),
                "total_requests": total,
                "error_rate": error_rate,
                "avg_latency_ms": round(avg_latency, 1),
                "by_status": by_status,
                "by_method": by_method,
                "by_api": by_api,
                "by_collection": by_collection,
                "by_finding": by_finding,
                "by_day": by_day,
                "by_hour": by_hour,
                "webhook_deliveries": webhook_total,
                "by_webhook": by_webhook,
            }
        )

    @action(detail=True, methods=["get", "post", "delete"])
    def variables(self, request, slug=None):
        workspace = self.get_object()
        if request.method == "GET":
            vars_qs = workspace.variables.all()
            return Response(WorkspaceVariableSerializer(vars_qs, many=True).data)
        if request.method == "DELETE":
            var_id = request.query_params.get("id") or request.data.get("id")
            WorkspaceVariable.objects.filter(workspace=workspace, id=var_id).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        # Upsert by key
        key = request.data.get("key")
        existing = workspace.variables.filter(key=key).first() if key else None
        if existing:
            serializer = WorkspaceVariableSerializer(
                existing, data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = WorkspaceVariableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(workspace=workspace)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def activity(self, request, slug=None):
        workspace = self.get_object()
        logs = RequestLog.objects.filter(workspace=workspace).order_by(
            "-created_at"
        )[:20]
        from logs.serializers import RequestLogSerializer

        return Response(RequestLogSerializer(logs, many=True).data)

    @action(detail=True, methods=["get", "post"])
    def members(self, request, slug=None):
        workspace = self.get_object()
        if request.method == "GET":
            return Response(
                WorkspaceMemberSerializer(workspace.members.all(), many=True).data
            )

        membership = self._get_membership(workspace)
        if not membership or not membership.can_manage_members:
            return Response(
                {"error": "Only owners and managers can invite members"},
                status=status.HTTP_403_FORBIDDEN,
            )

        email = request.data.get("email", "").lower().strip()
        role = request.data.get("role", "editor")
        if role == "owner":
            return Response({"error": "Cannot assign owner via invite"}, status=400)
        if not email:
            return Response({"error": "Email is required"}, status=400)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            invite, _ = WorkspaceInvite.objects.update_or_create(
                workspace=workspace,
                email=email,
                defaults={
                    "role": role,
                    "invited_by": request.user,
                    "accepted": False,
                },
            )
            return Response(
                {
                    "status": "invited",
                    "invite": WorkspaceInviteSerializer(invite).data,
                    "message": f"Invite created for {email}. They can join after signing up.",
                },
                status=status.HTTP_201_CREATED,
            )

        member, created = WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=user,
            defaults={"role": role, "invited_by": request.user},
        )
        if not created:
            member.role = role
            member.save(update_fields=["role"])

        return Response(
            WorkspaceMemberSerializer(member).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get", "post", "delete"])
    def domains(self, request, slug=None):
        workspace = self.get_object()
        membership = self._get_membership(workspace)
        if request.method == "GET":
            return Response(
                WorkspaceDomainSerializer(workspace.domains.all(), many=True).data
            )
        if not membership or not membership.can_edit:
            return Response({"error": "Forbidden"}, status=403)
        if request.method == "DELETE":
            domain_id = request.query_params.get("id") or request.data.get("id")
            domain = workspace.domains.filter(id=domain_id).first()
            if domain:
                # Unbind APIs first so they fall back to platform
                domain.apis.update(custom_domain=None)
                domain.delete()
            return Response(status=204)
        domain = request.data.get("domain", "").strip().lower().rstrip(".")
        domain = domain.removeprefix("https://").removeprefix("http://").split("/")[0]
        if not domain or "." not in domain:
            return Response({"error": "Valid domain required"}, status=400)
        if WorkspaceDomain.objects.filter(domain=domain).exclude(workspace=workspace).exists():
            return Response(
                {"error": "Domain is already claimed by another workspace"},
                status=400,
            )
        from .domain_verify import generate_verification_token, cname_target

        obj, created = workspace.domains.get_or_create(
            domain=domain,
            defaults={
                "verified": False,
                "verification_token": generate_verification_token(),
            },
        )
        data = WorkspaceDomainSerializer(obj).data
        data["setup"] = {
            "cname_host": domain,
            "cname_target": cname_target(),
            "txt_name": obj.txt_name,
            "txt_value": obj.txt_value,
            "instructions": [
                f"In Cloudflare (or your DNS provider), create a CNAME record:",
                f"  Name/Host: {domain}  →  Target: {cname_target()}",
                "Prefer Cloudflare proxy ON (orange cloud) so HTTPS works automatically.",
                f"Optional ownership TXT: {obj.txt_name} = {obj.txt_value}",
                "Click Verify once DNS has propagated (usually 1–5 minutes).",
            ],
        }
        return Response(
            data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="domains/verify")
    def verify_domain(self, request, slug=None):
        workspace = self.get_object()
        membership = self._get_membership(workspace)
        if not membership or not membership.can_edit:
            return Response({"error": "Forbidden"}, status=403)
        domain_id = request.data.get("id")
        try:
            obj = workspace.domains.get(id=domain_id)
        except WorkspaceDomain.DoesNotExist:
            return Response({"error": "Domain not found"}, status=404)

        from .domain_verify import verify_domain_dns

        ok, message = verify_domain_dns(obj.domain, obj.verification_token)
        if not ok:
            return Response(
                {
                    "error": "DNS verification failed",
                    "detail": message,
                    "domain": WorkspaceDomainSerializer(obj).data,
                },
                status=400,
            )

        obj.verified = True
        obj.verification_method = message[:50]
        obj.last_verified_at = timezone.now()
        # First verified domain becomes default if none set
        if not workspace.domains.filter(verified=True, is_default=True).exists():
            obj.is_default = True
        obj.save()
        return Response(
            {
                **WorkspaceDomainSerializer(obj).data,
                "message": message,
            }
        )

    @action(detail=True, methods=["post"], url_path="domains/set-default")
    def set_default_domain(self, request, slug=None):
        """Set workspace default domain for new endpoints. Pass id=null for platform default."""
        workspace = self.get_object()
        membership = self._get_membership(workspace)
        if not membership or not membership.can_edit:
            return Response({"error": "Forbidden"}, status=403)

        domain_id = request.data.get("id", None)
        # Explicit platform default
        if domain_id in (None, "", "platform", "default"):
            workspace.domains.filter(is_default=True).update(is_default=False)
            return Response(
                {
                    "default_domain": None,
                    "message": "Platform domain is now the default for new endpoints",
                }
            )

        try:
            obj = workspace.domains.get(id=domain_id)
        except WorkspaceDomain.DoesNotExist:
            return Response({"error": "Domain not found"}, status=404)
        if not obj.verified:
            return Response(
                {"error": "Only verified domains can be set as default"},
                status=400,
            )
        workspace.domains.filter(is_default=True).update(is_default=False)
        obj.is_default = True
        obj.save(update_fields=["is_default"])
        return Response(
            {
                "default_domain": WorkspaceDomainSerializer(obj).data,
                "message": f"{obj.domain} is now the default for new endpoints",
            }
        )

    @action(detail=True, methods=["patch", "delete"], url_path="members/(?P<member_id>[^/.]+)")
    def member_detail(self, request, slug=None, member_id=None):
        workspace = self.get_object()
        membership = self._get_membership(workspace)
        if not membership or not membership.can_manage_members:
            return Response({"error": "Forbidden"}, status=403)

        try:
            member = workspace.members.get(id=member_id)
        except WorkspaceMember.DoesNotExist:
            return Response({"error": "Member not found"}, status=404)

        if member.role == "owner":
            return Response({"error": "Cannot modify owner"}, status=400)

        if request.method == "DELETE":
            member.delete()
            return Response(status=204)

        role = request.data.get("role")
        if role and role != "owner":
            member.role = role
            member.save(update_fields=["role"])
        return Response(WorkspaceMemberSerializer(member).data)
