from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from django.db.models import Q
from django.utils import timezone
import json
from .models import MockAPI, Collection, Dataset, APIVersion
from .serializers import (
    MockAPISerializer,
    MockAPIListSerializer,
    CollectionSerializer,
    DatasetSerializer,
    MockAPIVersionSerializer,
)
from .ai_generator import generate_api_from_prompt
from .import_parser import import_from_format, persist_import
from workspaces.permissions import user_workspace_ids, require_workspace_access, IsWorkspaceMember


class ImportRateThrottle(UserRateThrottle):
    scope = "import"


class MockAPIViewSet(viewsets.ModelViewSet):
    serializer_class = MockAPISerializer
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        qs = MockAPI.objects.filter(workspace_id__in=user_workspace_ids(self.request.user))
        workspace_slug = self.request.query_params.get("workspace")
        if workspace_slug:
            qs = qs.filter(workspace__slug=workspace_slug)
        collection = self.request.query_params.get("collection")
        if collection:
            qs = qs.filter(collection_id=collection)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(
                endpoint__icontains=search
            )
        deployed = self.request.query_params.get("deployed")
        if deployed == "true":
            qs = qs.filter(is_deployed=True)
        elif deployed == "false":
            qs = qs.filter(is_deployed=False)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return MockAPIListSerializer
        return MockAPISerializer

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

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        from logs.models import RequestLog
        from logs.serializers import RequestLogSerializer

        api = self.get_object()
        logs = RequestLog.objects.filter(api=api).order_by("-created_at")[:100]
        return Response(RequestLogSerializer(logs, many=True).data)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        from logs.models import RequestLog
        from django.db.models import Avg, Count
        from datetime import timedelta

        api = self.get_object()
        since = timezone.now() - timedelta(days=7)
        logs = RequestLog.objects.filter(api=api, created_at__gte=since)
        total = logs.count()
        errors = logs.filter(status_code__gte=400).count()
        avg_latency = logs.aggregate(avg=Avg("latency_ms"))["avg"] or 0
        by_status = list(
            logs.values("status_code").annotate(count=Count("id")).order_by("-count")[:10]
        )
        return Response(
            {
                "total_requests": total,
                "error_rate": round(errors / total * 100, 1) if total else 0,
                "avg_latency_ms": round(avg_latency, 1),
                "by_status": by_status,
            }
        )

    @action(detail=True, methods=["post"])
    def deploy(self, request, pk=None):
        api = self.get_object()
        require_workspace_access(request.user, workspace_id=api.workspace_id, edit=True)
        api.is_deployed = True
        api.deployed_at = timezone.now()
        api.save(update_fields=["is_deployed", "deployed_at"])
        APIVersion.objects.create(
            api=api,
            version=api.version_label,
            snapshot=MockAPISerializer(api).data,
        )
        return Response(MockAPISerializer(api).data)

    @action(detail=True, methods=["post"])
    def undeploy(self, request, pk=None):
        api = self.get_object()
        require_workspace_access(request.user, workspace_id=api.workspace_id, edit=True)
        api.is_deployed = False
        api.save(update_fields=["is_deployed"])
        return Response(MockAPISerializer(api).data)

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        from .export_spec import export_apis_openapi, export_apis_postman

        api = self.get_object()
        fmt = (request.query_params.get("format") or "openapi").lower()
        if fmt in ("postman", "postman_collection"):
            return Response(export_apis_postman([api], name=api.name))
        if fmt in ("openapi", "swagger", "oas"):
            return Response(export_apis_openapi([api], title=api.name))
        return Response(
            {"error": "format must be openapi or postman"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def clone(self, request, pk=None):
        original = self.get_object()
        require_workspace_access(request.user, workspace_id=original.workspace_id, edit=True)
        clone = MockAPI.objects.get(pk=original.pk)
        clone.pk = None
        clone.id = None
        clone.name = f"{original.name} (Copy)"
        clone.is_deployed = False
        clone.deployed_at = None
        clone.request_count_today = 0
        clone.total_requests = 0
        clone.last_hit_at = None
        clone.save()
        return Response(
            MockAPISerializer(clone).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def test(self, request, pk=None):
        from runtime.engine import MockAPIEngine

        api = self.get_object()
        engine = MockAPIEngine(api)
        result = engine.process_request(
            method=request.data.get("method", api.method),
            path=api.endpoint,
            headers=request.data.get("headers", {}),
            query_params=request.data.get("query_params", {}),
            body=request.data.get("body"),
            path_params=request.data.get("path_params", {}),
            client_ip="127.0.0.1",
            dry_run=True,
        )
        return Response(result)

    @action(detail=False, methods=["post"])
    def preview_template(self, request):
        """Render a response body without saving anything.

        The `test` action needs a saved endpoint, so there was no way to see
        what a template produces while you are still writing it. This takes a
        draft body and returns the rendered result, which is what lets the
        builder show real generated data as you type.
        """
        from runtime.template_engine import resolve_json

        body = request.data.get("body")
        if body is None:
            return Response(
                {"error": "body is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        sample = request.data.get("request") or {}
        context = {
            "_seed": (request.data.get("behavior") or {}).get("seed"),
            "request": {
                "method": sample.get("method", "GET"),
                "path": sample.get("path", "/"),
                "headers": sample.get("headers", {}),
                "query": sample.get("query", {}),
                "body": sample.get("body", {}),
                "path_params": sample.get("path_params", {}),
            },
            "workspace": {"id": "", "slug": "preview", "name": "Preview"},
            "env": request.data.get("env", {}),
            "scenario": {},
        }

        try:
            rendered = resolve_json(body, context)
        except Exception as exc:
            return Response(
                {"error": "RENDER_FAILED", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"rendered": rendered})

    @action(detail=False, methods=["post"])
    def generate(self, request):
        prompt = request.data.get("prompt", "")
        if not prompt:
            return Response(
                {"error": "Prompt is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        workspace_id = request.data.get("workspace")
        if workspace_id:
            require_workspace_access(request.user, workspace_id=workspace_id, edit=True)
        generated = generate_api_from_prompt(prompt)
        if workspace_id:
            generated["workspace"] = workspace_id
        return Response(generated)

    @action(detail=False, methods=["get"])
    def templates(self, request):
        from .ai_generator import list_templates

        return Response(list_templates())

    @action(detail=False, methods=["post"])
    def from_template(self, request):
        from .ai_generator import get_template

        key = request.data.get("template") or request.data.get("key")
        if not key:
            return Response({"error": "template key required"}, status=400)
        tpl = get_template(key)
        if not tpl:
            return Response({"error": "Unknown template"}, status=404)
        workspace_id = request.data.get("workspace")
        result = dict(tpl)
        result["tags"] = list(result.get("tags", [])) + ["template"]
        result["auth_type"] = result.get("auth_type", "none")
        result["state_mode"] = result.get("state_mode", "stateless")
        result["active_scenario"] = result.get("active_scenario", "default")
        result["behavior"] = result.get("behavior", {"delay_ms": 150})
        result["cors_enabled"] = True
        if workspace_id:
            require_workspace_access(request.user, workspace_id=workspace_id, edit=True)
            result["workspace"] = workspace_id
        return Response(result)

    @action(detail=False, methods=["post"], throttle_classes=[ImportRateThrottle])
    def import_spec(self, request):
        format_type = request.data.get("format", "").lower()
        content = request.data.get("content")
        workspace_id = request.data.get("workspace")
        deploy = request.data.get("deploy", True)
        preview_only = request.data.get("preview", False)

        if not format_type:
            return Response({"error": "format is required (postman, openapi, curl, json)"}, status=400)
        if content is None:
            return Response({"error": "content is required"}, status=400)

        try:
            parsed = import_from_format(format_type, content)
        except (ValueError, json.JSONDecodeError) as e:
            return Response({"error": str(e)}, status=400)

        if preview_only:
            return Response(parsed)

        if not workspace_id:
            return Response({"error": "workspace id is required"}, status=400)

        require_workspace_access(request.user, workspace_id=workspace_id, edit=True)

        try:
            result = persist_import(workspace_id, parsed, deploy=bool(deploy))
        except Exception as e:
            return Response({"error": str(e)}, status=400)

        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"])
    def versions(self, request, pk=None):
        api = self.get_object()
        if request.method == "GET":
            versions = api.versions.all()
            return Response(MockAPIVersionSerializer(versions, many=True).data)
        require_workspace_access(request.user, workspace_id=api.workspace_id, edit=True)
        snapshot = MockAPISerializer(api).data
        version = APIVersion.objects.create(
            api=api,
            version=request.data.get("version", api.version),
            snapshot=snapshot,
        )
        return Response(
            MockAPIVersionSerializer(version).data,
            status=status.HTTP_201_CREATED,
        )


class CollectionViewSet(viewsets.ModelViewSet):
    serializer_class = CollectionSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        qs = Collection.objects.filter(workspace_id__in=user_workspace_ids(self.request.user))
        workspace_slug = self.request.query_params.get("workspace")
        if workspace_slug:
            qs = qs.filter(workspace__slug=workspace_slug)
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

    @action(detail=True, methods=["get"])
    def apis(self, request, pk=None):
        collection = self.get_object()
        apis = collection.apis.all()
        return Response(MockAPIListSerializer(apis, many=True).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        collection = self.get_object()
        require_workspace_access(request.user, workspace_id=collection.workspace_id, edit=True)
        api_ids = request.data.get("api_ids", [])
        if not isinstance(api_ids, list):
            return Response({"error": "api_ids must be a list"}, status=400)
        updated = MockAPI.objects.filter(
            id__in=api_ids, workspace=collection.workspace
        ).update(collection=collection)
        return Response({"assigned": updated})

    @action(detail=True, methods=["post"])
    def unassign(self, request, pk=None):
        collection = self.get_object()
        require_workspace_access(request.user, workspace_id=collection.workspace_id, edit=True)
        api_ids = request.data.get("api_ids", [])
        if not isinstance(api_ids, list):
            return Response({"error": "api_ids must be a list"}, status=400)
        updated = MockAPI.objects.filter(
            id__in=api_ids, workspace=collection.workspace, collection=collection
        ).update(collection=None)
        return Response({"unassigned": updated})

    @action(detail=True, methods=["post"])
    def deploy_all(self, request, pk=None):
        collection = self.get_object()
        require_workspace_access(request.user, workspace_id=collection.workspace_id, edit=True)
        updated = collection.apis.filter(is_deployed=False).update(
            is_deployed=True, deployed_at=timezone.now()
        )
        return Response({"deployed": updated})

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        from .export_spec import export_collection_openapi, export_collection_postman

        collection = self.get_object()
        fmt = (request.query_params.get("format") or "openapi").lower()
        if fmt in ("postman", "postman_collection"):
            return Response(export_collection_postman(collection))
        if fmt in ("openapi", "swagger", "oas"):
            return Response(export_collection_openapi(collection))
        return Response(
            {"error": "format must be openapi or postman"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class DatasetViewSet(viewsets.ModelViewSet):
    serializer_class = DatasetSerializer
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_queryset(self):
        qs = Dataset.objects.filter(workspace_id__in=user_workspace_ids(self.request.user))
        workspace_slug = self.request.query_params.get("workspace")
        if workspace_slug:
            qs = qs.filter(workspace__slug=workspace_slug)
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
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

    @action(detail=False, methods=["get"])
    def catalog(self, request):
        from .dataset_catalog import catalog_categories, list_dataset_catalog

        q = request.query_params.get("q", "")
        category = request.query_params.get("category", "")
        return Response(
            {
                "categories": catalog_categories(),
                "results": list_dataset_catalog(q=q, category=category),
            }
        )

    @action(detail=False, methods=["post"], url_path="from-catalog")
    def from_catalog(self, request):
        from workspaces.models import Workspace
        from .dataset_catalog import get_catalog_dataset

        key = (request.data.get("key") or "").strip()
        workspace_id = request.data.get("workspace")
        if not key:
            return Response({"error": "key is required"}, status=400)
        if not workspace_id:
            return Response({"error": "workspace is required"}, status=400)

        require_workspace_access(request.user, workspace_id=workspace_id, edit=True)

        catalog = get_catalog_dataset(key)
        if not catalog:
            return Response({"error": "Unknown catalog dataset"}, status=404)

        workspace = Workspace.objects.filter(pk=workspace_id).first()
        if not workspace:
            return Response({"error": "Workspace not found"}, status=404)

        name = request.data.get("name") or catalog["name"]
        ds = Dataset.objects.create(
            workspace=workspace,
            name=name,
            description=catalog.get("description", ""),
            data=catalog.get("data") or {},
        )
        return Response(DatasetSerializer(ds).data, status=201)
