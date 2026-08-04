from django.contrib import admin
from .models import Workspace, WorkspaceVariable, WorkspaceMember, WorkspaceInvite

admin.site.register(Workspace)
admin.site.register(WorkspaceVariable)
admin.site.register(WorkspaceMember)
admin.site.register(WorkspaceInvite)
