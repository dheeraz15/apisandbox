import uuid
from django.db import models
from workspaces.models import Workspace
from apis.models import MockAPI, Collection


class RequestLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="request_logs"
    )
    api = models.ForeignKey(
        MockAPI,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="request_logs",
    )
    collection = models.ForeignKey(
        Collection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="request_logs",
    )

    method = models.CharField(max_length=10)
    path = models.CharField(max_length=500)
    request_headers = models.JSONField(default=dict, blank=True)
    request_body = models.JSONField(default=dict, blank=True)
    status_code = models.IntegerField()
    response_body = models.JSONField(default=dict, blank=True)
    response_headers = models.JSONField(default=dict, blank=True)
    latency_ms = models.IntegerField(default=0)
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    scenario_used = models.CharField(max_length=100, blank=True)
    rule_matched = models.CharField(max_length=255, blank=True)
    finding = models.CharField(
        max_length=255,
        blank=True,
        help_text="Matched rule, scenario, or condition that determined the response",
    )
    user_agent = models.TextField(blank=True)
    query_params = models.JSONField(default=dict, blank=True)

    # Observability / versioning (OpenTelemetry-style)
    api_version = models.CharField(max_length=20, blank=True, default="")
    request_id = models.CharField(max_length=64, blank=True, default="")
    trace_id = models.CharField(max_length=64, blank=True, default="")
    span_id = models.CharField(max_length=32, blank=True, default="")
    domain_host = models.CharField(max_length=255, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "-created_at"]),
            models.Index(fields=["api", "-created_at"]),
            models.Index(fields=["collection", "-created_at"]),
            models.Index(fields=["status_code"]),
        ]

    def __str__(self):
        return f"{self.method} {self.path} -> {self.status_code}"


class IncomingWebhook(models.Model):
    """Receives arbitrary webhook payloads from external systems."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="incoming_webhooks"
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100)
    description = models.TextField(blank=True)
    secret = models.CharField(max_length=64, blank=True)
    is_active = models.BooleanField(default=True)
    hit_count = models.IntegerField(default=0)
    last_hit_at = models.DateTimeField(null=True, blank=True)
    custom_domain = models.ForeignKey(
        "workspaces.WorkspaceDomain",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incoming_webhooks",
        help_text="Optional verified domain for receive URL.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["workspace", "slug"]
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def receive_url(self):
        from django.conf import settings

        if (
            self.custom_domain_id
            and self.custom_domain
            and self.custom_domain.verified
        ):
            return f"https://{self.custom_domain.domain}/hooks/{self.slug}"
        base = settings.SANDBOX_BASE_URL.rstrip("/")
        return f"{base}/api/hooks/{self.workspace.slug}/{self.slug}"


class WebhookDelivery(models.Model):
    """Log of an incoming webhook hit (unlimited payload)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    webhook = models.ForeignKey(
        IncomingWebhook, on_delete=models.CASCADE, related_name="deliveries"
    )
    method = models.CharField(max_length=10)
    headers = models.JSONField(default=dict, blank=True)
    query_params = models.JSONField(default=dict, blank=True)
    body = models.JSONField(default=dict, blank=True)
    raw_body = models.TextField(blank=True)
    content_type = models.CharField(max_length=255, blank=True)
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Webhook deliveries"


class OutgoingWebhook(models.Model):
    """Outgoing webhook fired after an API responds."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="outgoing_webhooks"
    )
    api = models.ForeignKey(
        MockAPI,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="outgoing_webhooks",
    )
    name = models.CharField(max_length=255)
    url = models.URLField()
    method = models.CharField(max_length=10, default="POST")
    headers = models.JSONField(default=dict, blank=True)
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
