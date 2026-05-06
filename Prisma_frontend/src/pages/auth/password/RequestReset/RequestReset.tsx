import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";
import api from "../../../../services/api";
import "./RequestReset.css";

// Interface para evitar o erro de 'any'
interface DjangoError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RequestPasswordReset() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!email || !isValidEmail(email)) return;

    setLoading(true);
    setMensagem("");

    try {
      // Envia o pedido de reset (Gera o PIN no Django)
      await api.post("users/password-reset/", { email });

      // Navega para a próxima tela passando o email no estado da rota
      navigate("/redefinir-senha", { state: { email } });
    } catch (err) {
      const error = err as DjangoError;
      setMensagem(
        error.response?.data?.error ||
          "Erro ao solicitar recuperação. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-outer">
        <h1>REDEFINIR SENHA</h1>
        <div className="reset-inner">
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

          <Button
            title={loading ? "Enviando..." : "enviar"}
            disabled={!email || !isValidEmail(email) || loading}
            onClick={handleSubmit}
          />

          {mensagem && (
            <p className="mensagem" style={{ color: "red", marginTop: "10px" }}>
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
