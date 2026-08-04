from django.conf import settings
from django.db import models


class GoogleAccount(models.Model):
    """Links a Google subject to a Django user (email/password accounts can also link)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="google_account",
    )
    google_sub = models.CharField(max_length=255, unique=True)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.email} ({self.google_sub})"
