import uuid
from django.db import models
from workspaces.models import Workspace


class Collection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="collections"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#6366f1")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Dataset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="datasets"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class MockAPI(models.Model):
    HTTP_METHODS = [
        ("GET", "GET"),
        ("POST", "POST"),
        ("PUT", "PUT"),
        ("PATCH", "PATCH"),
        ("DELETE", "DELETE"),
        ("HEAD", "HEAD"),
    ]

    AUTH_TYPES = [
        ("none", "None"),
        ("api_key", "API Key"),
        ("bearer", "Bearer"),
        ("basic", "Basic"),
        ("oauth2", "OAuth2"),
        ("custom", "Custom Header"),
    ]

    STATE_MODES = [
        ("stateless", "Stateless"),
        ("stateful", "Stateful"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="apis"
    )
    collection = models.ForeignKey(
        Collection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="apis",
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    version = models.CharField(max_length=20, default="v1")
    tags = models.JSONField(default=list, blank=True)

    method = models.CharField(max_length=10, choices=HTTP_METHODS, default="GET")
    endpoint = models.CharField(max_length=500)

    auth_type = models.CharField(max_length=20, choices=AUTH_TYPES, default="none")
    auth_config = models.JSONField(default=dict, blank=True)

    headers = models.JSONField(default=list, blank=True)
    query_params = models.JSONField(default=list, blank=True)
    path_params = models.JSONField(default=list, blank=True)

    body_type = models.CharField(max_length=50, default="json")
    body_schema = models.JSONField(default=dict, blank=True)
    body_example = models.JSONField(default=dict, blank=True)

    responses = models.JSONField(default=list, blank=True)

    behavior = models.JSONField(default=dict, blank=True)
    rules = models.JSONField(default=list, blank=True)

    state_mode = models.CharField(
        max_length=20, choices=STATE_MODES, default="stateless"
    )
    state_data = models.JSONField(default=dict, blank=True)

    active_scenario = models.CharField(max_length=100, default="default")
    scenarios = models.JSONField(default=list, blank=True)

    rate_limit = models.IntegerField(null=True, blank=True)
    cors_enabled = models.BooleanField(default=True)
    cors_config = models.JSONField(default=dict, blank=True)
    custom_response_headers = models.JSONField(default=list, blank=True)
    webhooks = models.JSONField(default=list, blank=True)

    is_deployed = models.BooleanField(default=False)
    deployed_at = models.DateTimeField(null=True, blank=True)

    request_count_today = models.IntegerField(default=0)
    total_requests = models.IntegerField(default=0)
    last_hit_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ["workspace", "method", "endpoint", "version"]
        verbose_name = "Mock API"
        verbose_name_plural = "Mock APIs"

    def __str__(self):
        return f"{self.method} {self.endpoint}"

    @property
    def deployed_url(self):
        from django.conf import settings

        base = settings.SANDBOX_BASE_URL.rstrip("/")
        return f"{base}/api/{self.workspace.slug}{self.endpoint}"


class APIVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    api = models.ForeignKey(MockAPI, on_delete=models.CASCADE, related_name="versions")
    version = models.CharField(max_length=20)
    snapshot = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.api.name} {self.version}"
