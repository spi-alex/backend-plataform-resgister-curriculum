import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerHeader from "../components/ManagerHeader";

import "./ManagerLayout.css"; // pode reaproveitar o css do dashboard

export default function ManagerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const location = useLocation();
  const email = location.state?.email || "gestor@prisma.com";
  const userName = email.split("@")[0];

  return (
    <div className="manager-dashboard">
      <ManagerHeader
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        userName={userName}
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
