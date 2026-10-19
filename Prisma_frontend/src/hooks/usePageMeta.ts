import { useEffect } from "react";

/**
 * Título e meta description por rota.
 *
 * O PRISMA é uma SPA: o `index.html` é servido igual para TODA URL, então
 * sem isto as ~25 rotas compartilhavam um único `<title>` e uma única
 * `description`. Efeitos práticos:
 *
 *  - A aba do navegador dizia "PRISMA — Currículos e vagas..." mesmo em
 *    "Minhas Candidaturas". Com várias abas abertas (uso normal do gestor,
 *    que compara currículos) era impossível saber qual era qual.
 *  - O histórico e os favoritos gravavam todos com o mesmo nome.
 *  - Para busca, as telas públicas (/login, /cadastro) apareciam como
 *    páginas duplicadas — mesmo title, mesma description.
 *
 * Só mexe em tags que já existem no `<head>` ou que ele mesmo cria; não
 * depende de biblioteca externa (react-helmet e afins), que seria um
 * pacote a mais no bundle para resolver três linhas de DOM.
 */

const SUFIXO = "PRISMA";

/** Garante que existe uma `<meta>` com o atributo/valor pedido e devolve. */
function garantirMeta(atributo: "name" | "property", valor: string) {
  const seletor = `meta[${atributo}="${valor}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(seletor);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(atributo, valor);
    document.head.appendChild(tag);
  }

  return tag;
}

export interface PageMeta {
  /** Sem o sufixo: `usePageMeta({ title: "Login" })` vira "Login | PRISMA". */
  title: string;
  description?: string;
  /**
   * Telas que não devem entrar em busca — a área logada inteira e o 404.
   * A `<meta name="robots">` é a segunda camada; a primeira é o
   * `public/robots.txt`, que impede o crawler de chegar até aqui.
   */
  noindex?: boolean;
}

export function usePageMeta({ title, description, noindex = false }: PageMeta) {
  useEffect(() => {
    const anterior = document.title;

    document.title = title ? `${title} | ${SUFIXO}` : SUFIXO;

    if (description) {
      garantirMeta("name", "description").content = description;
      // og:description precisa acompanhar, senão o preview de um link
      // compartilhado descreve a home e não a página aberta.
      garantirMeta("property", "og:description").content = description;
    }

    garantirMeta("property", "og:title").content = document.title;
    garantirMeta("name", "robots").content = noindex
      ? "noindex, nofollow"
      : "index, follow";

    // Canonical acompanha a URL atual: sem isso, toda rota da SPA se
    // declarava canônica como a home.
    const canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (canonical) {
      canonical.href = window.location.origin + window.location.pathname;
    }

    return () => {
      document.title = anterior;
    };
  }, [title, description, noindex]);
}
