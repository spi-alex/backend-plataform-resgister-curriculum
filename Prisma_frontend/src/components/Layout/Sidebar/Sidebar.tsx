import { useAuth } from "../../../context/Authcontext"; // Ajuste o caminho conforme sua pasta
import "./Sidebar.css";

interface SidebarProps {
  onSelect: (
    section: "home" | "profile" | "curriculum" | "vacancies" | "status",
  ) => void;
}

export function Sidebar({ onSelect }: SidebarProps) {
  // 1. Pegue a função logout do seu contexto global
  const { logout } = useAuth();
  const handleHardLogout = () => {
    // Forçamos a limpeza antes mesmo de chamar o contexto
    window.localStorage.clear();
    window.sessionStorage.clear();

    console.log("Storage limpo: ", localStorage.getItem("access_token")); // Deve imprimir 'null'

    // Agora chamamos o logout do contexto para limpar o estado do React
    logout();
  };
  return (
    <aside className="sidebar">
      <nav className="menu">
        <button onClick={() => onSelect("home")}>🏠 Início</button>
        <button onClick={() => onSelect("curriculum")}>
          ➕ Cadastrar currículo
        </button>
        <button onClick={() => onSelect("curriculum")}>
          ✏️ Atualizar currículo
        </button>

        {/* 2. Chame a função logout do Contexto aqui */}
        <button className="danger" onClick={handleHardLogout}>
          🚪 Sair
        </button>
      </nav>
    </aside>
  );
}

/*
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

interface SidebarProps {
  onSelect: (
    section: "home" | "profile" | "curriculum" | "vacancies" | "status",
  ) => void;
}
export function Sidebar({ onSelect }: SidebarProps) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.clear();
    sessionStorage.clear();

    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <nav className="menu">
        <button onClick={() => onSelect("home")}>🏠 Início</button>
        <button onClick={() => onSelect("curriculum")}>
          ➕ Cadastrar currículo
        </button>
        <button onClick={() => onSelect("curriculum")}>
          ✏️ Atualizar currículo
        </button>
        <button className="danger" onClick={handleLogout}>
          🚪 Sair
        </button>
      </nav>
    </aside>
  );
}
*/
