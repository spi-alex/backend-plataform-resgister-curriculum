// Extração da mensagem de erro que o backend realmente mandou.
//
// As views do PRISMA respondem com `{"error": "..."}` (users/views.py) e o
// DRF, em falhas de serializer/permissão, usa `{"detail": "..."}` ou
// `{"campo": ["mensagem"]}`. As telas de cadastro ignoravam tudo isso e
// mostravam um texto fixo sobre captcha/dados duplicados — então quem
// esbarrava na política de senha ("Esta senha é muito curta...") lia uma
// mensagem que não tinha relação nenhuma com o problema e ficava preso.

interface RespostaErro {
  response?: {
    data?: unknown;
  };
}

/**
 * Devolve a mensagem do backend, ou `padrao` quando a resposta não traz
 * nenhum texto aproveitável (erro de rede, 500 sem corpo, etc.).
 */
export function mensagemErroApi(erro: unknown, padrao: string): string {
  const dados = (erro as RespostaErro)?.response?.data;

  if (!dados) return padrao;
  if (typeof dados === "string") return dados || padrao;
  if (typeof dados !== "object") return padrao;

  const corpo = dados as Record<string, unknown>;

  // `error` e `detail` primeiro: é o formato das mensagens escritas à mão.
  for (const chave of ["error", "detail"]) {
    const valor = corpo[chave];
    if (typeof valor === "string" && valor.trim()) return valor;
    if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
  }

  // Senão, erros por campo do DRF: `{"captcha_1": ["Código inválido"]}`.
  for (const valor of Object.values(corpo)) {
    if (typeof valor === "string" && valor.trim()) return valor;
    if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
  }

  return padrao;
}
