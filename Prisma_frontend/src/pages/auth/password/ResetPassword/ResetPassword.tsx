import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";
import api from "../../../../services/api";
import { validarSenha, DICA_SENHA } from "../../../../utils/senha";
import "./ResetPassword.css";

// Interface para tipagem rigorosa do erro da API
interface DjangoError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

// Mesma checagem de RequestReset.tsx — só para não enviar um e-mail
// obviamente malformado; quem valida de verdade é o backend.
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  // O e-mail chega pelo state da rota, vindo de /esqueci-senha. Só que
  // esse state não sobrevive a um F5, a um link salvo nem a voltar pelo
  // histórico com a aba já fechada — e antes, nesses casos, a tela ficava
  // com o e-mail vazio SEM avisar: o texto "Alterando senha para:" saía em
  // branco e o botão continuava habilitado. A pessoa digitava o código
  // certo, enviava, e recebia "Código inválido, expirado ou e-mail
  // incorreto" — mensagem propositalmente genérica no backend (não vaza
  // quais e-mails existem), que aqui apontava para o lugar errado. O ciclo
  // se repetia indefinidamente.
  //
  // Quando não há e-mail no state, pedimos ele aqui em vez de redirecionar:
  // quem recarregou a página já recebeu o código por e-mail, e mandar de
  // volta para /esqueci-senha emitiria um código novo, invalidando o que
  // a pessoa tem em mãos.
  const emailDaRota: string = location.state?.email || "";
  const [emailDigitado, setEmailDigitado] = useState("");
  const userEmail = emailDaRota || emailDigitado.trim();

  const [pin, setPin] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  // `onSubmit` do <form>: sem preventDefault o navegador recarrega a página
  // e o código de uso único fica queimado sem a senha ter sido trocada.
  const handleEnviar = async (e?: React.FormEvent) => {
    e?.preventDefault();

    setErro("");

    if (!userEmail || !isValidEmail(userEmail)) {
      setErro("Informe o e-mail da conta que está recuperando.");
      return;
    }

    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    // Mesma política do backend (utils/senha.ts). O código de uso único não
    // é queimado por senha fraca — a view valida o código e só o consome
    // depois —, mas checar aqui evita a ida ao servidor e responde na hora.
    const erroSenha = validarSenha(senha);
    if (erroSenha) {
      setErro(erroSenha + ".");
      return;
    }

    // O código enviado por e-mail tem exatamente 6 dígitos (SecurityCode).
    // A checagem antiga (`< 4`) deixava passar um código incompleto, que
    // gastava uma das 5 tentativas do código à toa.
    if (!/^\d{6}$/.test(pin.trim())) {
      setErro("O código de verificação tem 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      // Envia os dados para a nossa view password_reset_confirm_pin
      await api.post("users/password-reset-confirm/", {
        email: userEmail,
        pin: pin,
        new_password: senha,
      });

      alert("Senha alterada com sucesso!");
      navigate("/login");
    } catch (err) {
      const error = err as DjangoError;
      setErro(
        error.response?.data?.error ||
          "Código inválido, expirado ou e-mail incorreto.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="redefinir-page">
      <div className="redefinir-wrapper">
        <h1>REDEFINIR SENHA</h1>

        <div className="redefinir-card">
          {emailDaRota ? (
            <p className="redefinir-alvo">
              Alterando senha para: <strong>{emailDaRota}</strong>
            </p>
          ) : (
            <div className="campo">
              <Input
                label="E-mail da conta"
                name="email"
                type="email"
                placeholder="Digite o e-mail que recebeu o código"
                value={emailDigitado}
                onChange={(e) => setEmailDigitado(e.target.value)}
                autoComplete="email"
              />
              <small>
                Você chegou aqui direto, então precisamos do e-mail de novo. O
                código que você já recebeu continua valendo.
              </small>
            </div>
          )}

          {erro && (
            <p className="error-message">{erro}</p>
          )}

          <form onSubmit={handleEnviar} noValidate>
            <div className="campo">
              <Input
                label="Código de verificação"
                name="pin"
                placeholder="Digite o código de 6 dígitos"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
              />
              <small>
                Enviado para o seu e-mail. Vale por 15 minutos, serve uma vez só
                e não é a sua matrícula.
              </small>
            </div>

            <div className="campo">
              <Input
                label="Nova Senha"
                name="nova-senha"
                type="password"
                placeholder="Digite a nova senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                /* `new-password` (e não `current-password`) é o que faz o
                   navegador oferecer GERAR uma senha forte em vez de
                   preencher a antiga — útil porque o backend exige 10
                   caracteres e reprova senha comum. */
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
              <small>{DICA_SENHA}</small>
            </div>

            <Button
              title={loading ? "Redefinindo..." : "Enviar"}
              type="submit"
              // `userEmail` entra na condição: sem ele o envio falha sempre,
              // e antes o botão ficava habilitado mesmo assim.
              disabled={!userEmail || !senha || !confirmacao || !pin || loading}
            />
          </form>

          <p className="link">
            <Link to="/login">Voltar para o login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
