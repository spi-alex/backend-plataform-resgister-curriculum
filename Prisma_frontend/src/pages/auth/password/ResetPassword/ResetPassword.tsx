import { useState } from "react";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";
import { Link } from "react-router-dom";
import './ResetPassword.css'

export function ResetPassword() {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  const handleEnviar = () => {
    console.log("Nova senha:", senha);
    console.log("Confirmação:", confirmacao);
  };

  return (
    <div className="redefinir-page">
      <div className="redefinir-wrapper">
        <h1>REDEFINIR SENHA</h1>

        <div className="redefinir-card">
          <div className="campo">
            <label>Senha</label>
            <Input
              type="password"
              placeholder="Digite a nova senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Confirme a nova senha</label>
            <Input
              type="password"
              placeholder="Digite a senha novamente"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>

          <Button
            title="Enviar"
            disabled={!senha || !confirmacao}
            onClick={handleEnviar}
          />

          {/* 🔗 Link adicionado */}
          <p className="link">
            <Link to="/login">Voltar para o login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
