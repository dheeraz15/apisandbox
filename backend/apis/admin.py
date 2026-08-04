from django.contrib import admin
from .models import MockAPI, Collection, Dataset, APIVersion

admin.site.register(MockAPI)
admin.site.register(Collection)
admin.site.register(Dataset)
admin.site.register(APIVersion)
