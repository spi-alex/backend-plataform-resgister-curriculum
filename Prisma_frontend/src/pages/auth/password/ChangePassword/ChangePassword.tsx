import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";
import api from "../../../../services/api";
import { useAuth } from "../../../../context/Authcontext";
import { mensagemErroApi } from "../../../../utils/apiError";
import { validarSenha, DICA_SENHA } from "../../../../utils/senha";
import "./ChangePassword.css";

/**
 * Troca de senha do usuário LOGADO.
 *
 * Até aqui o PRISMA só tinha o fluxo de recuperação por e-mail, que é
 * desenhado para quem PERDEU o acesso. Quem estava dentro do sistema
 * precisava deslogar, clicar em "esqueci minha senha", abrir a caixa de
 * e-mail e digitar um código de 6 dígitos — e quem tivesse perdido o acesso
 * ao e-mail não conseguia trocar de jeito nenhum.
 *
 * A senha atual é pedida de propósito: sem ela, uma sessão deixada aberta
 * num computador compartilhado bastaria para tomar a conta em definitivo.
 */
export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErro("");

    if (nova !== confirmacao) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }

    if (nova === atual) {
      setErro("A nova senha precisa ser diferente da senha atual.");
      return;
    }

    // Mesma política do backend (utils/senha.ts): responde na hora, sem
    // gastar uma das 5 tentativas por minuto do throttle da rota.
    const erroSenha = validarSenha(nova);
    if (erroSenha) {
      setErro(erroSenha + ".");
      return;
    }

    setLoading(true);
    try {
      await api.post("users/change-password/", {
        current_password: atual,
        new_password: nova,
      });

      // Trocar a senha revoga TODAS as sessões no servidor, inclusive esta —
      // a revogação é por marca de tempo, então não há como poupar a sessão
      // atual sem poupar as outras. Avisamos e mandamos entrar de novo.
      setSucesso(true);
      setTimeout(logout, 2500);
    } catch (err) {
      setErro(
        mensagemErroApi(err, "Não foi possível alterar a senha. Tente novamente."),
      );
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="senha-page">
        <div className="senha-card">
          <h1>Senha alterada</h1>
          <p className="senha-sucesso">
            Sua senha foi alterada com sucesso. Todas as sessões abertas foram
            encerradas por segurança — inclusive esta.
          </p>
          <p className="senha-ajuda">Levando você para o login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="senha-page">
      <div className="senha-card">
        <h1>Alterar senha</h1>
        <p className="senha-ajuda">
          Por segurança, confirme a senha atual antes de definir a nova.
        </p>

        {erro && <p className="senha-erro">{erro}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="campo">
            <Input
              label="Senha atual"
              name="senha-atual"
              type="password"
              placeholder="Digite sua senha atual"
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="campo">
            <Input
              label="Nova senha"
              name="nova-senha"
              type="password"
              placeholder="Digite a nova senha"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              /* `new-password` faz o navegador oferecer GERAR uma senha
                 forte em vez de preencher a antiga. */
              autoComplete="new-password"
            />
          </div>

          <div className="campo">
            <Input
              label="Confirme a nova senha"
              name="confirmar-senha"
              type="password"
              placeholder="Repita a nova senha"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="new-password"
            />
            <small className="dica-senha">{DICA_SENHA}</small>
          </div>

          <div className="senha-acoes">
            <Button
              title={loading ? "Alterando..." : "Alterar senha"}
              type="submit"
              disabled={!atual || !nova || !confirmacao || loading}
            />
            <button
              type="button"
              className="senha-voltar"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>

        <p className="senha-ajuda">
          Esqueceu a senha atual? Saia da conta e use{" "}
          <strong>“Esqueci minha senha”</strong> na tela de login.
        </p>
      </div>
    </div>
  );
}
