import {
  LayoutDashboard,
  Briefcase,
  FileText,
  BarChart3,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  sidebarOpen: boolean;
}

export default function ManagerSidebar({ sidebarOpen }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className={`manager-sidebar ${!sidebarOpen ? "closed" : ""}`}>
      <nav className="sidebar-nav">
        
        {/* DASHBOARD */}
        <button
          className="nav-item"
          data-tooltip="Dashboard"
          onClick={() => navigate("/dashboard/gestor")}
        >
          <LayoutDashboard size={20} />
          {sidebarOpen && <span>Dashboard</span>}
        </button>

        {/* VAGAS */}
        <button
          className="nav-item"
          data-tooltip="Vagas"
          onClick={() => navigate("/dashboard/gestor/vagas")}
        >
          <Briefcase size={20} />
          {sidebarOpen && <span>Vagas</span>}
        </button>

        {/* CURRÍCULOS */}
        <button
          className="nav-item"
          data-tooltip="Currículos"
          onClick={() => navigate("/dashboard/gestor/curriculos")}
        >
          <FileText size={20} />
          {sidebarOpen && <span>Currículos</span>}
        </button>

        {/* RELATÓRIOS */}
        <button
          className="nav-item"
          data-tooltip="Relatórios"
          onClick={() => navigate("/dashboard/gestor/relatorios")}
        >
          <BarChart3 size={20} />
          {sidebarOpen && <span>Relatórios</span>}
        </button>

        {/* SAIR */}
        <button
          className="nav-item danger"
          data-tooltip="Sair"
          onClick={() => navigate("/login")}
        >
          <LogOut size={20} />
          {sidebarOpen && <span>Sair</span>}
        </button>

      </nav>
    </aside>
  );
}