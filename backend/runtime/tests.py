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


class BulkGenerationTests(RuntimeTestCase):
    def test_repeat_expands_into_a_list(self):
        self.deploy(
            method="GET",
            endpoint="/users",
            responses=[
                {
                    "status_code": 200,
                    "body": {
                        "users": {
                            "$repeat": 5,
                            "$item": {"id": "{{index}}", "name": "{{faker.name}}"},
                        }
                    },
                }
            ],
        )

        users = self.call("GET", "/users").json()["users"]

        self.assertEqual(len(users), 5)
        self.assertEqual([u["id"] for u in users], [0, 1, 2, 3, 4])
        self.assertTrue(all(u["name"] for u in users))

    def test_repeat_accepts_a_range(self):
        self.deploy(
            method="GET",
            endpoint="/varying",
            responses=[
                {
                    "status_code": 200,
                    "body": {"items": {"$repeat": [2, 4], "$item": {"n": "{{index}}"}}},
                }
            ],
        )

        count = len(self.call("GET", "/varying").json()["items"])
        self.assertGreaterEqual(count, 2)
        self.assertLessEqual(count, 4)

    def test_repeat_is_capped(self):
        self.deploy(
            method="GET",
            endpoint="/huge",
            responses=[
                {
                    "status_code": 200,
                    "body": {"items": {"$repeat": 100000, "$item": {"n": "{{index}}"}}},
                }
            ],
        )

        self.assertEqual(len(self.call("GET", "/huge").json()["items"]), 1000)

    def test_repeat_without_item_yields_empty_list(self):
        self.deploy(
            method="GET",
            endpoint="/empty",
            responses=[{"status_code": 200, "body": {"items": {"$repeat": 3}}}],
        )

        self.assertEqual(self.call("GET", "/empty").json()["items"], [])


class SeedTests(RuntimeTestCase):
    def body_with_random(self):
        # Dates are in here on purpose. An earlier version seeded only the
        # random number generator, so a seeded response containing a date still
        # changed on every call and the promise of reproducibility was false.
        return {
            "status_code": 200,
            "body": {
                "id": "{{uuid}}",
                "name": "{{faker.name}}",
                "n": "{{randomInt}}",
                "at": "{{date}}",
                "ts": "{{timestamp}}",
                "ago": "{{dateOffset:-30d}}",
            },
        }

    def test_seeded_endpoint_repeats_itself(self):
        self.deploy(
            method="GET",
            endpoint="/stable",
            behavior={"seed": 42},
            responses=[self.body_with_random()],
        )

        first = self.call("GET", "/stable").json()
        second = self.call("GET", "/stable").json()

        self.assertEqual(first, second)
        self.assertNotIn("{{", json.dumps(first))

    def test_unseeded_endpoint_varies(self):
        self.deploy(
            method="GET",
            endpoint="/unstable",
            responses=[self.body_with_random()],
        )

        first = self.call("GET", "/unstable").json()
        second = self.call("GET", "/unstable").json()

        self.assertNotEqual(first, second)

    def test_different_seeds_give_different_output(self):
        self.deploy(
            method="GET", endpoint="/a", behavior={"seed": 1},
            responses=[self.body_with_random()],
        )
        self.deploy(
            method="GET", endpoint="/b", behavior={"seed": 2},
            responses=[self.body_with_random()],
        )

        self.assertNotEqual(
            self.call("GET", "/a").json()["name"],
            self.call("GET", "/b").json()["name"],
        )


    def test_seeded_dates_are_frozen(self):
        self.deploy(
            method="GET",
            endpoint="/when",
            behavior={"seed": 99},
            responses=[
                {"status_code": 200, "body": {"now": "{{date}}", "ago": "{{dateOffset:-1d}}"}}
            ],
        )

        first = self.call("GET", "/when").json()
        second = self.call("GET", "/when").json()

        self.assertEqual(first, second)
        # The offset still has to be a real day earlier than the frozen "now".
        from datetime import datetime

        gap = datetime.fromisoformat(first["now"]) - datetime.fromisoformat(first["ago"])
        self.assertEqual(gap.days, 1)

    def test_unseeded_dates_track_the_real_clock(self):
        from datetime import datetime, timezone as tz

        self.deploy(
            method="GET",
            endpoint="/livenow",
            responses=[{"status_code": 200, "body": {"now": "{{date}}"}}],
        )

        value = datetime.fromisoformat(self.call("GET", "/livenow").json()["now"])

        self.assertLess(abs((datetime.now(tz.utc) - value).total_seconds()), 60)


