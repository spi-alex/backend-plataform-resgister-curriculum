from rest_framework import serializers
from .models import Resume

class ResumeSerializer(serializers.ModelSerializer):
    # Campo novo: Gera o link dinâmico para o PDF
    pdf_url = serializers.SerializerMethodField()

    user_name = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Resume
        # '__all__' inclui todos os campos do modelo + o campo pdf_url que criamos acima
        fields = '__all__'
        
        # O usuário é preenchido automaticamente pelo token
        read_only_fields = ['user', 'created_at']

    def get_pdf_url(self, obj):
        # Pega o request para montar a URL completa (http://localhost...)
        request = self.context.get('request')
        if request and obj.id:
            return request.build_absolute_uri(f'/api/pdf/export/{obj.id}/')
        return None