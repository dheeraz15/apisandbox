from django.contrib import admin
from .models import RequestLog, IncomingWebhook, WebhookDelivery, OutgoingWebhook

admin.site.register(RequestLog)
admin.site.register(IncomingWebhook)
admin.site.register(WebhookDelivery)
admin.site.register(OutgoingWebhook)
