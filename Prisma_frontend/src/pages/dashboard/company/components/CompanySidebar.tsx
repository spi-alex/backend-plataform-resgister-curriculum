import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Building2,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  sidebarOpen: boolean;
}

export default function CompanySidebar({ sidebarOpen }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className={`company-sidebar ${!sidebarOpen ? "closed" : ""}`}>
      <nav className="sidebar-nav">

        {/* DASHBOARD */}
        <button
          className="nav-item"
          data-tooltip="Dashboard"
          onClick={() => navigate("/dashboard/empresa")}
        >
          <LayoutDashboard size={20} />
          {sidebarOpen && <span>Dashboard</span>}
        </button>

        {/* MINHAS VAGAS */}
        <button
          className="nav-item"
          data-tooltip="Minhas Vagas"
          onClick={() => navigate("/dashboard/empresa/vagas")}
        >
          <Briefcase size={20} />
          {sidebarOpen && <span>Minhas Vagas</span>}
        </button>

        {/* NOVA VAGA */}
        <button
          className="nav-item"
          data-tooltip="Nova Vaga"
          onClick={() => navigate("/dashboard/empresa/vagas/nova")}
        >
          <PlusCircle size={20} />
          {sidebarOpen && <span>Nova Vaga</span>}
        </button>

        {/* PERFIL DA EMPRESA */}
        <button
          className="nav-item"
          data-tooltip="Perfil"
          onClick={() => navigate("/dashboard/empresa/perfil")}
        >
          <Building2 size={20} />
          {sidebarOpen && <span>Perfil</span>}
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