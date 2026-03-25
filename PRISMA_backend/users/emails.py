import resend
from django.conf import settings

# Configura a chave vinda do settings.py
resend.api_key = getattr(settings, "RESEND_API_KEY", "")

def enviar_email_async(assunto, mensagem_texto, destinatario):
    """
    ESTA É A ÚNICA FUNÇÃO NECESSÁRIA.
    Ela limpa o texto e envia via Resend em segundo plano.
    """
    try:
        # Resolve o erro do Python 3.11 (processa o \n fora da f-string)
        corpo_formatado = mensagem_texto.replace('\n', '<br>')
        
        # Monta o HTML final de forma limpa
        html_final = f"<html><body>{corpo_formatado}</body></html>"
        
        params = {
            "from": "PRISMA <onboarding@resend.dev>",
            "to": [destinatario],
            "subject": assunto,
            "html": html_final,
        }
        resend.Emails.send(params)
        print(f"Sucesso: E-mail enviado para {destinatario}")
    except Exception as e:
        print(f"Erro no Resend: {e}")
        print(f"--- ERRO NO RESEND ---")
        print(f"Tipo do erro: {type(e)}")
        print(f"Detalhes: {e}")
        print(f"-----------------------")