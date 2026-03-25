import {
  LayoutDashboard,
  FileText,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  sidebarOpen: boolean;
}

export default function StudentSidebar({ sidebarOpen }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className={`student-sidebar ${!sidebarOpen ? "closed" : ""}`}>
      <nav className="sidebar-nav">
        
        {/* DASHBOARD */}
        <button
          className="nav-item"
          onClick={() => navigate("/dashboard/aluno")}
        >
          <LayoutDashboard size={20} />
          {sidebarOpen && <span>Dashboard</span>}
        </button>

        {/* MEU CURRÍCULO */}
        <button
          className="nav-item"
          onClick={() => navigate("/dashboard/aluno/curriculo")}
        >
          <FileText size={20} />
          {sidebarOpen && <span>Meu Currículo</span>}
        </button>

        {/* SAIR */}
        <button
          className="nav-item danger"
          onClick={() => navigate("/login")}
        >
          <LogOut size={20} />
          {sidebarOpen && <span>Sair</span>}
        </button>
      </nav>
    </aside>
  );
}
