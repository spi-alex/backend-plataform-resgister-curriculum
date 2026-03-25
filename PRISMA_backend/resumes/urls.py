# resumes/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResumeViewSet

router = DefaultRouter()
router.register(r'', ResumeViewSet, basename='resume')
from django.urls import path
from .views import ResumeViewSet, export_resumes_zip
urlpatterns = [
    path('', include(router.urls)),
    path('gestor/export-zip/', export_resumes_zip, name='export-resumes-zip'),
]