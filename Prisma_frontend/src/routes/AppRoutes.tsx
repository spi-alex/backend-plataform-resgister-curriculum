import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";

/* ========================= */
/* Inicial e Auth */
/* ========================= */
import Firstlook from "../pages/Initial/initial";
import Login from "../pages/auth/login/Login";
import SelectUserType from "../pages/auth/register/SelectUserType/SelectUserType";
import StudentRegistration from "../pages/auth/register/StudentRegistration/StudentRegistration";
import CompanyRegistration from "../pages/auth/register/CompanyRegistration/CompanyRegistration";
import RequestPasswordReset from "../pages/auth/password/RequestReset/RequestReset";
import { ResetPassword } from "../pages/auth/password/ResetPassword/ResetPassword";

/* ========================= */
/* Dashboard Aluno */
/* ========================= */
import StudentLayout from "../pages/dashboard/student/layout/StudentLayout";
import StudentHome from "../pages/dashboard/student/home/StudentHome";
import StudentCurriculumCreate from "../pages/dashboard/student/curriculums/StudentCurriculumCreate";
import StudentCurriculumView from "../pages/dashboard/student/curriculums/StudentCurriculumView";

/* ========================= */
/* Dashboard Gestor */
/* ========================= */
// CORREÇÃO: Verifique se o nome é ManagerLayout mesmo. Ajustei o caminho abaixo:
import ManagerLayout from "../pages/dashboard/manager/layout/ManagerLayout";
import ManagerDashboard from "../pages/dashboard/manager/Home/ManagerHome";
import ManagerJobs from "../pages/dashboard/manager/jobs/ManagerJobs";
import ManagerCurriculumList from "../pages/dashboard/manager/Curriculums/ManagerCurriculums/ManagerCurriculumList";
import ManagerCurriculumView from "../pages/dashboard/manager/Curriculums/ManagerCurriculums/ManagerCurriculumView";
import CurriculumPreview from "../pages/dashboard/manager/Curriculums/CurriculumPreview/curriculumPreview";
import ManagerReports from "../pages/dashboard/manager/reports/ManagerReports";

/* ========================= */
/* Dashboard Empresa */
/* ========================= */
import CompanyLayout from "../pages/dashboard/company/layout/CompanyLayout";
import CompanyHome from "../pages/dashboard/company/home/CompanyHome";
// CORREÇÃO: Removido o .tsx do final do import
import CompanyJobs from "../pages/dashboard/company/CompanyJobs/CompanyJobs";
import CompanyJobCreate from "../pages/dashboard/company/CompanyCreateJob/CompanyCreateJob";
import CompanyProfile from "../pages/dashboard/company/CompanyProfile/CompanyProfile";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Firstlook />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<SelectUserType />} />
      <Route path="/cadastro/estudante" element={<StudentRegistration />} />
      <Route path="/cadastro/empresa" element={<CompanyRegistration />} />
      <Route path="/esqueci-senha" element={<RequestPasswordReset />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />

      {/* ÁREA DO ALUNO */}
      <Route element={<ProtectedRoute allowedRoles={["candidate", "aluno"]} />}>
        <Route path="/dashboard/aluno" element={<StudentLayout />}>
          <Route index element={<StudentHome />} />
          <Route path="curriculo" element={<StudentCurriculumCreate />} />
          <Route path="curriculo/view" element={<StudentCurriculumView />} />
        </Route>
      </Route>

      {/* ÁREA DO GESTOR */}
      <Route element={<ProtectedRoute allowedRoles={["admin", "gestor"]} />}>
        <Route path="/dashboard/gestor" element={<ManagerLayout />}>
          <Route index element={<ManagerDashboard />} />
          <Route path="vagas" element={<ManagerJobs />} />
          <Route path="curriculos" element={<ManagerCurriculumList />} />
          <Route path="curriculo/:id" element={<ManagerCurriculumView />} />
          <Route
            path="curriculos/:id/preview"
            element={<CurriculumPreview />}
          />
          <Route path="relatorios" element={<ManagerReports />} />
        </Route>
      </Route>

      {/* ÁREA DA EMPRESA */}
      <Route element={<ProtectedRoute allowedRoles={["company", "empresa"]} />}>
        <Route path="/dashboard/empresa" element={<CompanyLayout />}>
          <Route index element={<CompanyHome />} />
          <Route path="vagas" element={<CompanyJobs />} />
          <Route path="vagas/nova" element={<CompanyJobCreate />} />
          <Route path="perfil" element={<CompanyProfile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
