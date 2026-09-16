"""Tests for the management API.

The runtime has its own suite in runtime/tests.py. These cover the endpoints the
builder UI depends on.
"""

import json

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from workspaces.models import Workspace, WorkspaceMember


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


class DeployTests(APITestCase):
    """Deploying snapshots the endpoint into a JSONField.

    That snapshot used to be raw serializer output containing UUID objects,
    which json.dumps refuses, so every deploy returned 500 after the endpoint
    had already been created. Onboarding surfaced it as "internal server error"
    followed by "workspace already exists" on retry.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="deployer@example.com", password="test1234"
        )
        self.workspace = Workspace.objects.create(
            slug="dep", name="Dep", created_by=self.user
        )
        WorkspaceMember.objects.get_or_create(
            workspace=self.workspace, user=self.user, defaults={"role": "owner"}
        )
        self.client.force_authenticate(self.user)

    def create_endpoint(self):
        res = self.client.post(
            "/api/v1/apis/",
            {
                "workspace": str(self.workspace.id),
                "name": "Hello endpoint",
                "method": "POST",
                "endpoint": "/hello",
                "responses": [{"status_code": 200, "body": {"ok": True}}],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        return res.json()["id"]

    def test_deploy_succeeds(self):
        api_id = self.create_endpoint()

        res = self.client.post(f"/api/v1/apis/{api_id}/deploy/")

        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.json()["is_deployed"])

    def test_deploy_stores_a_readable_snapshot(self):
        api_id = self.create_endpoint()
        self.client.post(f"/api/v1/apis/{api_id}/deploy/")

        versions = self.client.get(f"/api/v1/apis/{api_id}/versions/").json()

        self.assertEqual(len(versions), 1)
        snapshot = versions[0]["snapshot"]
        # Everything in the snapshot has to survive a JSON round trip.
        json.dumps(snapshot)
        self.assertEqual(snapshot["endpoint"], "/hello")

    def test_creating_a_version_by_hand_also_works(self):
        api_id = self.create_endpoint()

        res = self.client.post(
            f"/api/v1/apis/{api_id}/versions/", {"version": "v2"}, format="json"
        )

        self.assertEqual(res.status_code, 201, res.data)

    def test_deploy_then_undeploy(self):
        api_id = self.create_endpoint()
        self.client.post(f"/api/v1/apis/{api_id}/deploy/")

        res = self.client.post(f"/api/v1/apis/{api_id}/undeploy/")

        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["is_deployed"])


class OnboardingFlowTests(APITestCase):
    """The exact sequence the onboarding screen runs, end to end."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="newcomer@example.com", password="test1234"
        )
        self.client.force_authenticate(self.user)

    def test_new_user_can_complete_onboarding(self):
        created = self.client.post(
            "/api/v1/workspaces/",
            {"name": "My Workspace", "slug": "my-workspace", "description": ""},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        workspace_id = created.json()["id"]

        template = self.client.post(
            "/api/v1/apis/from_template/",
            {"template": "echo", "workspace": workspace_id},
            format="json",
        )
        self.assertEqual(template.status_code, 200, template.data)

        payload = dict(template.json())
        payload.update(
            {
                "workspace": workspace_id,
                "name": "Hello endpoint",
                "endpoint": "/hello",
                "method": "POST",
                "endpoint_type": "action",
            }
        )
        endpoint = self.client.post("/api/v1/apis/", payload, format="json")
        self.assertEqual(endpoint.status_code, 201, endpoint.data)

        deployed = self.client.post(f"/api/v1/apis/{endpoint.json()['id']}/deploy/")
        self.assertEqual(deployed.status_code, 200, deployed.data)

        # The workspace must be visible immediately afterwards, since the app
        # redirects straight into it.
        listed = self.client.get("/api/v1/workspaces/").json()
        slugs = [w["slug"] for w in listed["results"]]
        self.assertIn("my-workspace", slugs)
