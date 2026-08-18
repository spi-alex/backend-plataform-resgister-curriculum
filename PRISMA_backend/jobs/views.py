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
        # BUG CORRIGIDO: só aceitava role=='candidate'. Quem se cadastra
        # informando "situação = aluno" (StudentRegistration.tsx) recebe
        # role='aluno', não 'candidate' — com a checagem antiga, esse aluno
        # tomava 403 ao tentar se candidatar a qualquer vaga.
        return bool(
            request.user and request.user.is_authenticated and
            getattr(request.user, 'role', '') in ['candidate', 'aluno']
        )

class IsGestor(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and
            (getattr(user, 'role', '') == 'gestor' or user.is_staff or user.is_superuser)
        )

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
        if self.action in ['apply', 'my_applications']:
            return [IsCandidate()]
        if self.action == 'submit_resumes':
            return [IsGestor()]
        return [permissions.IsAuthenticatedOrReadOnly()]

    # BLINDAGEM 1: Apenas o dono da empresa pode editar/deletar suas próprias vagas é a regra de negocio
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Se o usuário não estiver logado, manda a lista padrão (útil para listagens públicas)
        if not user or user.is_anonymous:
            return queryset.filter(is_active=True)

        # BLINDAGEM MESTRA: Se for uma Empresa, ela SÓ visualiza, edita e deleta as vagas DELA MESMAA
        if getattr(user, 'role', '') == 'company':
            return queryset.filter(company__owner=user)

        # Aluno/Candidato só pode ver e se candidatar a vagas ativas.
        # Mesmo bug do IsCandidate: faltava 'aluno' aqui, então um usuário
        # com esse role caía no "return queryset" genérico lá embaixo e via
        # até vagas encerradas de outras empresas na própria listagem.
        if getattr(user, 'role', '') in ['candidate', 'aluno']:
            # Exceção: ao abrir o DETALHE de uma vaga específica (usado por
            # "Minhas Candidaturas" -> "Ver vaga"), o aluno continua
            # enxergando a vaga mesmo que a empresa já tenha encerrado —
            # sem isto, uma vaga fechada depois da candidatura virava um
            # "Vaga não encontrada" para quem já tinha se candidatado a ela.
            # A listagem (`list`) continua só com vagas ativas.
            if self.action == 'retrieve':
                return queryset.filter(
                    Q(is_active=True) | Q(applications__resume__user=user)
                ).distinct()
            return queryset.filter(is_active=True)
        # Gestor/Admin acompanham TODAS as vagas, incluindo encerradas
        if getattr(user, 'role', '') in ['admin', 'gestor']:
            return queryset

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

    # --- MINHAS CANDIDATURAS (ALUNO/CANDIDATO) ---
    # O backend já guardava o status de cada candidatura (PENDENTE, ANALISE,
    # ENTREVISTA, APROVADO, REPROVADO) e disparava e-mail quando ele mudava,
    # mas não existia nenhuma rota para o próprio aluno consultar isso —
    # ele nunca sabia, dentro do sistema, como suas candidaturas estavam.
    @action(detail=False, methods=['get'], url_path='my-applications')
    def my_applications(self, request):
        from resumes.models import Resume

        resume = Resume.objects.filter(user=request.user).first()
        if not resume:
            return Response([])

        applications = Application.objects.filter(resume=resume).select_related('job', 'job__company')
        serializer = ApplicationSerializer(applications, many=True, context={'request': request})
        return Response(serializer.data)

    # --- SUBMETER CURRÍCULOS PARA UMA VAGA (GESTOR) ---
    # Funcionalidade descrita nas seções 4.3 e 5.6.2 do documento de
    # funcionalidades ("submeter currículos de alunos para vagas... enviar
    # múltiplos currículos simultaneamente") e que não existia no backend.
    #
    # O gestor já navega pelos currículos cadastrados na plataforma (tela
    # de Currículos, endpoint `users/gestor/resumes/`); aqui ele escolhe
    # um ou mais desses currículos e uma vaga, e o sistema registra a
    # candidatura em nome do aluno — o mesmo efeito de "encaminhar
    # candidatos diretamente para oportunidades disponíveis" que o
    # documento descreve.
    @action(detail=True, methods=['post'], url_path='submit-resumes')
    def submit_resumes(self, request, pk=None):
        from resumes.models import Resume

        job = self.get_object()
        resume_ids = request.data.get('resume_ids', [])

        if not isinstance(resume_ids, list) or not resume_ids:
            return Response(
                {"error": "Informe ao menos um currículo em 'resume_ids'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resumes = {r.id: r for r in Resume.objects.filter(id__in=resume_ids)}

        enviados, ja_candidatados, nao_encontrados = [], [], []
        for resume_id in resume_ids:
            resume = resumes.get(resume_id)
            if not resume:
                nao_encontrados.append(resume_id)
                continue

            application, created = Application.objects.get_or_create(job=job, resume=resume)
            (enviados if created else ja_candidatados).append(resume_id)

        return Response({
            "message": f"{len(enviados)} currículo(s) submetido(s) para a vaga '{job.title}'.",
            "enviados": enviados,
            "ja_candidatados": ja_candidatados,
            "nao_encontrados": nao_encontrados,
        }, status=status.HTTP_200_OK)