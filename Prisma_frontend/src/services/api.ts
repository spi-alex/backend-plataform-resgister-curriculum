import axios from "axios";
import {
  AUTH_USER_KEY,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./authToken";

/**
 * Origem (protocolo + host + porta) do backend, SEM o sufixo `/api/`.
 *
 * Existe por causa do captcha: o django-simple-captcha é servido em
 * `/captcha/`, fora do prefixo `/api/` do resto do projeto, então as telas
 * de cadastro precisam montar essa URL na mão.
 *
 * Antes as duas telas de cadastro escreviam `http://127.0.0.1:8000` FIXO no
 * código-fonte. Em produção isso quebra o cadastro por completo:
 *
 *   - `127.0.0.1` é a máquina de quem está navegando, não o servidor: a
 *     imagem do captcha simplesmente não carrega;
 *   - o esquema é `http://` — uma página servida por HTTPS tem esse pedido
 *     BLOQUEADO pelo navegador como conteúdo misto, sem nem chegar à rede.
 *
 * Derivando de `VITE_API_URL` (a mesma variável que o axios já usa), a URL
 * acompanha o ambiente automaticamente.
 */
export const BACKEND_ORIGIN = (() => {
  const apiUrl = import.meta.env.VITE_API_URL;

  try {
    // `new URL` resolve relativo à página quando VITE_API_URL é um caminho
    // (ex.: "/api/" atrás de um reverse proxy no mesmo domínio).
    return new URL(apiUrl, window.location.origin).origin;
  } catch {
    // VITE_API_URL ausente ou malformada: cai para a própria origem, que é
    // o certo no cenário de front e back servidos pelo mesmo domínio.
    return window.location.origin;
  }
})();

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Necessário para o navegador enviar o cookie httpOnly do refresh token
  // junto das requisições. Sem isto o cookie é gravado no login mas nunca
  // reenviado, e a renovação de sessão nunca funcionaria.
  withCredentials: true,
});

// Rotas que nunca devem levar o cabeçalho Authorization: um token velho ou
// inválido pendurado num login/cadastro só atrapalha.
const ROTAS_PUBLICAS = [
  "users/register/",
  "users/confirm/",
  "users/login/",
  "users/password-reset/",
  "users/password-reset-confirm/",
  "captcha/refresh/",
  "users/token/refresh/",
];

api.interceptors.request.use((config) => {
  // O token vem da memória, não mais de localStorage (ver authToken.ts).
  const token = getAccessToken();

  const isPublicRoute = ROTAS_PUBLICAS.some((route) =>
    config.url?.includes(route),
  );

  if (token && !isPublicRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Renovação de sessão.
 *
 * A promessa é compartilhada de propósito: se várias requisições tomarem 401
 * ao mesmo tempo (dashboard que dispara 4 chamadas em paralelo, por exemplo),
 * todas esperam o MESMO refresh em vez de dispararem quatro renovações
 * concorrentes — que, além de desperdício, embaralhariam o cookie.
 */
let refreshEmAndamento: Promise<string> | null = null;

export function renovarSessao(): Promise<string> {
  if (!refreshEmAndamento) {
    refreshEmAndamento = axios
      .post(
        `${import.meta.env.VITE_API_URL}users/token/refresh/`,
        {},
        { withCredentials: true },
      )
      .then((response) => {
        const access = response.data?.access;
        if (!access) throw new Error("Refresh sem access token");
        setAccessToken(access);
        return access as string;
      })
      .finally(() => {
        refreshEmAndamento = null;
      });
  }
  return refreshEmAndamento;
}

function encerrarSessaoLocal() {
  clearAccessToken();
  localStorage.removeItem(AUTH_USER_KEY);
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const ehRotaDeSessao =
      originalRequest?.url?.includes("users/login/") ||
      originalRequest?.url?.includes("users/token/refresh/");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !ehRotaDeSessao
    ) {
      originalRequest._retry = true;

      try {
        const access = await renovarSessao();
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // O refresh falhou de verdade: o cookie expirou, foi revogado
        // (logout/troca de senha) ou nunca existiu.
        console.error("Sessão expirada. Redirecionando...");
        encerrarSessaoLocal();
        window.location.replace("/login");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
