from rest_framework import serializers
from .models import Job, Application

class ApplicationSerializer(serializers.ModelSerializer):
    # Melhoria: Tenta pegar o nome completo, se estiver vazio, usa o username
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.ReadOnlyField(source='resume.user.email')
    job_title = serializers.ReadOnlyField(source='job.title')
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    # Campo do PDF
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'job', 'job_title', 'resume', 'status',
            'status_label', 'candidate_name', 'candidate_email', 
            'pdf_url', 'applied_at'
        ]

        read_only_fields = ['applied_at']
        
    def get_candidate_name(self, obj):
        user = obj.resume.user
        full_name = user.get_full_name()
        return full_name if full_name else user.username

    def get_pdf_url(self, obj):
        request = self.context.get('request')
        if obj.resume and request:
            return request.build_absolute_uri(f'/api/pdf/export/{obj.resume.id}/')
        return None

class JobSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_website = serializers.ReadOnlyField(source='company.website')
    contact_email = serializers.ReadOnlyField(source='company.owner.email') 
    created_at = serializers.DateTimeField(format="%d/%m/%Y", read_only=True)

    class Meta:
        model = Job
        fields = [
            'id', 'company_name', 'company_website', 
            'contact_email', 'title', 'description', 
            'requirements', 'salary', 'is_active', 'created_at'
        ]
# ... (código anterior)

    def validate(self, data):
        user = self.context['request'].user
        if not hasattr(user, 'company'):
            raise serializers.ValidationError(
            "Você precisa cadastrar sua Empresa antes de publicar uma vaga."
        )
        return data

