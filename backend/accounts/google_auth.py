"""Google OAuth (ID token) for login/signup with email account linking."""

from __future__ import annotations

import os
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework.authtoken.models import Token
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import GoogleAccount
from .serializers import UserSerializer


class AuthRateThrottle(AnonRateThrottle):
    scope = "auth"


def _google_client_id() -> str:
    return os.getenv(
        "GOOGLE_CLIENT_ID",
        "969201656229-h8isqsnu430niikndbbc2ojv5773trle.apps.googleusercontent.com",
    )


def verify_google_id_token(id_token: str) -> dict:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    return google_id_token.verify_oauth2_token(
        id_token,
        google_requests.Request(),
        _google_client_id(),
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def google_auth(request):
    id_token = (request.data.get("id_token") or "").strip()
    if not id_token:
        return Response({"error": "id_token required"}, status=400)

    try:
        payload = verify_google_id_token(id_token)
    except Exception as e:
        return Response(
            {"error": "Invalid Google token", "detail": str(e)},
            status=401,
        )

    email = (payload.get("email") or "").lower().strip()
    sub = payload.get("sub") or ""
    email_verified = payload.get("email_verified", False)
    name = (payload.get("name") or "").strip()

    if not email or not sub:
        return Response({"error": "Google token missing email/sub"}, status=400)
    if not email_verified:
        return Response({"error": "Google email not verified"}, status=400)

    created = False
    with transaction.atomic():
        linked = GoogleAccount.objects.select_related("user").filter(google_sub=sub).first()
        if linked:
            user = linked.user
            if linked.email != email:
                linked.email = email
                linked.save(update_fields=["email", "updated_at"])
        else:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                username = email
                i = 0
                while User.objects.filter(username=username).exists():
                    i += 1
                    username = f"{email}+g{i}"
                user = User(username=username, email=email)
                user.set_unusable_password()
                if name:
                    parts = name.split(" ", 1)
                    user.first_name = parts[0][:150]
                    if len(parts) > 1:
                        user.last_name = parts[1][:150]
                user.save()
                created = True
            GoogleAccount.objects.create(user=user, google_sub=sub, email=email)

        if name and not user.first_name:
            parts = name.split(" ", 1)
            user.first_name = parts[0][:150]
            if len(parts) > 1:
                user.last_name = parts[1][:150]
            user.save(update_fields=["first_name", "last_name"])

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {
            "token": token.key,
            "user": UserSerializer(user).data,
            "linked": True,
            "created": created,
        }
    )


@api_view(["POST", "DELETE", "GET"])
@permission_classes([IsAuthenticated])
def google_link(request):
    """Link or unlink Google for an already authenticated user."""
    if request.method == "GET":
        linked = GoogleAccount.objects.filter(user=request.user).first()
        return Response(
            {
                "google_linked": bool(linked),
                "google_email": linked.email if linked else None,
            }
        )

    if request.method == "DELETE":
        GoogleAccount.objects.filter(user=request.user).delete()
        return Response({"ok": True, "google_linked": False})

    id_token = (request.data.get("id_token") or "").strip()
    if not id_token:
        return Response({"error": "id_token required"}, status=400)

    try:
        payload = verify_google_id_token(id_token)
    except Exception as e:
        return Response(
            {"error": "Invalid Google token", "detail": str(e)},
            status=401,
        )

    email = (payload.get("email") or "").lower().strip()
    sub = payload.get("sub") or ""
    email_verified = payload.get("email_verified", False)
    if not email or not sub:
        return Response({"error": "Google token missing email/sub"}, status=400)
    if not email_verified:
        return Response({"error": "Google email not verified"}, status=400)

    existing = GoogleAccount.objects.filter(google_sub=sub).select_related("user").first()
    if existing and existing.user_id != request.user.id:
        return Response(
            {"error": "This Google account is already linked to another user"},
            status=409,
        )

    with transaction.atomic():
        mine = GoogleAccount.objects.filter(user=request.user).first()
        if mine:
            mine.google_sub = sub
            mine.email = email
            mine.save(update_fields=["google_sub", "email", "updated_at"])
        elif existing:
            pass
        else:
            GoogleAccount.objects.create(
                user=request.user, google_sub=sub, email=email
            )

    return Response(
        {
            "ok": True,
            "google_linked": True,
            "google_email": email,
            "user": UserSerializer(request.user).data,
        }
    )
