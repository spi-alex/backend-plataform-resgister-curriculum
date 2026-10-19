import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, GraduationCap, LineChart } from "lucide-react";
import "./initial.css";

/* =========================================================================
   HOME (rota "/") — primeira tela do PRISMA.

   É a porta de entrada do site: quem chega aqui ou vem de um link
   institucional, ou está procurando onde entrar. Por isso a tela responde,
   nesta ordem, a três perguntas:

     1. "que site é este?"        -> marca + título + linha de apoio
     2. "isto serve para mim?"    -> os três perfis, cada um dizendo o que
                                     faz aqui (antes eram só três rótulos
                                     soltos: "Estudante", "Empresa",
                                     "Gestor", sem nenhum contexto)
     3. "por onde eu entro?"      -> o próprio cartão do perfil leva ao
                                     login, e o rodapé do bloco leva ao
                                     cadastro

   O `state.userType` continua sendo enviado ao /login para o dia em que a
   tela de login quiser pré-ajustar o texto ao perfil escolhido. Hoje ela
   não lê esse estado — quem define o destino após entrar é o `role` que
   vem do backend, e não a escolha feita aqui.
   ========================================================================= */

type Perfil = {
  /** Repassado ao /login via `state`; ver observação acima. */
  userType: string;
  titulo: string;
  descricao: string;
  icone: ReactNode;
};

const PERFIS: Perfil[] = [
  {
    userType: "student",
    titulo: "Estudante / Egresso",
    descricao: "Monte seu currículo, candidate-se às vagas e acompanhe cada resposta.",
    icone: <GraduationCap aria-hidden="true" />,
  },
  {
    userType: "company",
    titulo: "Empresa",
    descricao: "Publique vagas e analise os candidatos da instituição num só lugar.",
    icone: <Building2 aria-hidden="true" />,
  },
  {
    userType: "manager",
    titulo: "Gestor",
    descricao: "Acompanhe currículos, vagas e indicadores de empregabilidade.",
    icone: <LineChart aria-hidden="true" />,
  },
];

/** Marca do PRISMA — o mesmo desenho do favicon, inline para não custar
 *  uma requisição extra logo no primeiro paint da home. */
function MarcaPrisma() {
  return (
    <svg
      className="home__logo"
      viewBox="0 0 64 64"
      role="img"
      aria-label="PRISMA"
      focusable="false"
    >
      <path
        d="M32 14 L50 46 H14 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <rect x="4" y="30.2" width="14" height="3.2" fill="currentColor" opacity="0.55" />
      <rect x="46" y="26.5" width="16" height="2.6" fill="currentColor" />
      <rect x="46" y="31" width="16" height="2.6" fill="currentColor" opacity="0.75" />
      <rect x="46" y="35.5" width="16" height="2.6" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export default function Firstlook() {
  return (
    <main className="home-page">
      {/* Brilho decorativo do fundo. Fora do fluxo e escondido do leitor de
          tela: é enfeite, não conteúdo. */}
      <div className="home__brilho" aria-hidden="true" />

      <div className="home__conteudo">
        <header className="home__hero">
          <MarcaPrisma />
          <h1 className="home__titulo">PRISMA</h1>
          <p className="home__linha-apoio">
            A plataforma que conecta estudantes e egressos às empresas
            parceiras da instituição.
          </p>
        </header>

        <section className="home__painel" aria-labelledby="home-perfis">
          <h2 className="home__painel-titulo" id="home-perfis">
            Selecione seu tipo de usuário
          </h2>

          {/* Lista de verdade (`ul`/`li`): o leitor de tela anuncia
              "lista com 3 itens" e o usuário sabe quantas opções existem
              antes de percorrer uma a uma. */}
          <ul className="home__perfis">
            {PERFIS.map((perfil) => (
              <li key={perfil.userType}>
                <Link
                  to="/login"
                  state={{ userType: perfil.userType }}
                  className="home__perfil"
                >
                  <span className="home__perfil-icone">{perfil.icone}</span>

                  <span className="home__perfil-texto">
                    <span className="home__perfil-titulo">{perfil.titulo}</span>
                    <span className="home__perfil-descricao">
                      {perfil.descricao}
                    </span>
                  </span>

                  <ArrowRight className="home__perfil-seta" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>

          <p className="home__cadastro">
            Ainda não tem cadastro? <Link to="/cadastro">Cadastre-se</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
