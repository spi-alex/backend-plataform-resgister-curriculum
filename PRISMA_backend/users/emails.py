import logging

import resend
from django.conf import settings

logger = logging.getLogger(__name__)

# Configura a chave vinda do settings.py
resend.api_key = getattr(settings, "RESEND_API_KEY", "")


def _mascarar(destinatario):
    """
    Reduz o e-mail a algo identificável sem ser identificante, para o log.

    Antes esta função imprimia o endereço completo em toda chamada
    (`print(f"Sucesso: E-mail enviado para {destinatario}")`). Como todo
    cadastro, login, reset de senha e mudança de status dispara um e-mail,
    o log do servidor virava uma lista de e-mails de todos os usuários da
    plataforma — dado pessoal acumulado sem necessidade, num arquivo que
    costuma ter permissão de leitura muito mais frouxa que o banco.
    """
    endereco = str(destinatario or '')
    usuario, _, dominio = endereco.partition('@')
    if not dominio:
        return '***'
    visivel = usuario[:2] if len(usuario) > 2 else usuario[:1]
    return f"{visivel}***@{dominio}"


def enviar_email_async(assunto, mensagem_texto, destinatario):
    """
    Envia um e-mail transacional pelo Resend.

    O nome tem `async` por herança do código original — a chamada em si é
    síncrona; quem chama é que a coloca numa thread separada
    (`users/views.py::_enviar_em_thread`).
    """
    try:
        corpo_formatado = str(mensagem_texto).replace('\n', '<br>')
        html_final = f"<html><body>{corpo_formatado}</body></html>"

        params = {
            "from": "PRISMA <onboarding@resend.dev>",
            "to": [destinatario],
            "subject": assunto,
            "html": html_final,
        }
        resend.Emails.send(params)
        logger.info("E-mail '%s' enviado para %s", assunto, _mascarar(destinatario))
    except Exception:
        # `logger.exception` grava o traceback no log do servidor. O conteúdo
        # da mensagem (que carrega o código de confirmação/reset) fica de
        # fora de propósito.
        logger.exception("Falha ao enviar e-mail para %s", _mascarar(destinatario))
