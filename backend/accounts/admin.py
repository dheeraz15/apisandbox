from django.contrib import admin
from .models import GoogleAccount


@admin.register(GoogleAccount)
class GoogleAccountAdmin(admin.ModelAdmin):
    list_display = ("email", "google_sub", "user", "created_at")
    search_fields = ("email", "google_sub", "user__email")
