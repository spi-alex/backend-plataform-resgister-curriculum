// Espelho, no cliente, da política de senha do Django
// (AUTH_PASSWORD_VALIDATORS em PRISMA_backend/core/settings.py).
//
// O objetivo aqui é só dar retorno imediato no formulário: o backend
// continua sendo a autoridade e reprova o que passar daqui. Por isso o
// "senha muito comum" (CommonPasswordValidator) NÃO é checado no cliente —
// a lista do Django tem 20 mil entradas e não vale o download; esse caso
// chega como erro da API e é exibido pelo `catch` das telas de cadastro.

export const SENHA_TAMANHO_MINIMO = 10;

/**
 * Devolve a mensagem de erro da senha, ou `null` quando ela passa nas
 * regras verificáveis no cliente.
 */
export function validarSenha(senha: string): string | null {
  if (!senha) return "Senha obrigatória";

  // MinimumLengthValidator (OPTIONS.min_length = 10)
  if (senha.length < SENHA_TAMANHO_MINIMO) {
    return `A senha precisa ter pelo menos ${SENHA_TAMANHO_MINIMO} caracteres`;
  }

  // NumericPasswordValidator
  if (/^\d+$/.test(senha)) {
    return "A senha não pode ser apenas números";
  }

  return null;
}

/** Texto de apoio exibido abaixo do campo, antes de qualquer erro. */
export const DICA_SENHA = `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres, não pode ser só números nem uma senha comum.`;
