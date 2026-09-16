"""Tests for the management API.

The runtime has its own suite in runtime/tests.py. These cover the endpoints the
builder UI depends on.
"""

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from workspaces.models import Workspace


class PreviewTemplateTests(APITestCase):
    """The builder renders draft responses through this endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="builder@example.com", password="test1234"
        )
        self.workspace = Workspace.objects.create(
            slug="build", name="Build", created_by=self.user
        )
        self.client.force_authenticate(self.user)
        self.url = "/api/v1/apis/preview_template/"

    def test_requires_authentication(self):
        self.client.force_authenticate(None)

        res = self.client.post(self.url, {"body": {"a": 1}}, format="json")

        self.assertIn(res.status_code, (401, 403))

    def test_body_is_required(self):
        res = self.client.post(self.url, {}, format="json")

        self.assertEqual(res.status_code, 400)

    def test_renders_template_variables(self):
        res = self.client.post(
            self.url,
            {"body": {"id": "{{uuid}}", "name": "{{faker.name}}"}},
            format="json",
        )

        self.assertEqual(res.status_code, 200)
        rendered = res.json()["rendered"]
        self.assertNotIn("{{", str(rendered))
        self.assertTrue(rendered["name"])

    def test_expands_a_repeat_block(self):
        res = self.client.post(
            self.url,
            {
                "body": {
                    "users": {"$repeat": 3, "$item": {"i": "{{index}}"}}
                }
            },
            format="json",
        )

        self.assertEqual([u["i"] for u in res.json()["rendered"]["users"]], [0, 1, 2])

    def test_seed_makes_the_preview_stable(self):
        payload = {
            "body": {"name": "{{faker.name}}"},
            "behavior": {"seed": 7},
        }

        first = self.client.post(self.url, payload, format="json").json()
        second = self.client.post(self.url, payload, format="json").json()

        self.assertEqual(first["rendered"], second["rendered"])

    def test_sample_request_feeds_the_template(self):
        res = self.client.post(
            self.url,
            {
                "body": {"echo": "{{request.body.who}}"},
                "request": {"body": {"who": "Ada"}},
            },
            format="json",
        )

        self.assertEqual(res.json()["rendered"]["echo"], "Ada")

    def test_nothing_is_persisted(self):
        from apis.models import MockAPI

        self.client.post(
            self.url, {"body": {"id": "{{uuid}}"}}, format="json"
        )

        self.assertEqual(MockAPI.objects.count(), 0)
