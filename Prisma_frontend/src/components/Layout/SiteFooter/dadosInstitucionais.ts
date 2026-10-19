/**
 * Dados institucionais exibidos no rodapé das páginas públicas.
 *
 * ⚠️ PREENCHER ANTES DE PUBLICAR. Os valores abaixo são placeholders
 * deliberadamente visíveis ("[PREENCHER: ...]") para que ninguém suba o
 * site com eles por engano — um rodapé com dado inventado é pior que
 * rodapé nenhum, porque parece verdadeiro.
 *
 * Por que isto importa e não é só enfeite:
 *
 *  - **LGPD (Lei 13.709/2018), art. 41:** o controlador de dados precisa
 *    indicar quem é o encarregado (DPO) e um canal de contato. O PRISMA
 *    guarda CPF, endereço e currículo completo de alunos — é tratamento de
 *    dado pessoal em cheio.
 *  - **Marco Civil da Internet, art. 7º:** o usuário tem direito a
 *    informação clara sobre coleta e uso dos seus dados.
 *  - **Confiança:** uma tela que pede CPF sem dizer de quem é o site é o
 *    padrão visual de página de phishing.
 *
 * `null` em qualquer campo opcional simplesmente omite aquela linha.
 */
export const DADOS_INSTITUCIONAIS = {
  /** Nome da instituição mantenedora, como consta no registro. */
  instituicao: "[PREENCHER: nome da instituição]",

  /** CNPJ da mantenedora. Deixe `null` se não se aplicar. */
  cnpj: "[PREENCHER: 00.000.000/0000-00]" as string | null,

  /** Endereço físico (rua, número, bairro, cidade/UF). */
  endereco: "[PREENCHER: endereço, cidade/UF]" as string | null,

  /** E-mail de suporte ao usuário do sistema. */
  emailSuporte: "[PREENCHER: suporte@instituicao.br]",

  /**
   * Canal do encarregado de dados (DPO) exigido pela LGPD. Pode ser o mesmo
   * e-mail do suporte, mas precisa estar declarado.
   */
  emailEncarregadoLgpd: "[PREENCHER: dpo@instituicao.br]",

  /** Telefone/WhatsApp de contato. `null` esconde a linha. */
  telefone: null as string | null,

  /**
   * WhatsApp em formato internacional só com dígitos (ex.: "5585999998888").
   * Quando preenchido, o rodapé mostra um link `https://wa.me/...`.
   * `null` esconde o link — é o padrão, porque um link de WhatsApp quebrado
   * é um dos itens que mais aparecem em site recém-publicado.
   */
  whatsapp: null as string | null,

  /** Mensagem pré-preenchida ao abrir o WhatsApp. */
  whatsappMensagem: "Olá! Preciso de ajuda com o PRISMA.",
} as const;

/** Monta o link do WhatsApp, ou `null` se o número não foi configurado. */
export function linkWhatsApp(): string | null {
  const { whatsapp, whatsappMensagem } = DADOS_INSTITUCIONAIS;

  if (!whatsapp) return null;

  // Só dígitos: `wa.me` rejeita número com espaço, parêntese ou "+".
  const numero = whatsapp.replace(/\D/g, "");
  if (numero.length < 12) return null; // 55 + DDD + 9 dígitos

  return `https://wa.me/${numero}?text=${encodeURIComponent(whatsappMensagem)}`;
}

/** `true` enquanto os placeholders não foram trocados. */
export function temPlaceholderPendente(): boolean {
  return Object.values(DADOS_INSTITUCIONAIS).some(
    (v) => typeof v === "string" && v.includes("[PREENCHER"),
  );
}
