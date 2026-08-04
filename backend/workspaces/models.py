import uuid
from django.conf import settings
from django.db import models
from django.contrib.auth.models import User


class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_workspaces",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class WorkspaceMember(models.Model):
    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("manager", "Manager"),
        ("editor", "Editor"),
        ("viewer", "Viewer"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspace_memberships",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="viewer")
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invites_sent",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["workspace", "user"]
        ordering = ["role", "user__email"]

    def __str__(self):
        return f"{self.user.email} ({self.role}) @ {self.workspace.slug}"

    @property
    def can_manage_members(self):
        return self.role in ("owner", "manager")

    @property
    def can_edit(self):
        return self.role in ("owner", "manager", "editor")


class WorkspaceVariable(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="variables"
    )
    key = models.CharField(max_length=255)
    value = models.TextField()
    is_secret = models.BooleanField(default=False)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["workspace", "key"]
        ordering = ["key"]

    def __str__(self):
        return f"{self.workspace.slug}.{self.key}"


class WorkspaceDomain(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="domains"
    )
    domain = models.CharField(max_length=255, unique=True)
    verified = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=64, blank=True)
    verification_method = models.CharField(max_length=50, blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "domain"]

    def __str__(self):
        return self.domain

    def save(self, *args, **kwargs):
        if not self.verification_token:
            from .domain_verify import generate_verification_token

            self.verification_token = generate_verification_token()
        super().save(*args, **kwargs)
        if self.is_default:
            WorkspaceDomain.objects.filter(workspace=self.workspace).exclude(
                pk=self.pk
            ).filter(is_default=True).update(is_default=False)

    @property
    def cname_target(self):
        from .domain_verify import cname_target

        return cname_target()

    @property
    def txt_name(self):
        return f"_mockapi-verify.{self.domain}"

    @property
    def txt_value(self):
        return self.verification_token


class WorkspaceInvite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="invites"
    )
    email = models.EmailField()
    role = models.CharField(
        max_length=20,
        choices=WorkspaceMember.ROLE_CHOICES,
        default="editor",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["workspace", "email"]
