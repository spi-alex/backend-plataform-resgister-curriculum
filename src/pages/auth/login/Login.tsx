import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../../components/Button/Button";
import { Input } from "../../../components/Input/Input";
import { useAuth } from "../../../context/Authcontext";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const userType = location.state?.userType as
    | "student"
    | "manager"
    | "company";

  const handleLogin = async () => {
    if (!userType) {
      console.warn("Tipo de usuário não definido");
      return;
    }

    try {
      // envia email, senha e tipo de usuário
      await login(email, senha, userType);

      // Redireciona após login concluir
      if (userType === "student") {
        navigate("/dashboard/aluno");
      }

      if (userType === "manager") {
        navigate("/dashboard/gestor");
      }

      if (userType === "company") {
        navigate("/dashboard/empresa");
      }
    } catch (error) {
      console.error("Erro no login:", error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Bem-vindo ao PRISMA</h1>
        <p>
          Cadastre e acesse currículos de alunos com organização e rapidez.
        </p>
        <p>Institucional, simples e eficiente</p>
      </div>

      <div className="login-container">
        <h1 className="text-info">Login</h1>
        <p className="text-info">Faça login para acessar o PRISMA</p>

        <Input
          label="Email"
          type="email"
          placeholder="Digite seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Senha"
          type="password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <Button title="Entrar" onClick={handleLogin} />

        <div className="login-links">
          <Link to="/cadastro">Cadastrar</Link>
          <Link to="/esqueci-senha">Esqueci minha senha</Link>
        </div>
      </div>
    </div>
  );
}