from django.urls import path
from . import views
from . import google_auth
from . import platform

urlpatterns = [
    path("auth/register/", views.register),
    path("auth/login/", views.login),
    path("auth/logout/", views.logout),
    path("auth/me/", views.me),
    path("auth/google/", google_auth.google_auth),
    path("auth/google/link/", google_auth.google_link),
    path("platform/overview/", platform.platform_overview),
    path("platform/users/", platform.platform_users),
    path("platform/logs/", platform.platform_logs),
    path("platform/analytics/", platform.platform_analytics),
]
