from rest_framework import serializers
from .models import MockAPI, Collection, Dataset, APIVersion


class CollectionSerializer(serializers.ModelSerializer):
    api_count = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = [
            "id",
            "workspace",
            "name",
            "description",
            "color",
            "api_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_api_count(self, obj):
        return obj.apis.count()


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ["id", "workspace", "name", "description", "data", "created_at"]
        read_only_fields = ["id", "created_at"]


class MockAPIListSerializer(serializers.ModelSerializer):
    deployed_url = serializers.ReadOnlyField()
    collection_name = serializers.CharField(
        source="collection.name", read_only=True, default=None
    )
    custom_domain_name = serializers.CharField(
        source="custom_domain.domain", read_only=True, default=None
    )

    class Meta:
        model = MockAPI
        fields = [
            "id",
            "name",
            "method",
            "endpoint",
            "category",
            "version",
            "active_scenario",
            "is_deployed",
            "deployed_url",
            "custom_domain",
            "custom_domain_name",
            "request_count_today",
            "last_hit_at",
            "collection_name",
            "created_at",
            "updated_at",
        ]


class MockAPISerializer(serializers.ModelSerializer):
    deployed_url = serializers.ReadOnlyField()
    custom_domain_name = serializers.CharField(
        source="custom_domain.domain", read_only=True, default=None
    )

    class Meta:
        model = MockAPI
        fields = [
            "id",
            "workspace",
            "collection",
            "custom_domain",
            "custom_domain_name",
            "name",
            "description",
            "category",
            "version",
            "tags",
            "method",
            "endpoint",
            "auth_type",
            "auth_config",
            "headers",
            "query_params",
            "path_params",
            "body_type",
            "body_schema",
            "body_example",
            "responses",
            "behavior",
            "rules",
            "state_mode",
            "state_data",
            "active_scenario",
            "scenarios",
            "rate_limit",
            "cors_enabled",
            "cors_config",
            "custom_response_headers",
            "webhooks",
            "is_deployed",
            "deployed_at",
            "deployed_url",
            "request_count_today",
            "total_requests",
            "last_hit_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "deployed_at",
            "deployed_url",
            "custom_domain_name",
            "request_count_today",
            "total_requests",
            "last_hit_at",
            "created_at",
            "updated_at",
        ]

    def validate_custom_domain(self, value):
        if value is None:
            return value
        workspace = None
        if self.instance is not None:
            workspace = self.instance.workspace
        else:
            ws_id = self.initial_data.get("workspace")
            if ws_id:
                from workspaces.models import Workspace

                workspace = Workspace.objects.filter(pk=ws_id).first()
        if workspace and value.workspace_id != workspace.id:
            raise serializers.ValidationError("Domain does not belong to this workspace")
        if not value.verified:
            raise serializers.ValidationError("Domain must be verified first")
        return value


class MockAPIVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = APIVersion
        fields = ["id", "version", "snapshot", "created_at"]
        read_only_fields = ["id", "created_at"]
