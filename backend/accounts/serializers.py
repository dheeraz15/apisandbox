from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from .models import GoogleAccount


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value.lower()

    def create(self, validated_data):
        email = validated_data["email"]
        name = validated_data.get("name") or email.split("@")[0]
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data["password"],
            first_name=name[:150],
        )
        Token.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", read_only=True)
    google_linked = serializers.SerializerMethodField()
    google_email = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "date_joined",
            "last_login",
            "is_staff",
            "is_superuser",
            "google_linked",
            "google_email",
        ]

    def get_google_linked(self, obj):
        return GoogleAccount.objects.filter(user=obj).exists()

    def get_google_email(self, obj):
        acc = GoogleAccount.objects.filter(user=obj).first()
        return acc.email if acc else None
