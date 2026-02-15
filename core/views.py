# core/views.py
from django.http import JsonResponse

def root_view(request):
    return JsonResponse({'status': 'ok', 'message': 'API funcionando. Use as rotas /api/'})