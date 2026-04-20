import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";
import "./RequestReset.css";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RequestPasswordReset() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");

  const handleSubmit = () => {
    if (!email) return;

    if (!isValidEmail(email)) {
      setMensagem("Informe um email válido.");
      return;
    }

    // Aqui futuramente será chamada a API
    setMensagem(
      "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."
    );
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
              setMensagem(""); // limpa mensagem ao digitar
            }}
          />

          <Button
            title="enviar"
            disabled={!email || !isValidEmail(email)}
            onClick={handleSubmit}
          />

          {mensagem && <p className="mensagem">{mensagem}</p>}

          <p className="link">
            <Link to="/login">Voltar para o login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
