import {
  LayoutDashboard,
  FileText,
  LogOut,
  Briefcase,
  User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockCurriculums } from "../../manager/Curriculums/Mocks/mockCurriculums";


interface SidebarProps {
  sidebarOpen: boolean;
}


export default function StudentSidebar({ sidebarOpen }: SidebarProps) {
  const navigate = useNavigate();


  return (
    <aside className={`student-sidebar ${!sidebarOpen ? "closed" : ""}`}>
      <nav className="sidebar-nav">
       
        <button
          className="nav-item"
          onClick={() => navigate("/dashboard/aluno")}
        >
          <LayoutDashboard size={20} />
          {sidebarOpen && <span>Dashboard</span>}
        </button>


        <button
          className="nav-item"
          onClick={() =>
            navigate(`/dashboard/aluno/curriculos/${mockCurriculums[0].id}/preview`)
          }
        >
          <FileText size={20} />
          {sidebarOpen && <span>Meu Currículo</span>}
        </button>


        <button
          className="nav-item"
          data-tooltip="Vagas"
          onClick={() => navigate("/dashboard/aluno/vagas")}
        >
          <Briefcase size={20} />
          {sidebarOpen && <span>Vagas</span>}
        </button>

        <button
          className="nav-item"
          data-tooltip="Perfil"
          onClick={() => navigate("/dashboard/aluno/perfil")}
        >
          <User size={20} />
          {sidebarOpen && <span>Perfil</span>}
        </button>


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

