import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";
import api from "../../../../services/api";
import "./ResetPassword.css";

// Interface para tipagem rigorosa do erro da API
interface DjangoError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  // Recupera o email vindo da tela anterior (ou vazio se o usuário acessar direto)
  const userEmail = location.state?.email || "";

  const [pin, setPin] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEnviar = async () => {
    setErro("");

    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (pin.length < 4) {
      setErro("O PIN deve ser preenchido corretamente.");
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
        error.response?.data?.error || "PIN inválido ou e-mail incorreto.",
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
          <p
            style={{
              textAlign: "center",
              marginBottom: "15px",
              fontSize: "0.9rem",
              color: "#666",
            }}
          >
            Alterando senha para: <strong>{userEmail}</strong>
          </p>

          {erro && (
            <p
              className="error-message"
              style={{
                color: "red",
                textAlign: "center",
                marginBottom: "10px",
              }}
            >
              {erro}
            </p>
          )}

          <div className="campo">
            <Input
              label="Código PIN"
              placeholder="Digite o código de 6 dígitos"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>

          <div className="campo">
            <Input
              label="Nova Senha"
              type="password"
              placeholder="Digite a nova senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <div className="campo">
            <Input
              label="Confirme a nova senha"
              type="password"
              placeholder="Repita a nova senha"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>

          <Button
            title={loading ? "Redefinindo..." : "Enviar"}
            disabled={!senha || !confirmacao || !pin || loading}
            onClick={handleEnviar}
          />

          <p className="link">
            <Link to="/login">Voltar para o login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
