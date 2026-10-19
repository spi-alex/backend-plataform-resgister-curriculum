import { useAuth } from "../../../context/Authcontext"; // Ajuste o caminho conforme sua pasta
import "./Sidebar.css";

interface SidebarProps {
  onSelect: (
    section: "home" | "profile" | "curriculum" | "vacancies" | "status",
  ) => void;
}

export function Sidebar({ onSelect }: SidebarProps) {
  // O `logout()` do contexto agora chama `POST users/logout/` no backend,
  // que REVOGA os tokens já emitidos e apaga o cookie httpOnly, antes de
  // limpar o estado local. A limpeza manual de storage que havia aqui (mais
  // um `console.log` de depuração esquecido) só apagava o rastro no
  // navegador — o token continuava valendo no servidor até expirar.
  const { logout } = useAuth();
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

        <button className="danger" onClick={logout}>
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
