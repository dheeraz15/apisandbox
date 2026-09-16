from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResourceViewSet, MockAPIViewSet, CollectionViewSet, DatasetViewSet

router = DefaultRouter()
router.register(r"apis", MockAPIViewSet, basename="api")
router.register(r"collections", CollectionViewSet, basename="collection")
router.register(r"datasets", DatasetViewSet, basename="dataset")
router.register(r"resources", ResourceViewSet, basename="resource")

urlpatterns = [
    path("", include(router.urls)),
]