class TemplatePrimitiveTests(RuntimeTestCase):
    def render(self, template):
        self.deploy(
            method="GET",
            endpoint="/v",
            responses=[{"status_code": 200, "body": {"v": template}}],
        )
        return self.call("GET", "/v").json()["v"]

    def test_random_from_picks_a_listed_value(self):
        self.assertIn(
            self.render("{{randomFrom:pending|active|closed}}"),
            ["pending", "active", "closed"],
        )

    def test_random_int_range_is_respected(self):
        for _ in range(10):
            value = self.render("{{randomInt:5:7}}")
            self.assertIn(value, [5, 6, 7])
            MockAPI.objects.all().delete()

    def test_random_bool_is_a_real_boolean(self):
        self.assertIn(self.render("{{randomBool}}"), [True, False])

    def test_date_offset_moves_from_now(self):
        from datetime import datetime, timezone as tz

        value = self.render("{{dateOffset:-2d}}")
        parsed = datetime.fromisoformat(value)
        delta = datetime.now(tz.utc) - parsed

        self.assertGreater(delta.total_seconds(), 0)
        self.assertLess(abs(delta.total_seconds() - 2 * 86400), 120)

    def test_unknown_variable_is_reported_not_silently_dropped(self):
        self.assertIn("unknown", str(self.render("{{nonsense}}")))


class SequenceTests(RuntimeTestCase):
    def test_responses_cycle_in_order(self):
        self.deploy(
            method="GET",
            endpoint="/job",
            behavior={"sequence": True},
            responses=[
                {"status_code": 202, "body": {"state": "PENDING"}},
                {"status_code": 202, "body": {"state": "RUNNING"}},
                {"status_code": 200, "body": {"state": "COMPLETE"}},
            ],
        )

        states = [self.call("GET", "/job").json()["state"] for _ in range(4)]

        self.assertEqual(states, ["PENDING", "RUNNING", "COMPLETE", "PENDING"])

    def test_sequence_carries_its_status_code(self):
        self.deploy(
            method="GET",
            endpoint="/flaky",
            behavior={"sequence": True},
            responses=[
                {"status_code": 500, "body": {"error": "boom"}},
                {"status_code": 200, "body": {"ok": True}},
            ],
        )

        self.assertEqual(self.call("GET", "/flaky").status_code, 500)
        self.assertEqual(self.call("GET", "/flaky").status_code, 200)


class RequestValidationTests(RuntimeTestCase):
    SCHEMA = {
        "type": "object",
        "required": ["email", "age"],
        "properties": {
            "email": {"type": "string", "format": "email"},
            "age": {"type": "integer", "minimum": 0},
        },
    }

    def deploy_validated(self):
        return self.deploy(
            method="POST",
            endpoint="/signup",
            body_schema=self.SCHEMA,
            behavior={"validate_request": True},
            responses=[{"status_code": 201, "body": {"created": True}}],
        )

    def test_valid_body_passes_through(self):
        self.deploy_validated()

        res = self.call("POST", "/signup", {"email": "a@example.com", "age": 30})

        self.assertEqual(res.status_code, 201)

    def test_missing_required_field_is_rejected(self):
        self.deploy_validated()

        res = self.call("POST", "/signup", {"email": "a@example.com"})

        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["error"], "REQUEST_VALIDATION_FAILED")
        self.assertTrue(res.json()["violations"])

    def test_wrong_type_is_rejected_and_names_the_field(self):
        self.deploy_validated()

        res = self.call(
            "POST", "/signup", {"email": "a@example.com", "age": "not a number"}
        )

        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["violations"][0]["field"], "age")

    def test_validation_is_off_unless_requested(self):
        self.deploy(
            method="POST",
            endpoint="/loose",
            body_schema=self.SCHEMA,
            responses=[{"status_code": 201, "body": {"created": True}}],
        )

        # Same invalid payload, but the endpoint never opted in.
        res = self.call("POST", "/loose", {"nothing": "relevant"})

        self.assertEqual(res.status_code, 201)

    def test_broken_schema_is_reported_clearly(self):
        self.deploy(
            method="POST",
            endpoint="/broken",
            body_schema={"type": "not-a-real-type"},
            behavior={"validate_request": True},
            responses=[{"status_code": 201, "body": {"created": True}}],
        )

        res = self.call("POST", "/broken", {"anything": 1})

        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["error"], "INVALID_SCHEMA")
