"""Tests for the mock runtime.

This is the part users actually depend on: a request comes in over HTTP and the
configured response comes back. Everything else in the project exists to set
these endpoints up.
"""

import json

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from apis.models import MockAPI
from workspaces.models import Workspace, WorkspaceVariable


class RuntimeTestCase(TestCase):
    """Shared workspace and a helper for defining endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tester@example.com", password="test1234"
        )
        self.workspace = Workspace.objects.create(
            slug="test", name="Test Workspace", created_by=self.user
        )

    def deploy(self, method="GET", endpoint="/thing", **kwargs):
        kwargs.setdefault("name", f"{method} {endpoint}")
        kwargs.setdefault(
            "responses", [{"status_code": 200, "name": "OK", "body": {"ok": True}}]
        )
        return MockAPI.objects.create(
            workspace=self.workspace,
            method=method,
            endpoint=endpoint,
            is_deployed=True,
            deployed_at=timezone.now(),
            **kwargs,
        )

    def call(self, method, path, payload=None, **extra):
        url = f"/api/{self.workspace.slug}{path}"
        if payload is None:
            return getattr(self.client, method.lower())(url, **extra)
        return getattr(self.client, method.lower())(
            url, data=json.dumps(payload), content_type="application/json", **extra
        )


class DeployedEndpointTests(RuntimeTestCase):
    def test_returns_configured_response(self):
        self.deploy(
            method="GET",
            endpoint="/status",
            responses=[
                {"status_code": 200, "name": "OK", "body": {"status": "healthy"}}
            ],
        )

        res = self.call("GET", "/status")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "healthy"})

    def test_honours_a_non_200_status(self):
        self.deploy(
            method="GET",
            endpoint="/gone",
            responses=[{"status_code": 410, "name": "Gone", "body": {"error": "gone"}}],
        )

        self.assertEqual(self.call("GET", "/gone").status_code, 410)

    def test_undeployed_endpoint_is_not_served(self):
        api = self.deploy(method="GET", endpoint="/draft")
        api.is_deployed = False
        api.save()

        self.assertEqual(self.call("GET", "/draft").status_code, 404)

    def test_unknown_path_returns_404(self):
        self.assertEqual(self.call("GET", "/nothing-here").status_code, 404)

    def test_endpoint_of_another_workspace_is_not_reachable(self):
        other = Workspace.objects.create(
            slug="other", name="Other", created_by=self.user
        )
        MockAPI.objects.create(
            workspace=other,
            name="Secret",
            method="GET",
            endpoint="/secret",
            is_deployed=True,
            deployed_at=timezone.now(),
            responses=[{"status_code": 200, "body": {"leaked": True}}],
        )

        # Same path, but requested through this test's workspace.
        self.assertEqual(self.call("GET", "/secret").status_code, 404)


class MethodMatchingTests(RuntimeTestCase):
    def test_wrong_method_returns_405_and_names_the_right_one(self):
        self.deploy(method="POST", endpoint="/orders")

        res = self.call("GET", "/orders")

        self.assertEqual(res.status_code, 405)
        self.assertEqual(res.json()["allowed_methods"], ["POST"])
        self.assertIn("POST", res["Allow"])

    def test_same_path_can_serve_two_methods(self):
        self.deploy(
            method="GET",
            endpoint="/orders",
            responses=[{"status_code": 200, "body": {"verb": "get"}}],
        )
        self.deploy(
            method="POST",
            endpoint="/orders",
            responses=[{"status_code": 201, "body": {"verb": "post"}}],
        )

        self.assertEqual(self.call("GET", "/orders").json()["verb"], "get")

        created = self.call("POST", "/orders", {})
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["verb"], "post")


class PathParameterTests(RuntimeTestCase):
    def test_path_parameter_is_captured_and_echoed(self):
        self.deploy(
            method="GET",
            endpoint="/users/{id}",
            responses=[
                {"status_code": 200, "body": {"id": "{{request.path.id}}"}},
            ],
        )

        # Numeric-looking values are coerced, so this comes back as 42, not "42".
        self.assertEqual(self.call("GET", "/users/42").json()["id"], 42)

    def test_non_numeric_path_parameter_stays_a_string(self):
        self.deploy(
            method="GET",
            endpoint="/users/{id}",
            responses=[
                {"status_code": 200, "body": {"id": "{{request.path.id}}"}},
            ],
        )

        self.assertEqual(self.call("GET", "/users/ada").json()["id"], "ada")

    def test_path_parameter_does_not_match_across_segments(self):
        self.deploy(method="GET", endpoint="/users/{id}")

        self.assertEqual(self.call("GET", "/users/42/orders").status_code, 404)


class TemplateVariableTests(RuntimeTestCase):
    def test_substitutes_request_body_and_query(self):
        self.deploy(
            method="POST",
            endpoint="/echo",
            responses=[
                {
                    "status_code": 200,
                    "body": {
                        "name": "{{request.body.name}}",
                        "page": "{{request.query.page}}",
                    },
                }
            ],
        )

        res = self.call("POST", "/echo?page=3", {"name": "Ada"})

        self.assertEqual(res.json()["name"], "Ada")
        self.assertEqual(str(res.json()["page"]), "3")

    def test_substitutes_workspace_variables(self):
        WorkspaceVariable.objects.create(
            workspace=self.workspace, key="REGION", value="eu-west-1"
        )
        self.deploy(
            method="GET",
            endpoint="/region",
            responses=[{"status_code": 200, "body": {"region": "{{env.REGION}}"}}],
        )

        self.assertEqual(self.call("GET", "/region").json()["region"], "eu-west-1")

    def test_uuid_is_different_on_each_call(self):
        self.deploy(
            method="GET",
            endpoint="/id",
            responses=[{"status_code": 200, "body": {"id": "{{uuid}}"}}],
        )

        first = self.call("GET", "/id").json()["id"]
        second = self.call("GET", "/id").json()["id"]

        self.assertNotEqual(first, second)
        self.assertNotIn("{{", str(first))


class RuleTests(RuntimeTestCase):
    def deploy_with_frozen_rule(self):
        return self.deploy(
            method="POST",
            endpoint="/account/verify",
            responses=[{"status_code": 200, "body": {"status": "ACTIVE"}}],
            rules=[
                {
                    "name": "Frozen account",
                    "condition": {
                        "field": "request.body.accountNumber",
                        "operator": "startsWith",
                        "value": "99",
                    },
                    "response": {
                        "status_code": 403,
                        "body": {"error": "ACCOUNT_FROZEN"},
                    },
                }
            ],
        )

    def test_matching_rule_wins(self):
        self.deploy_with_frozen_rule()

        res = self.call("POST", "/account/verify", {"accountNumber": "9900000001"})

        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["error"], "ACCOUNT_FROZEN")

    def test_non_matching_rule_falls_through_to_the_default(self):
        self.deploy_with_frozen_rule()

        res = self.call("POST", "/account/verify", {"accountNumber": "1000000001"})

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ACTIVE")


class RequestSizeTests(RuntimeTestCase):
    def test_oversized_body_is_rejected(self):
        self.deploy(method="POST", endpoint="/upload")

        with self.settings(MAX_REQUEST_BODY_BYTES=100):
            res = self.call("POST", "/upload", {"blob": "x" * 500})

        self.assertEqual(res.status_code, 413)


class HealthTests(TestCase):
    def test_healthz_reports_ok(self):
        res = self.client.get("/healthz")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"ok": True})
