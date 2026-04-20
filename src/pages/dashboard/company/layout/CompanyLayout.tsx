import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";

import CompanySidebar from "../components/CompanySidebar";
import CompanyHeader from "../components/CompanyHeader";

import "./CompanyLayout.css";

export default function CompanyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const location = useLocation();
  const email = location.state?.email || "empresa@prisma.com";
  const userName = email.split("@")[0];

  return (
    <div className="company-dashboard">
      <CompanyHeader
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        userName={userName}
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