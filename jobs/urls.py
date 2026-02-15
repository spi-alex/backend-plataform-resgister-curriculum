from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobViewSet

# Criação do Router para as rotas padrões (CRUD)
router = DefaultRouter()
router.register(r'', JobViewSet, basename='job')

urlpatterns = [
    # 1. FORÇAMOS O DASHBOARD AQUI EM CIMA (Alta Prioridade)
    # Isso diz: "Se a URL for 'dashboard/', use a função dashboard da JobViewSet"
    path('dashboard/', JobViewSet.as_view({'get': 'dashboard'}), name='job-dashboard'),

    # 2. O resto das rotas vem depois
    path('', include(router.urls)),
]