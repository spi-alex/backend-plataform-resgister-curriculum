from django.urls import path

from . import views
from .views import CookieTokenRefreshView, MyTokenObtainPairView

urlpatterns = [
    # --- Cadastro e confirmação de conta ---
    path('register/', views.register_user, name='register'),
    path('confirm/', views.confirm_registration, name='confirm-registration'),
    path('me/', views.my_profile, name='my-profile'),

    # --- Sessão ---
    # O refresh usa a view com cookie httpOnly (users/cookies.py); a view
    # padrão do SimpleJWT só olharia o corpo da requisição.
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.logout_view, name='logout'),

    # --- Recuperação de senha ---
    path('password-reset/', views.password_reset_request, name='password_reset_request'),
    path('password-reset-confirm/', views.password_reset_confirm_pin, name='password_reset_confirm'),
    # Troca de senha do usuário LOGADO (confirma a senha atual). O fluxo
    # acima é para quem PERDEU o acesso; este é para quem já está dentro.
    path('change-password/', views.change_password, name='change-password'),

    # --- Gestor ---
    path('dashboard/', views.gestor_dashboard, name='gestor-dashboard'),
    path('gestor/resumes/', views.list_all_resumes, name='gestor-resumes'),
    path('gestor/companies/', views.list_all_companies, name='gestor-companies'),
    path('gestor/jobs/', views.list_all_jobs, name='gestor-jobs'),
]
