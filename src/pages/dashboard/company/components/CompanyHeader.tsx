import { Menu } from "lucide-react";
import { useAuth } from "../../../../context/Authcontext"

interface HeaderProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export default function CompanyHeader({
  sidebarOpen,
  toggleSidebar,
}: HeaderProps) {
  const { user } = useAuth();

  console.log("USER NO HEADER:", user);

  return (
    <header className="company-header">
      <div className="header-left">
        <button className="toggle-sidebar" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
        <h1>PRISMA</h1>
      </div>

      <span>
        Empresa • {user ? user.name : "SEM USUÁRIO"}
      </span>
    </header>
  );
}