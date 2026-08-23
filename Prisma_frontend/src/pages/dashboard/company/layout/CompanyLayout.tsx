import { Outlet } from "react-router-dom";
import { useState } from "react";

import CompanySidebar from "../components/CompanySidebar";
import CompanyHeader from "../components/CompanyHeader";

import "./CompanyLayout.css";

export default function CompanyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="company-dashboard">
      {/* CompanyHeader já lê o nome do usuário logado via useAuth() — o
          `userName` derivado de location.state (que quase nunca vem
          preenchido) não era um prop que o componente sequer aceitava. */}
      <CompanyHeader
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="company-layout">
        <CompanySidebar sidebarOpen={sidebarOpen} />

        <main className="company-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}