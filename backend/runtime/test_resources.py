"""Tests for resource backed CRUD.

The point of a Resource is that every operation shares one store. Splitting a
collection across separate single method endpoints gave each its own state, so
a POST and a later GET could never see each other.
"""

import json

from django.contrib.auth.models import User
from django.test import TestCase

from apis.models import Resource, ResourceRecord
from workspaces.models import Workspace


class ResourceTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="res@example.com", password="test1234"
        )
        self.workspace = Workspace.objects.create(
            slug="res", name="Res", created_by=self.user
        )
        self.resource = Resource.objects.create(
            workspace=self.workspace,
            name="Account",
            path="/accounts",
            item_template={
                "id": "{{uuid}}",
                "holder": "{{faker.name}}",
                "status": "{{randomFrom:ACTIVE|FROZEN}}",
            },
        )

    def call(self, method, path, payload=None, query=""):
        url = f"/api/{self.workspace.slug}{path}{query}"
        fn = getattr(self.client, method.lower())
        if payload is None:
            return fn(url)
        return fn(url, data=json.dumps(payload), content_type="application/json")


class CrudLifecycleTests(ResourceTestCase):
    def test_create_then_read_back(self):
        created = self.call("POST", "/accounts", {"holder": "Ada Lovelace"})
        self.assertEqual(created.status_code, 201, created.content)
        record_id = created.json()["id"]

        fetched = self.call("GET", f"/accounts/{record_id}")

        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.json()["holder"], "Ada Lovelace")

    def test_created_record_appears_in_the_list(self):
        self.call("POST", "/accounts", {"holder": "Grace Hopper"})

        listed = self.call("GET", "/accounts").json()

        self.assertEqual(listed["meta"]["total"], 1)
        self.assertEqual(listed["data"][0]["holder"], "Grace Hopper")

    def test_update_persists(self):
        record_id = self.call("POST", "/accounts", {"holder": "Ada"}).json()["id"]

        patched = self.call("PATCH", f"/accounts/{record_id}", {"status": "FROZEN"})

        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.json()["status"], "FROZEN")
        self.assertEqual(patched.json()["holder"], "Ada")
        again = self.call("GET", f"/accounts/{record_id}").json()
        self.assertEqual(again["status"], "FROZEN")

    def test_put_replaces_rather_than_merges(self):
        record_id = self.call("POST", "/accounts", {"holder": "Ada", "tier": "gold"}).json()["id"]

        replaced = self.call("PUT", f"/accounts/{record_id}", {"holder": "Ada"}).json()

        self.assertNotIn("tier", replaced)
        self.assertEqual(replaced["holder"], "Ada")

    def test_delete_removes_it(self):
        record_id = self.call("POST", "/accounts", {"holder": "Ada"}).json()["id"]

        removed = self.call("DELETE", f"/accounts/{record_id}")

        self.assertEqual(removed.status_code, 200)
        self.assertEqual(self.call("GET", f"/accounts/{record_id}").status_code, 404)
        self.assertEqual(self.call("GET", "/accounts").json()["meta"]["total"], 0)

    def test_missing_record_is_a_clean_404(self):
        res = self.call("GET", "/accounts/nope")

        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["error"], "NOT_FOUND")

    def test_id_in_the_url_wins_over_the_body(self):
        record_id = self.call("POST", "/accounts", {"holder": "Ada"}).json()["id"]

        self.call("PATCH", f"/accounts/{record_id}", {"id": "hijacked"})

        self.assertEqual(self.call("GET", "/accounts/hijacked").status_code, 404)
        self.assertEqual(self.call("GET", f"/accounts/{record_id}").status_code, 200)


