from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from workspaces.models import Workspace, WorkspaceVariable, WorkspaceMember
from apis.models import MockAPI, Collection, Dataset
from logs.models import IncomingWebhook


class Command(BaseCommand):
    help = "Seed demo workspace and sample APIs"

    def handle(self, *args, **options):
        user, _ = User.objects.get_or_create(
            username="demo@thirdfactor.com",
            defaults={
                "email": "demo@thirdfactor.com",
                "first_name": "Demo Manager",
            },
        )
        user.email = "demo@thirdfactor.com"
        user.first_name = user.first_name or "Demo Manager"
        user.set_password("demo1234")
        user.save()

        workspace, created = Workspace.objects.get_or_create(
            slug="demo",
            defaults={
                "name": "Demo Workspace",
                "description": "ThirdFactor API Sandbox demo",
                "created_by": user,
            },
        )
        WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=user,
            defaults={"role": "owner"},
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Workspace '{workspace.name}' {'created' if created else 'exists'}"
            )
        )
        self.stdout.write("Demo login: demo@thirdfactor.com / demo1234")

        for key, value in [
            ("BANK_NAME", "ThirdFactor Bank"),
            ("CURRENCY", "USD"),
            ("COUNTRY", "US"),
            ("BASE_URL", "http://localhost:8000"),
        ]:
            WorkspaceVariable.objects.get_or_create(
                workspace=workspace,
                key=key,
                defaults={"value": value},
            )

        collection, _ = Collection.objects.get_or_create(
            workspace=workspace,
            name="Core Banking",
            defaults={"description": "Core banking APIs", "color": "#6366f1"},
        )
        Collection.objects.get_or_create(
            workspace=workspace,
            name="Payments",
            defaults={"description": "Payment APIs", "color": "#10b981"},
        )
        Collection.objects.get_or_create(
            workspace=workspace,
            name="KYC & AML",
            defaults={"description": "Compliance APIs", "color": "#f59e0b"},
        )

        for ds_name, data in [
            ("Customer A — VIP", {"name": "Ava Chen", "status": "VIP", "riskScore": 12}),
            ("Customer B — Fraudster", {"name": "Alex Fraud", "status": "FLAGGED", "riskScore": 98}),
            ("Corporate", {"name": "Acme Holdings", "type": "CORPORATE"}),
        ]:
            Dataset.objects.get_or_create(
                workspace=workspace,
                name=ds_name,
                defaults={"data": data},
            )

        account_api, created = MockAPI.objects.get_or_create(
            workspace=workspace,
            method="POST",
            endpoint="/account/verify",
            defaults={
                "name": "Account Verification",
                "description": "Verify account number and return customer info",
                "category": "Core Banking",
                "collection": collection,
                "tags": ["banking", "verification"],
                "body_type": "json",
                "body_schema": {
                    "type": "object",
                    "required": ["accountNumber"],
                    "properties": {"accountNumber": {"type": "string"}},
                },
                "body_example": {"accountNumber": "1001234567"},
                "responses": [
                    {
                        "status_code": 200,
                        "name": "Success",
                        "body": {
                            "customerName": "{{faker.name}}",
                            "accountNumber": "{{request.body.accountNumber}}",
                            "status": "ACTIVE",
                            "branch": "Main Branch",
                            "availableBalance": "{{randomFloat}}",
                            "currency": "{{env.CURRENCY}}",
                            "bankName": "{{env.BANK_NAME}}",
                            "verified": True,
                        },
                    },
                    {
                        "status_code": 404,
                        "name": "Not Found",
                        "body": {
                            "error": "ACCOUNT_NOT_FOUND",
                            "message": "Account not found",
                        },
                    },
                ],
                "rules": [
                    {
                        "name": "Frozen Account",
                        "condition": {
                            "field": "request.body.accountNumber",
                            "operator": "startsWith",
                            "value": "99",
                        },
                        "response": {
                            "status_code": 403,
                            "body": {
                                "error": "ACCOUNT_FROZEN",
                                "message": "Account is frozen",
                            },
                        },
                    },
                ],
                "scenarios": [
                    {"name": "default", "label": "Customer Exists"},
                    {
                        "name": "not_found",
                        "label": "Account Not Found",
                        "responses": [
                            {"status_code": 404, "body": {"error": "ACCOUNT_NOT_FOUND"}}
                        ],
                    },
                ],
                "active_scenario": "default",
                "behavior": {"delay_ms": 200},
                "is_deployed": True,
                "deployed_at": timezone.now(),
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS("API 'Account Verification' created"))

        IncomingWebhook.objects.get_or_create(
            workspace=workspace,
            slug="demo-events",
            defaults={
                "name": "Demo Events",
                "description": "Catch-all receiver for demo webhooks",
                "secret": "demo-secret",
            },
        )

        self.stdout.write(
            self.style.SUCCESS(f"\nDeployed endpoint: {account_api.deployed_url}")
        )
