import uuid
from django.db import models
from workspaces.models import Workspace, WorkspaceDomain


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

    ENDPOINT_TYPES = [
        ("list", "List"),
        ("detail", "Detail"),
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("action", "Action"),
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
    custom_domain = models.ForeignKey(
        WorkspaceDomain,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="apis",
        help_text="Serve this endpoint on a verified custom domain. Null = platform default.",
    )
    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="apis",
        help_text="Optional dataset used as response/data source for this endpoint.",
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    version = models.PositiveIntegerField(default=1, help_text="Auto-incremented revision; does not affect URL.")
    tags = models.JSONField(default=list, blank=True)

    method = models.CharField(max_length=10, choices=HTTP_METHODS, default="GET")
    endpoint = models.CharField(max_length=500)
    endpoint_type = models.CharField(
        max_length=20,
        choices=ENDPOINT_TYPES,
        default="action",
        blank=True,
        help_text="Semantic shape: list, detail, create, update, delete, or action.",
    )

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
        unique_together = ["workspace", "method", "endpoint"]
        verbose_name = "Mock API"
        verbose_name_plural = "Mock APIs"

    def __str__(self):
        return f"{self.method} {self.endpoint}"

    @property
    def version_label(self):
        return f"v{self.version}"

    def bump_version(self):
        self.version = int(self.version or 0) + 1
        return self.version

    @property
    def deployed_url(self):
        from django.conf import settings

        endpoint = self.endpoint if self.endpoint.startswith("/") else f"/{self.endpoint}"
        if (
            self.custom_domain_id
            and getattr(self, "custom_domain", None)
            and self.custom_domain.verified
        ):
            return f"https://{self.custom_domain.domain}{endpoint}"

        base = settings.SANDBOX_BASE_URL.rstrip("/")
        return f"{base}/api/{self.workspace.slug}{endpoint}"

    def resolve_domain(self):
        """Bound custom domain if set and verified."""
        if self.custom_domain_id and self.custom_domain and self.custom_domain.verified:
            return self.custom_domain
        return None


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
