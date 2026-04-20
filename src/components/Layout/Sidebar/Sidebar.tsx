import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

interface SidebarProps {
  onSelect: (section: "home" | "profile" | "curriculum" | "vacancies" | "status") => void;
}

export function Sidebar({ onSelect }: SidebarProps) {
  const navigate = useNavigate();

  function handleLogout() {
    // se futuramente usar token:
    // localStorage.clear();
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
