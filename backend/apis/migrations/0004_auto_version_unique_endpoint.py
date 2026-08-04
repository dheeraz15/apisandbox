import re

from django.db import migrations, models


def convert_versions(apps, schema_editor):
    MockAPI = apps.get_model("apis", "MockAPI")
    for api in MockAPI.objects.all():
        raw = str(api.version or "1")
        digits = re.sub(r"\D", "", raw) or "1"
        api.version_num = max(int(digits), 1)
        api.save(update_fields=["version_num"])


def dedupe_endpoints(apps, schema_editor):
    """Keep newest API per workspace+method+endpoint before unique constraint."""
    from django.db.models import Count

    MockAPI = apps.get_model("apis", "MockAPI")
    dupes = (
        MockAPI.objects.values("workspace_id", "method", "endpoint")
        .annotate(c=Count("id"))
        .filter(c__gt=1)
    )
    for row in dupes:
        qs = MockAPI.objects.filter(
            workspace_id=row["workspace_id"],
            method=row["method"],
            endpoint=row["endpoint"],
        ).order_by("-updated_at")
        keep = qs.first()
        qs.exclude(pk=keep.pk).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("apis", "0003_observability_google_datasets"),
    ]

    operations = [
        migrations.AddField(
            model_name="mockapi",
            name="version_num",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.RunPython(convert_versions, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name="mockapi",
            unique_together=set(),
        ),
        migrations.RunPython(dedupe_endpoints, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="mockapi",
            name="version",
        ),
        migrations.RenameField(
            model_name="mockapi",
            old_name="version_num",
            new_name="version",
        ),
        migrations.AlterField(
            model_name="mockapi",
            name="version",
            field=models.PositiveIntegerField(
                default=1,
                help_text="Auto-incremented revision; does not affect URL.",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="mockapi",
            unique_together={("workspace", "method", "endpoint")},
        ),
    ]
