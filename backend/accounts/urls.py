from django.urls import path
from . import views
from . import google_auth

urlpatterns = [
    path("auth/register/", views.register),
    path("auth/login/", views.login),
    path("auth/logout/", views.logout),
    path("auth/me/", views.me),
    path("auth/google/", google_auth.google_auth),
]
