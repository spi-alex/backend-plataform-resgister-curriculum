from django.contrib import admin
from django.urls import include, path

from users.views import CookieTokenRefreshView, MyTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('captcha/', include('captcha.urls')),

    # --- Autenticação JWT ---
    # BYPASS CORRIGIDO: estas duas rotas usavam `TokenObtainPairView` e
    # `TokenRefreshView`, as views GENÉRICAS do SimpleJWT. Como elas não
    # passam pelo `MyTokenObtainPairSerializer`, `/api/token/` era um caminho
    # paralelo de login que ignorava TODAS as travas montadas em
    # `/api/users/login/`:
    #
    #   - não checava o `status` da conta -> uma conta 'pendente' (ou
    #     'inativo') logava normalmente por aqui, anulando a confirmação de
    #     e-mail obrigatória;
    #   - não tinha rate limiting -> força-bruta de senha sem nenhum limite,
    #     mesmo com o throttle configurado na rota oficial;
    #   - devolvia o refresh token no CORPO da resposta, em vez de gravá-lo
    #     no cookie httpOnly.
    #
    # Agora as duas apontam para as mesmas views endurecidas de `users`.
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),

    # --- Apps do Projeto ---
    path('api/users/', include('users.urls')),
    path('api/resumes/', include('resumes.urls')),
    path('api/companies/', include('companies.urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/pdf/', include('pdf.urls')),
]
