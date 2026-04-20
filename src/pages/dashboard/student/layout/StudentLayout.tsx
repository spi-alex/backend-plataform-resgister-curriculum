import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";

import StudentSidebar from "../components/StudentSidebar";
import StudentHeader from "../components/StudentHeader";

import "./StudentLayout.css";

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const location = useLocation();
  const email = location.state?.email || "aluno@prisma.com";
  const userName = email.split("@")[0];

  return (
    <div className="student-dashboard">
      <StudentHeader
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        userName={userName}
      />

      <div className="student-layout">
        <StudentSidebar sidebarOpen={sidebarOpen} />

        <main className="student-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
