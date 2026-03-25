import { Routes, Route, Navigate } from "react-router-dom";

/* ========================= */
/* Inicial */
/* ========================= */
import Firstlook from "../pages/Initial/initial";

/* ========================= */
/* Autenticação */
/* ========================= */
import Login from "../pages/auth/login/Login";

/* Cadastro */
import SelectUserType from "../pages/auth/register/SelectUserType/SelectUserType"
import StudentRegistration from "../pages/auth/register/StudentRegistration/StudentRegistration";
import CompanyRegistration from "../pages/auth/register/CompanyRegistration/CompanyRegistration";

/* Senhas */
import RequestPasswordReset from "../pages/auth/password/RequestReset/RequestReset";
import { ResetPassword } from "../pages/auth/password/ResetPassword/ResetPassword";

/* ========================= */
/* Dashboard do Aluno */
/* ========================= */
import StudentLayout from "../pages/dashboard/student/layout/StudentLayout";
import StudentHome from "../pages/dashboard/student/home/StudentHome";
import StudentCurriculumCreate from "../pages/dashboard/student/curriculums/StudentCurriculumCreate";

/* ========================= */
/* Dashboard do Gestor */
/* ========================= */
import ManagerLayout from "../pages/dashboard/manager/layout/ManagerLayout";
import ManagerDashboard from "../pages/dashboard/manager/Home/ManagerHome";
import ManagerJobs from "../pages/dashboard/manager/jobs/ManagerJobs";
import ManagerCurriculumList from "../pages/dashboard/manager/Curriculums/ManagerCurriculums/ManagerCurriculumList";
import ManagerCurriculumView from "../pages/dashboard/manager/Curriculums/ManagerCurriculums/ManagerCurriculumView";
import CurriculumPreview from "../pages/dashboard/manager/Curriculums/CurriculumPreview/curriculumPreview";
import ManagerReports from "../pages/dashboard/manager/reports/ManagerReports";

/* ========================= */
/* Dashboard da Empresa */
/* ========================= */
import CompanyLayout from "../pages/dashboard/company/layout/CompanyLayout";
import CompanyHome from "../pages/dashboard/company/home/CompanyHome";
import CompanyJobs from "../pages/dashboard/company/CompanyJobs/CompanyJobs.tsx"
import CompanyJobCreate from "../pages/dashboard/company/CompanyCreateJob/CompanyCreateJob"
import CompanyProfile from "../pages/dashboard/company/CompanyProfile/CompanyProfile"

export default function AppRoutes() {
  return (
    <Routes>

      {/* ================================== */}
      {/* PÁGINA INICIAL */}
      {/* ================================== */}
      <Route path="/" element={<Firstlook />} />

      {/* ================================== */}
      {/* AUTENTICAÇÃO */}
      {/* ================================== */}
      <Route path="/login" element={<Login />} />

      {/* Cadastro */}
      <Route path="/cadastro" element={<SelectUserType />} />
      <Route path="/cadastro/estudante" element={<StudentRegistration />} />
      <Route path="/cadastro/empresa" element={<CompanyRegistration />} />

      {/* Recuperação de senha */}
      <Route path="/esqueci-senha" element={<RequestPasswordReset />} />
      <Route path="/redefinir-senha/:token" element={<ResetPassword />} />

      {/* ================================== */}
      {/* DASHBOARD - ALUNO */}
      {/* ================================== */}
      <Route path="/dashboard/aluno" element={<StudentLayout />}>
        <Route index element={<StudentHome />} />
        <Route path="curriculo" element={<StudentCurriculumCreate />} />
      </Route>

      {/* ================================== */}
      {/* DASHBOARD - GESTOR */}
      {/* ================================== */}
      <Route path="/dashboard/gestor" element={<ManagerLayout />}>
        <Route index element={<ManagerDashboard />} />
        <Route path="vagas" element={<ManagerJobs />} />
        <Route path="curriculos" element={<ManagerCurriculumList />} />
        <Route path="curriculo/:id" element={<ManagerCurriculumView />} />
        <Route path="curriculos/:id/preview" element={<CurriculumPreview />} />
        <Route path="relatorios" element={<ManagerReports />} />
      </Route>

      {/* ================================== */}
      {/* DASHBOARD - EMPRESA */}
      {/* ================================== */}
      <Route path="/dashboard/empresa" element={<CompanyLayout />}>
        <Route index element={<CompanyHome />} />
        <Route path="vagas" element={<CompanyJobs />} />
        <Route path="vagas/nova" element={<CompanyJobCreate/>} />
        <Route path="perfil" element={<CompanyProfile />} /> 
      </Route>

      {/* ================================== */}
      {/* ROTA NÃO ENCONTRADA */}
      {/* ================================== */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}