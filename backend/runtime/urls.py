from django.urls import re_path
from .views import MockAPIHandlerView

urlpatterns = [
    re_path(
        r"^(?P<workspace_slug>[\w-]+)(?P<endpoint_path>/.*)?$",
        MockAPIHandlerView.as_view(),
        name="mock-api-handler",
    ),
]
