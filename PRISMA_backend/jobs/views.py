from rest_framework import viewsets, status, permissions, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from django.db.models import Count, Q
from django.core.mail import send_mail

from .models import Job, Application
from .serializers import JobSerializer, ApplicationSerializer

# --- PERMISSÕES CUSTOMIZADAS ---

class IsCompany(BasePermission):
    def has_permission(self, request, view):
        print(f"DEBUG: Usuário {request.user.email} tem role: {getattr(request.user, 'role', 'NÃO ENCONTRADO')}")
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', '') == 'company')

class IsCandidate(BasePermission):
    def has_permission(self, request, view):
        print(f"DEBUG: Usuário {request.user.email} tem role: {getattr(request.user, 'role', 'NÃO ENCONTRADO')}")
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', '') == 'candidate')

# --------------------------------------------------------------------------

class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.all().order_by('-created_at')
    serializer_class = JobSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['is_active', 'company'] 
    search_fields = ['title', 'description', 'requirements'] 
    ordering_fields = ['salary', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'update_status', 'dashboard', 'candidates']:
            return [IsCompany()]
        if self.action == 'apply':
            return [IsCandidate()]
        return [permissions.IsAuthenticatedOrReadOnly()]

    # BLINDAGEM 1: Apenas o dono da empresa pode editar/deletar suas próprias vagas
    def get_queryset(self):
        queryset = super().get_queryset()
        # Se for uma ação de escrita (edit/delete), filtramos para garantir que pertence ao usuário
        if self.action in ['update', 'partial_update', 'destroy']:
            return queryset.filter(company__owner=self.request.user)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, 'company'):
            raise ValidationError({"error": "Perfil de empresa não encontrado."})
        serializer.save(company=user.company)

    # --- DASHBOARD ---
    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        user = request.user
        # BLINDAGEM 2: Garantir que as estatísticas são APENAS da empresa logada
        company = getattr(user, 'company', None)
        if not company:
            return Response({"error": "Perfil de empresa não encontrado."}, status=403)

        vagas_empresa = Job.objects.filter(company=company)
        total_vagas = vagas_empresa.count()
        vagas_ativas = vagas_empresa.filter(is_active=True).count()
        
        applications = Application.objects.filter(job__in=vagas_empresa)
        total_candidaturas = applications.count()
        
        status_counts = applications.values('status').annotate(total=Count('status'))
        funil = {key: 0 for key, label in Application.STATUS_CHOICES}
        for item in status_counts:
            funil[item['status']] = item['total']

        return Response({
            "empresa": company.name,
            "estatisticas": {
                "total_vagas": total_vagas,
                "vagas_ativas": vagas_ativas,
                "total_candidaturas": total_candidaturas,
            },
            "funil_de_recrutamento": funil
        })

    # --- LISTAR CANDIDATOS ---
    @action(detail=True, methods=['get'])
    def candidates(self, request, pk=None):
        job = self.get_object()
        
        # BLINDAGEM 3: Impedir que Empresa A veja candidatos da vaga da Empresa B
        if job.company.owner != request.user and not request.user.is_staff:
            raise PermissionDenied("Você não tem permissão para acessar os candidatos desta vaga.")
            
        applications = job.applications.all()
        search_query = request.query_params.get('search', None)
        if search_query:
            applications = applications.filter(
                Q(resume__summary__icontains=search_query) | 
                Q(resume__skills__icontains=search_query)
            )
            
        serializer = ApplicationSerializer(applications, many=True, context={'request': request})
        return Response({
            "vaga": job.title,
            "total_encontrado": applications.count(),
            "candidatos": serializer.data
        })

    # --- ATUALIZAR STATUS ---
    @action(detail=True, methods=['patch'], url_path='update-status/(?P<app_id>\d+)')
    def update_status(self, request, pk=None, app_id=None):
        job = self.get_object()

        # BLINDAGEM 4: Apenas o dono da vaga altera o status do candidato
        if job.company.owner != request.user and not request.user.is_staff:
            return Response({"error": "Acesso negado."}, status=403)

        try:
            application = job.applications.get(id=app_id)
        except Application.DoesNotExist:
            return Response({"error": "Candidatura não encontrada para esta vaga."}, status=404)

        novo_status = request.data.get('status')
        if not novo_status or novo_status not in [c[0] for c in Application.STATUS_CHOICES]:
            return Response({"error": "Status inválido."}, status=400)

        application.status = novo_status
        application.save()

        # Envio de e-mail (Seguro)
        try:
            subject = f"Atualização: Sua candidatura para {job.title}"
            destinatario = getattr(application.resume, 'contact_email', application.resume.user.email)
            message = f"Olá!\n\nO status da sua candidatura para '{job.title}' foi atualizado para: {application.get_status_display()}."
            send_mail(subject, message, "noreply@prisma.com", [destinatario], fail_silently=True)
        except Exception as e:
            print(f"Erro e-mail: {e}")

        return Response({"message": "Status atualizado!", "novo_status": application.get_status_display()})

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        job = self.get_object()
        user = request.user
        
        # 1. Tenta buscar o currículo de forma segura
        # Primeiro tenta pelo atributo direto 'resume', depois tenta buscar no banco
        resume = None
        
        if hasattr(user, 'resume'):
            resume = user.resume
        else:
            # Importamos o modelo Resume aqui dentro para evitar importação circular
            from resumes.models import Resume
            resume = Resume.objects.filter(user=user).first()

        # 2. SE NÃO EXISTIR CURRÍCULO: Retornamos 400 (Erro amigável) em vez de travar
        if not resume:
            return Response(
                {"error": "Você precisa criar um currículo antes de se candidatar."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Registra a candidatura (get_or_create evita duplicidade)
        application, created = Application.objects.get_or_create(job=job, resume=resume)
        
        if not created:
            return Response({"message": "Você já está inscrito nesta vaga."}, status=status.HTTP_200_OK)

        return Response({"message": "Candidatura enviada com sucesso!"}, status=status.HTTP_201_CREATED)