import { useLocation } from "react-router-dom";
import {
  DADOS_INSTITUCIONAIS as D,
  linkWhatsApp,
  temPlaceholderPendente,
} from "./dadosInstitucionais";
import "./SiteFooter.css";

/**
 * Rodapé das páginas PÚBLICAS.
 *
 * Só aparece fora de `/dashboard/*`: dentro da área logada o usuário já
 * está identificado e cada dashboard tem seu próprio layout com sidebar —
 * um rodapé institucional ali só empurraria a tabela de vagas para baixo.
 *
 * Sobre cookies/LGPD: o PRISMA **não** usa cookie de rastreamento nem de
 * publicidade. O único cookie é o `refresh_token` (httpOnly), que é
 * estritamente necessário para manter a sessão — e cookie estritamente
 * necessário está dispensado de banner de consentimento. O que a LGPD
 * exige e é o que está aqui: dizer com clareza o que é coletado e como
 * falar com o encarregado. Se um dia o Google Analytics entrar no projeto,
 * aí sim passa a ser preciso um banner com consentimento ANTES de carregar
 * o script.
 */
const ROTAS_SEM_RODAPE = ["/dashboard"];

export function SiteFooter() {
  const { pathname } = useLocation();

  if (ROTAS_SEM_RODAPE.some((prefixo) => pathname.startsWith(prefixo))) {
    return null;
  }

  const whatsapp = linkWhatsApp();
  const ano = new Date().getFullYear();

  return (
    <footer className="site-footer">
      {/* Aviso em tempo de desenvolvimento. `import.meta.env.DEV` é
          substituído por `false` no build de produção, então o bloco é
          removido pelo tree-shaking e nunca chega ao usuário final —
          serve para ninguém esquecer de preencher os dados. */}
      {import.meta.env.DEV && temPlaceholderPendente() && (
        <p className="site-footer__aviso-dev">
          ⚠️ Rodapé com dados de placeholder. Preencha
          <code> src/components/Layout/SiteFooter/dadosInstitucionais.ts </code>
          antes de publicar.
        </p>
      )}

      <div className="site-footer__grid">
        <div className="site-footer__bloco">
          <p className="site-footer__titulo">{D.instituicao}</p>
          {D.cnpj && <p>CNPJ {D.cnpj}</p>}
          {D.endereco && <p>{D.endereco}</p>}
        </div>

        <div className="site-footer__bloco">
          <p className="site-footer__titulo">Contato</p>
          <p>
            <a href={`mailto:${D.emailSuporte}`}>{D.emailSuporte}</a>
          </p>
          {D.telefone && (
            <p>
              {/* `tel:` abre o discador direto no celular. */}
              <a href={`tel:${D.telefone.replace(/\D/g, "")}`}>{D.telefone}</a>
            </p>
          )}
          {whatsapp && (
            <p>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                Falar no WhatsApp
              </a>
            </p>
          )}
        </div>

        <div className="site-footer__bloco">
          <p className="site-footer__titulo">Privacidade</p>
          <p>
            O PRISMA trata dados pessoais de estudantes (nome, CPF, endereço e
            currículo) com a finalidade exclusiva de intermediar candidaturas
            a vagas.
          </p>
          <p>
            Encarregado de dados (LGPD):{" "}
            <a href={`mailto:${D.emailEncarregadoLgpd}`}>
              {D.emailEncarregadoLgpd}
            </a>
          </p>
          <p className="site-footer__cookies">
            Usamos apenas um cookie estritamente necessário para manter você
            conectado. Não há cookies de publicidade ou rastreamento.
          </p>
        </div>
      </div>

      <p className="site-footer__creditos">
        © {ano} {D.instituicao} — PRISMA
      </p>
    </footer>
  );
}
