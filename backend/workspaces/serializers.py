from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Workspace, WorkspaceVariable, WorkspaceMember, WorkspaceInvite, WorkspaceDomain


class WorkspaceVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceVariable
        fields = [
            "id",
            "key",
            "value",
            "is_secret",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Never echo secret values in list/detail JSON; runtime still reads DB directly
        if instance.is_secret:
            data["value"] = ""
            data["has_value"] = bool(instance.value)
        return data

    def update(self, instance, validated_data):
        # Masked empty value must not wipe an existing secret
        if instance.is_secret and validated_data.get("value", None) == "":
            validated_data.pop("value", None)
        return super().update(instance, validated_data)


class WorkspaceDomainSerializer(serializers.ModelSerializer):
    cname_target = serializers.CharField(read_only=True)
    txt_name = serializers.CharField(read_only=True)
    txt_value = serializers.CharField(read_only=True)

    class Meta:
        model = WorkspaceDomain
        fields = [
            "id",
            "domain",
            "verified",
            "is_default",
            "verification_token",
            "verification_method",
            "last_verified_at",
            "cname_target",
            "txt_name",
            "txt_value",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "verified",
            "verification_token",
            "verification_method",
            "last_verified_at",
            "cname_target",
            "txt_name",
            "txt_value",
            "created_at",
        ]
        read_only_fields = ["id", "verified", "created_at"]


class MemberUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "name"]


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = MemberUserSerializer(read_only=True)
    email = serializers.EmailField(write_only=True, required=False)
    can_manage_members = serializers.BooleanField(read_only=True)
    can_edit = serializers.BooleanField(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = [
            "id",
            "user",
            "email",
            "role",
            "can_manage_members",
            "can_edit",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class WorkspaceInviteSerializer(serializers.ModelSerializer):
    invited_by_email = serializers.EmailField(
        source="invited_by.email", read_only=True, default=None
    )

    class Meta:
        model = WorkspaceInvite
        fields = [
            "id",
            "email",
            "role",
            "accepted",
            "invited_by_email",
            "created_at",
        ]
        read_only_fields = ["id", "accepted", "created_at"]


class WorkspaceSerializer(serializers.ModelSerializer):
    variables = WorkspaceVariableSerializer(many=True, read_only=True)
    api_count = serializers.SerializerMethodField()
    request_count_today = serializers.SerializerMethodField()
    total_requests = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "variables",
            "api_count",
            "request_count_today",
            "total_requests",
            "member_count",
            "my_role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_api_count(self, obj):
        return obj.apis.count()

    def get_request_count_today(self, obj):
        from django.utils import timezone
        from logs.models import RequestLog

        today = timezone.now().date()
        return RequestLog.objects.filter(
            workspace=obj, created_at__date=today
        ).count()

    def get_total_requests(self, obj):
        from logs.models import RequestLog

        return RequestLog.objects.filter(workspace=obj).count()

    def get_member_count(self, obj):
        return obj.members.count()

    def get_my_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.members.filter(user=request.user).first()
        return membership.role if membership else None


class WorkspaceListSerializer(serializers.ModelSerializer):
    api_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "api_count",
            "my_role",
            "created_at",
        ]

    def get_api_count(self, obj):
        return obj.apis.count()

    def get_my_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.members.filter(user=request.user).first()
        return membership.role if membership else None