class ListQueryTests(ResourceTestCase):
    def populate(self):
        for holder, status in [
            ("Ada", "ACTIVE"),
            ("Grace", "FROZEN"),
            ("Alan", "ACTIVE"),
            ("Katherine", "ACTIVE"),
        ]:
            self.call("POST", "/accounts", {"holder": holder, "status": status})

    def test_filters_on_any_field(self):
        self.populate()

        res = self.call("GET", "/accounts", query="?status=ACTIVE").json()

        self.assertEqual(res["meta"]["total"], 3)
        self.assertTrue(all(r["status"] == "ACTIVE" for r in res["data"]))

    def test_search_looks_across_the_record(self):
        self.populate()

        res = self.call("GET", "/accounts", query="?q=grace").json()

        self.assertEqual(res["meta"]["total"], 1)

    def test_pagination_splits_the_results(self):
        self.populate()

        first = self.call("GET", "/accounts", query="?limit=2&page=1").json()
        second = self.call("GET", "/accounts", query="?limit=2&page=2").json()

        self.assertEqual(len(first["data"]), 2)
        self.assertEqual(len(second["data"]), 2)
        self.assertEqual(first["meta"]["pages"], 2)
        self.assertNotEqual(first["data"][0]["id"], second["data"][0]["id"])

    def test_sorting(self):
        self.populate()

        names = [
            r["holder"]
            for r in self.call("GET", "/accounts", query="?sort=holder").json()["data"]
        ]

        self.assertEqual(names, sorted(names))

    def test_empty_resource_returns_an_empty_page_not_an_error(self):
        res = self.call("GET", "/accounts")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data"], [])
        self.assertEqual(res.json()["meta"]["total"], 0)


class ReadOnlyResourceTests(ResourceTestCase):
    def test_writes_are_refused(self):
        self.resource.allow_writes = False
        self.resource.save()

        res = self.call("POST", "/accounts", {"holder": "Ada"})

        self.assertEqual(res.status_code, 405)
        self.assertEqual(res.json()["error"], "READ_ONLY")

    def test_reads_still_work(self):
        self.resource.allow_writes = False
        self.resource.save()

        self.assertEqual(self.call("GET", "/accounts").status_code, 200)


class SeedingTests(ResourceTestCase):
    def test_seeding_generates_distinct_records(self):
        from runtime.resources import seed_records

        created = seed_records(self.resource, 5)

        self.assertEqual(created, 5)
        rows = self.call("GET", "/accounts").json()["data"]
        self.assertEqual(len(rows), 5)
        self.assertEqual(len({r["id"] for r in rows}), 5)
        self.assertEqual(len({r["holder"] for r in rows}), 5)

    def test_seeding_is_capped(self):
        from runtime.resources import seed_records

        self.assertEqual(seed_records(self.resource, 10_000), 500)


class RoutingTests(ResourceTestCase):
    def test_a_handwritten_endpoint_wins_over_the_resource(self):
        from django.utils import timezone

        from apis.models import MockAPI

        MockAPI.objects.create(
            workspace=self.workspace,
            name="Custom list",
            method="GET",
            endpoint="/accounts",
            is_deployed=True,
            deployed_at=timezone.now(),
            responses=[{"status_code": 200, "body": {"custom": True}}],
        )

        self.assertEqual(self.call("GET", "/accounts").json(), {"custom": True})
        # The item route is untouched, so the resource still serves it.
        self.assertEqual(self.call("GET", "/accounts/missing").status_code, 404)

    def test_longer_resource_path_wins(self):
        Resource.objects.create(
            workspace=self.workspace,
            name="Transaction",
            path="/accounts/transactions",
            item_template={"id": "{{uuid}}"},
        )

        res = self.call("POST", "/accounts/transactions", {"amount": 10})

        self.assertEqual(res.status_code, 201)
        self.assertEqual(
            ResourceRecord.objects.filter(resource__path="/accounts/transactions").count(),
            1,
        )

    def test_unknown_path_is_still_a_404(self):
        self.assertEqual(self.call("GET", "/nothing").status_code, 404)

    def test_nested_path_under_a_record_is_not_claimed(self):
        record_id = self.call("POST", "/accounts", {"holder": "Ada"}).json()["id"]

        res = self.call("GET", f"/accounts/{record_id}/transactions")

        self.assertEqual(res.status_code, 404)
