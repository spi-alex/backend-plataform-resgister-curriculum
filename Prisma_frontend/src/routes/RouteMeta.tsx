import { matchPath, useLocation } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { META_PADRAO, META_POR_ROTA } from "./metaPorRota";

/**
 * Aplica o título/description da rota atual.
 *
 * Montado UMA vez dentro do `<BrowserRouter>` (ver AppRoutes), em vez de
 * chamar `usePageMeta` em cada página. Reage a `useLocation`, então cobre
 * também navegação por `navigate()` — que é como quase toda transição do
 * app acontece.
 */
export function RouteMeta() {
  const { pathname } = useLocation();

  // Casamento exato primeiro (mais barato e cobre a maioria); só então
  // percorre os padrões com parâmetro (`/vagas/:id`). Sem o `end: true` do
  // matchPath, `/dashboard/aluno` casaria com qualquer sub-rota e toda tela
  // do aluno herdaria o título "Início — Aluno".
  const meta =
    META_POR_ROTA[pathname] ??
    Object.entries(META_POR_ROTA).find(([padrao]) =>
      padrao.includes(":") ? matchPath({ path: padrao, end: true }, pathname) : false,
    )?.[1] ??
    META_PADRAO;

  usePageMeta(meta);

  return null;
}
