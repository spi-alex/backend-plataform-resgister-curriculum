from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('captcha/', include('captcha.urls')),
    # --- Autenticação JWT ---
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # --- Apps do Projeto ---
    # Aqui usamos 'include', então não precisamos importar as Views
    path('api/users/', include('users.urls')),
    path('api/resumes/', include('resumes.urls')),
    path('api/companies/', include('companies.urls')), # Descomente se já existir
    path('api/jobs/', include('jobs.urls')),
    path('api/pdf/', include('pdf.urls')), # Descomente se já existir
]