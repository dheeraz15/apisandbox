"""Workspace membership helpers for management API tenancy."""

from __future__ import annotations

from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Workspace, WorkspaceMember


def user_workspace_ids(user):
    if not user or not user.is_authenticated:
        return Workspace.objects.none().values_list("id", flat=True)
    if user.is_staff or user.is_superuser:
        return Workspace.objects.all().values_list("id", flat=True)
    return Workspace.objects.filter(members__user=user).values_list("id", flat=True).distinct()


def get_membership(user, workspace) -> WorkspaceMember | None:
    if not user or not user.is_authenticated:
        return None
    if user.is_staff or user.is_superuser:
        # Synthetic owner-level access for platform staff
        return WorkspaceMember(workspace=workspace, user=user, role="owner")
    return workspace.members.filter(user=user).first()


def require_membership(user, workspace, *, edit: bool = False) -> WorkspaceMember:
    membership = get_membership(user, workspace)
    if not membership:
        raise NotFound("Workspace not found")
    if edit and not membership.can_edit:
        raise PermissionDenied("You do not have edit access to this workspace")
    return membership


def require_workspace_access(user, workspace_id=None, workspace_slug=None, *, edit: bool = False):
    qs = Workspace.objects.all()
    if workspace_id:
        workspace = qs.filter(pk=workspace_id).first()
    elif workspace_slug:
        workspace = qs.filter(slug=workspace_slug).first()
    else:
        raise PermissionDenied("workspace is required")
    if not workspace:
        raise NotFound("Workspace not found")
    require_membership(user, workspace, edit=edit)
    return workspace


class IsWorkspaceMember(BasePermission):
    """Object-level: user must be a member of obj.workspace or obj itself is Workspace."""

    def has_object_permission(self, request, view, obj):
        workspace = obj if isinstance(obj, Workspace) else getattr(obj, "workspace", None)
        if workspace is None:
            return False
        membership = get_membership(request.user, workspace)
        if not membership:
            return False
        if request.method in SAFE_METHODS:
            return True
        return membership.can_edit
