from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import MyTokenObtainPairView
urlpatterns = [
    # Rota de Registro (Agora aponta para a função nova)
    path('register/', views.register_user, name='register'),
    path('confirm/', views.confirm_registration, name='confirm-registration'),
    path('me/', views.my_profile, name='my-profile'),

    # Rotas de Login (JWT) - Mantenha se você já tinha
    #path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('dashboard/', views.gestor_dashboard, name='gestor-dashboard'),
    path('gestor/resumes/', views.list_all_resumes, name='gestor-resumes'),
    path('gestor/companies/', views.list_all_companies, name='gestor-companies'),
    path('gestor/jobs/', views.list_all_jobs, name='gestor-jobs'),
    path('password-reset/', views.password_reset_request, name='password_reset_request'),
    path('password-reset-confirm/', views.password_reset_confirm_pin, name='password_reset_confirm'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),

]