from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RequestLogViewSet, IncomingWebhookViewSet, OutgoingWebhookViewSet

router = DefaultRouter()
router.register(r"logs", RequestLogViewSet, basename="log")
router.register(r"webhooks/incoming", IncomingWebhookViewSet, basename="incoming-webhook")
router.register(r"webhooks/outgoing", OutgoingWebhookViewSet, basename="outgoing-webhook")

urlpatterns = [
    path("", include(router.urls)),
]
