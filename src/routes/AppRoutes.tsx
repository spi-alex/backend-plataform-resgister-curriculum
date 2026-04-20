import { Routes, Route, Navigate } from "react-router-dom";

/* ========================= */
/* Inicial */
/* ========================= */
import Firstlook from "../pages/Initial/initial";

/* ========================= */
/* Autenticação */
/* ========================= */
import Login from "../pages/auth/login/Login";

/* Perfil */
import Profile from "../pages/profile/Profile"

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
import StudentJobs from "../pages/dashboard/student/jobs/studentJobs"
import StudentJobDetails from "../pages/dashboard/student/jobs/studentJobsDetails"
import StudentCurriculumView from "../pages/dashboard/student/curriculums/StudentCurriculumView"

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
import ManagerJobDetails from "../pages/dashboard/manager/jobs/ManagerJobsDetails/JobDetails"

/* ========================= */
/* Dashboard da Empresa */
/* ========================= */
import CompanyLayout from "../pages/dashboard/company/layout/CompanyLayout";
import CompanyHome from "../pages/dashboard/company/Home/CompanyHome";
import CompanyJobs from "../pages/dashboard/company/CompanyJobs/CompanyJobs"
import CompanyJobCreate from "../pages/dashboard/company/CompanyCreateJob/CompanyCreateJob"
import CompanyJobDetails from "../pages/dashboard/company/CompanyJobs/CompanyJobsDetails"
import CompanyJobCandidates from "../pages/dashboard/company/CompanyJobs/CandidateView/CandidateView"
import CurriculumPreviewCompany from "../pages/dashboard/company/CompanyJobs/CandidateView/CurriculumPrevielpdf"
import CompanyCurriculumView from "../pages/dashboard/company/CompanyJobs/CandidateView/CandidateViewProfile"

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
      <Route path="/ResetPassword" element={<ResetPassword/>} />

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
        <Route path="vagas" element={<StudentJobs />} />
        <Route path="vagas/:id" element={<StudentJobDetails/>} />
        <Route path="curriculos/:id/preview"  element={<StudentCurriculumView />}/>
        <Route path="perfil" element={<Profile/>}/>


      </Route>

      {/* ================================== */}
      {/* DASHBOARD - GESTOR */}
      {/* ================================== */}
      <Route path="/dashboard/gestor" element={<ManagerLayout />}>
        <Route index element={<ManagerDashboard />} />
        <Route path="vagas" element={<ManagerJobs />} />
        <Route path="vagas/:id" element={<ManagerJobDetails />} />
        <Route path="curriculos" element={<ManagerCurriculumList />} />
        <Route path="curriculo/:id" element={<ManagerCurriculumView />} />
        <Route path="curriculos/:id/preview" element={<CurriculumPreview />} />
        <Route path="relatorios" element={<ManagerReports />} />
        <Route path="perfil" element={<Profile/>}/>
        
      </Route>

      {/* ================================== */}
      {/* DASHBOARD - EMPRESA */}
      {/* ================================== */}
      <Route path="/dashboard/empresa" element={<CompanyLayout />}>
        <Route index element={<CompanyHome />} />
        <Route path="vagas" element={<CompanyJobs />} />
        <Route path="vagas/nova" element={<CompanyJobCreate/>} />
        <Route path="vagas/:id" element={<CompanyJobDetails/>}/>
        <Route path="vagas/:id/candidatos" element={<CompanyJobCandidates/>}/>
        <Route path="curriculos/:id/preview" element={<CurriculumPreviewCompany/>}/>
        <Route path="curriculo/:id" element={<CompanyCurriculumView/>}/>
        <Route path="perfil" element={<Profile/>}/>

      </Route>

      {/* ================================== */}
      {/* ROTA NÃO ENCONTRADA */}
      {/* ================================== */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}