from django.urls import path
from .views import export_resume_pdf

urlpatterns = [
    path('export/<int:pk>/', export_resume_pdf, name='export_resume_pdf'),
]