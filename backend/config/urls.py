from django.contrib import admin
from django.urls import path, include
from logs.views import WebhookReceiverView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("workspaces.urls")),
    path("api/v1/", include("apis.urls")),
    path("api/v1/", include("logs.urls")),
    path(
        "api/hooks/<slug:workspace_slug>/<slug:hook_slug>",
        WebhookReceiverView.as_view(),
        name="webhook-receiver",
    ),
    path("api/", include("runtime.urls")),
]
