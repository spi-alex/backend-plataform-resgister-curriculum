import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/Button/Button";
import { Input } from "../../../components/Input/Input";
import { useAuth } from "../../../context/Authcontext";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      const loggedUser = await login(email, senha);
      const role = loggedUser.role;

      // Usamos as strings que o TS agora reconhece no UserRole
      if (role === "aluno" || role === "student" || role === "candidate") {
        navigate("/dashboard/aluno");
      } else if (role === "manager" || role === "gestor") {
        navigate("/dashboard/gestor");
      } else if (role === "company" || role === "empresa") {
        navigate("/dashboard/empresa");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Email ou senha inválidos.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Bem-vindo ao PRISMA</h1>
        <p>Cadastre e acesse currículos de alunos com organização e rapidez.</p>
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
