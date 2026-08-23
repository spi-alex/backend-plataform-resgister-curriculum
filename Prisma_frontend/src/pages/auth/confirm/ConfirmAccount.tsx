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

  const handleConfirmar = async () => {
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
          "Não foi possível confirmar o cadastro. Verifique o e-mail e o PIN.",
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
            Enviamos um PIN de 6 dígitos para o seu e-mail no momento do
            cadastro. Informe-o abaixo para ativar sua conta e poder entrar.
          </p>

          <Input
            label="Email"
            type="email"
            placeholder="Digite seu email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMensagem("");
            }}
          />

          <Input
            label="Código PIN"
            placeholder="Digite o código de 6 dígitos"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setMensagem("");
            }}
          />

          <Button
            title={loading ? "Confirmando..." : "Confirmar"}
            disabled={!email.trim() || pin.trim().length < 4 || loading}
            onClick={handleConfirmar}
          />

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
