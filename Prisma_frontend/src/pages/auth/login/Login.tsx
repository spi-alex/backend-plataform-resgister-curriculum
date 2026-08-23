import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/Button/Button";
import { Input } from "../../../components/Input/Input";
import { useAuth } from "../../../context/Authcontext";
import "./Login.css";

// Tipagem do corpo de erro que o Django devolve (ex.: conta pendente)
interface LoginError {
  response?: {
    data?: {
      error?: string | string[];
    };
  };
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "true") {
      localStorage.clear();
      sessionStorage.clear();
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !senha.trim()) return;

    setErro("");

    try {
      const loggedUser = await login(email, senha);
      const role = String(loggedUser.role).toLowerCase();

      // Agora as comparações abaixo são válidas para o TypeScript
      if (["aluno", "student", "candidate"].includes(role)) {
        navigate("/dashboard/aluno");
      } else if (["manager", "gestor", "admin"].includes(role)) {
        navigate("/dashboard/gestor");
      } else if (["company", "empresa"].includes(role)) {
        navigate("/dashboard/empresa");
      } else {
        navigate("/dashboard/empresa");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      // Mostra a mensagem real do backend quando ela existe (ex.: conta
      // pendente de confirmação) em vez de sempre "email ou senha
      // inválidos" — antes qualquer erro caía nessa mensagem genérica,
      // então quem tinha acabado de se cadastrar não tinha como saber que
      // faltava confirmar a conta.
      const loginError = error as LoginError;
      const backendError = loginError.response?.data?.error;
      const mensagem = Array.isArray(backendError)
        ? backendError[0]
        : backendError;
      setErro(mensagem || "Email ou senha inválidos.");
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
        {/* BUG CORRIGIDO: os campos de e-mail/senha e o botão "Entrar"
            estavam duplicados na tela — dois pares de inputs escrevendo no
            mesmo estado e dois botões disparando o mesmo handler. */}
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

        {erro && (
          <p className="login-error" style={{ color: "#f87171", marginTop: "-8px" }}>
            {erro}
          </p>
        )}

        <Button title="Entrar" onClick={handleLogin} />

        <div className="login-links">
          <Link to="/cadastro">Cadastrar</Link>
          <Link to="/esqueci-senha">Esqueci minha senha</Link>
          <Link to="/confirmar-cadastro">Confirmar cadastro</Link>
        </div>
      </div>
    </div>
  );
}
