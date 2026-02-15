from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # Rota de Registro (Agora aponta para a função nova)
    path('register/', views.register_user, name='register'),

    # Rotas de Login (JWT) - Mantenha se você já tinha
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]