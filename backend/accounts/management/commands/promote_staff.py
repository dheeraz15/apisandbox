from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Promote a user to platform admin (is_staff=True)."

    def add_arguments(self, parser):
        parser.add_argument("email", type=str)
        parser.add_argument(
            "--superuser",
            action="store_true",
            help="Also set is_superuser (Django admin access).",
        )

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist as exc:
            raise CommandError(f"No user with email {email}") from exc

        user.is_staff = True
        if options["superuser"]:
            user.is_superuser = True
        user.save(update_fields=["is_staff", "is_superuser"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Promoted {user.email}: is_staff={user.is_staff} is_superuser={user.is_superuser}"
            )
        )
