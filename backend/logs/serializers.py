from rest_framework import serializers
from .models import RequestLog, IncomingWebhook, WebhookDelivery, OutgoingWebhook


class RequestLogSerializer(serializers.ModelSerializer):
    api_name = serializers.CharField(source="api.name", read_only=True, default=None)
    api_endpoint = serializers.CharField(
        source="api.endpoint", read_only=True, default=None
    )
    collection_name = serializers.CharField(
        source="collection.name", read_only=True, default=None
    )
    collection_id = serializers.UUIDField(
        source="collection.id", read_only=True, default=None
    )

    class Meta:
        model = RequestLog
        fields = [
            "id",
            "api",
            "api_name",
            "api_endpoint",
            "collection",
            "collection_id",
            "collection_name",
            "method",
            "path",
            "request_headers",
            "request_body",
            "query_params",
            "status_code",
            "response_body",
            "response_headers",
            "latency_ms",
            "client_ip",
            "scenario_used",
            "rule_matched",
            "finding",
            "user_agent",
            "created_at",
        ]
        read_only_fields = fields


class IncomingWebhookSerializer(serializers.ModelSerializer):
    receive_url = serializers.ReadOnlyField()
    delivery_count = serializers.SerializerMethodField()

    class Meta:
        model = IncomingWebhook
        fields = [
            "id",
            "workspace",
            "name",
            "slug",
            "description",
            "secret",
            "is_active",
            "hit_count",
            "last_hit_at",
            "receive_url",
            "delivery_count",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "hit_count",
            "last_hit_at",
            "receive_url",
            "created_at",
        ]

    def get_delivery_count(self, obj):
        return obj.deliveries.count()


class WebhookDeliverySerializer(serializers.ModelSerializer):
    webhook_name = serializers.CharField(
        source="webhook.name", read_only=True, default=None
    )

    class Meta:
        model = WebhookDelivery
        fields = [
            "id",
            "webhook",
            "webhook_name",
            "method",
            "headers",
            "query_params",
            "body",
            "raw_body",
            "content_type",
            "client_ip",
            "created_at",
        ]
        read_only_fields = fields


class OutgoingWebhookSerializer(serializers.ModelSerializer):
    api_name = serializers.CharField(source="api.name", read_only=True, default=None)

    class Meta:
        model = OutgoingWebhook
        fields = [
            "id",
            "workspace",
            "api",
            "api_name",
            "name",
            "url",
            "method",
            "headers",
            "enabled",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
