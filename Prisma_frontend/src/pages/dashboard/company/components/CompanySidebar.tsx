import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Building2,
  KeyRound,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../context/Authcontext";

interface SidebarProps {
  sidebarOpen: boolean;
}

export default function CompanySidebar({ sidebarOpen }: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

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