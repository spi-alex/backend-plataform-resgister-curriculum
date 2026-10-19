import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Input } from "../../../components/Input/Input";
import { Button } from "../../../components/Button/Button";
import api from "../../../services/api";
import "./ConfirmAccount.css";

// Interface para tipagem do erro vindo do Django
interface DjangoError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export default function ConfirmAccount() {
  const location = useLocation();
  const navigate = useNavigate();

  // Recupera o e-mail vindo da tela de cadastro (ou vazio se acessar direto)
  const emailFromState = location.state?.email || "";

  const [email, setEmail] = useState(emailFromState);
  const [pin, setPin] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  // `onSubmit` do <form>: sem preventDefault o navegador recarrega a página.
  const handleConfirmar = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!email.trim() || pin.trim().length < 4) return;

    setLoading(true);
    setMensagem("");

    try {
      await api.post("users/confirm/", { email: email.trim(), pin: pin.trim() });

      setSucesso(true);
      setMensagem("Conta confirmada com sucesso! Redirecionando para o login...");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      const error = err as DjangoError;
      setMensagem(
        error.response?.data?.error ||
          "Não foi possível confirmar o cadastro. Verifique o e-mail e o código.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="confirm-page">
      <div className="confirm-outer">
        <h1>CONFIRMAR CADASTRO</h1>
        <div className="confirm-inner">
          <p className="confirm-hint">
            Enviamos um <strong>código de confirmação</strong> de 6 dígitos
            para o seu e-mail. Ele vale por 15 minutos e só pode ser usado uma
            vez. Informe-o abaixo para ativar sua conta.
          </p>
          <p className="confirm-hint">
            Atenção: este código <strong>não</strong> é a sua matrícula. A
            matrícula também vem no mesmo e-mail, é permanente, e serve para
            entrar no sistema no lugar do e-mail.
          </p>

          <form onSubmit={handleConfirmar} noValidate>
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMensagem("");
              }}
              autoComplete="email"
            />

            <Input
              label="Código de confirmação"
              name="pin"
              placeholder="Digite o código de 6 dígitos"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setMensagem("");
              }}
              /* `one-time-code` + `inputMode="numeric"`: no celular o teclado
                 abre já numérico e o iOS/Android oferece colar o código do
                 e-mail direto na barra de sugestões. */
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
            />

            <Button
              title={loading ? "Confirmando..." : "Confirmar"}
              type="submit"
              disabled={!email.trim() || pin.trim().length < 4 || loading}
            />
          </form>

          {mensagem && (
            <p
              className="mensagem"
              style={{ color: sucesso ? "#16a34a" : "#f87171" }}
            >
              {mensagem}
            </p>
          )}

          <p className="link">
            <Link to="/login">Voltar para o login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
