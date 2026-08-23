import { Outlet } from "react-router-dom";
import { useState } from "react";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerHeader from "../components/ManagerHeader";

import "./ManagerLayout.css"; // pode reaproveitar o css do dashboard

export default function ManagerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="manager-dashboard">
      {/* ManagerHeader já lê o nome do usuário logado via useAuth() — o
          `userName` derivado de location.state (que quase nunca vem
          preenchido) não era um prop que o componente sequer aceitava. */}
      <ManagerHeader
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="manager-layout">
        <ManagerSidebar sidebarOpen={sidebarOpen} />

        <main className="manager-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
