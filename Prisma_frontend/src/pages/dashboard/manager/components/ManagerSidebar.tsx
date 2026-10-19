import {
  LayoutDashboard,
  Briefcase,
  FileText,
  BarChart3,
  KeyRound,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../context/Authcontext";

interface SidebarProps {
  sidebarOpen: boolean;
}

export default function ManagerSidebar({ sidebarOpen }: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

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

        {/* ALTERAR SENHA */}
        <button
          className="nav-item"
          data-tooltip="Alterar Senha"
          onClick={() => navigate("/alterar-senha")}
        >
          <KeyRound size={20} />
          {sidebarOpen && <span>Alterar Senha</span>}
        </button>

        {/* SAIR */}
        {/* BUG CORRIGIDO: isto só navegava para /login sem revogar nada — o
            `logout()` do contexto chama `POST users/logout/`, que invalida
            no SERVIDOR todos os tokens já emitidos e apaga o cookie de
            refresh. Sem ele a sessão continuava viva: bastava voltar ou
            atualizar a página para "ressuscitar" o login, e num computador
            compartilhado "Sair" não protegia nada. Mesmo defeito que já
            havia sido corrigido no StudentSidebar. */}
        <button
          className="nav-item danger"
          data-tooltip="Sair"
          onClick={logout}
        >
          <LogOut size={20} />
          {sidebarOpen && <span>Sair</span>}
        </button>

      </nav>
    </aside>
  );
}