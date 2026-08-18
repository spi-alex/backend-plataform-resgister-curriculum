import {
  LayoutDashboard,
  FileText,
  Briefcase,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../context/Authcontext";

interface SidebarProps {
  sidebarOpen: boolean;
}

export default function StudentSidebar({ sidebarOpen }: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

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

        {/* VAGAS */}
        <button
          className="nav-item"
          onClick={() => navigate("/dashboard/aluno/vagas")}
        >
          <Briefcase size={20} />
          {sidebarOpen && <span>Vagas</span>}
        </button>

        {/* MINHAS CANDIDATURAS */}
        <button
          className="nav-item"
          onClick={() => navigate("/dashboard/aluno/candidaturas")}
        >
          <ClipboardList size={20} />
          {sidebarOpen && <span>Minhas Candidaturas</span>}
        </button>

        {/* SAIR */}
        {/* BUG CORRIGIDO: isto só navegava para /login sem limpar o token —
            o aluno continuava autenticado (localStorage intacto) e, ao
            voltar ou atualizar a página, a sessão "ressuscitava" sozinha. */}
        <button
          className="nav-item danger"
          onClick={logout}
        >
          <LogOut size={20} />
          {sidebarOpen && <span>Sair</span>}
        </button>
      </nav>
    </aside>
  );
}
