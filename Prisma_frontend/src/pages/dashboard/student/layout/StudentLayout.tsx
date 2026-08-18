import { Outlet } from "react-router-dom";
import { useState } from "react";

import StudentSidebar from "../components/StudentSidebar";
import StudentHeader from "../components/StudentHeader";

import "./StudentLayout.css";

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="student-dashboard">
      {/* BUG CORRIGIDO: aqui era montado um "nome" a partir de
          location.state?.email, que o fluxo de login nunca preenche — na
          prática sempre caía no fallback fixo "aluno@prisma.com" e mostrava
          "aluno" no cabeçalho para todo mundo. O StudentHeader já busca o
          nome de verdade via useAuth(), então essa prop nem era usada. */}
      <StudentHeader
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
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
