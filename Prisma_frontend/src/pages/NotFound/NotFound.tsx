import { Link, useLocation } from "react-router-dom";
import "./NotFound.css";

/**
 * Página 404.
 *
 * Antes a rota curinga (`path="*"`) fazia `<Navigate to="/" replace />`:
 * qualquer URL errada jogava o visitante na home SEM dizer nada. Isso é
 * ruim por dois motivos concretos:
 *
 *  - **Para a pessoa:** um link de e-mail com typo (ex.: o link de
 *    confirmação de cadastro chegando quebrado) largava o usuário na tela
 *    de escolha de perfil, e ele não tinha como saber que o link estava
 *    errado — só que "não funcionou".
 *  - **Para busca:** com `replace` o histórico era reescrito, e o Google
 *    via a home respondendo 200 para toda URL inexistente ("soft 404"),
 *    o que polui o índice.
 *
 * Agora a tela é explícita e oferece a saída certa para cada papel.
 *
 * O título/description desta tela vem de `routes/metaPorRota.ts`
 * (`META_PADRAO`), aplicado pelo `<RouteMeta />` — não daqui.
 */
export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <main className="notfound-page">
      <div className="notfound-card">
        <p className="notfound-code">404</p>
        <h1>Página não encontrada</h1>

        <p className="notfound-text">
          O endereço <code className="notfound-path">{pathname}</code> não
          existe no PRISMA. Ele pode ter sido digitado errado, ou o link que
          você seguiu está desatualizado.
        </p>

        <div className="notfound-actions">
          <Link to="/" className="notfound-btn notfound-btn--primary">
            Ir para a página inicial
          </Link>
          <Link to="/login" className="notfound-btn">
            Entrar na minha conta
          </Link>
        </div>

        <p className="notfound-help">
          Se o link veio de um e-mail do PRISMA (confirmação de cadastro ou
          recuperação de senha), peça um novo código em{" "}
          <Link to="/confirmar-cadastro">confirmar cadastro</Link> ou{" "}
          <Link to="/esqueci-senha">esqueci minha senha</Link>.
        </p>
      </div>
    </main>
  );
}
