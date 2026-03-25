import { Menu } from "lucide-react";
import { useAuth } from "../../../../context/Authcontext" // ajuste o caminho

interface HeaderProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export default function StudentHeader({
  sidebarOpen,
  toggleSidebar,
}: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="student-header">
      <div className="header-left">
        <button className="toggle-sidebar" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
        <h1>PRISMA</h1>
      </div>

      <span>Aluno • {user?.name}</span>
    </header>
  );
}