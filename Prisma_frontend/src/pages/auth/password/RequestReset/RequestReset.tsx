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

  // `onSubmit` do <form>: sem preventDefault o navegador recarrega a página.
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

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
          <form onSubmit={handleSubmit} noValidate>
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

            <Button
              title={loading ? "Enviando..." : "enviar"}
              type="submit"
              disabled={!email || !isValidEmail(email) || loading}
            />
          </form>

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
