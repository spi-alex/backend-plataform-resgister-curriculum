import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { SiteFooter } from "../components/Layout/SiteFooter/SiteFooter";
import { RouteMeta } from "./RouteMeta";

/* =========================================================================
   CARREGAMENTO

   Antes TODAS as ~25 telas eram importadas estaticamente aqui. Como este
   arquivo é a raiz da aplicação, o bundler tinha de colocar tudo no
   carregamento inicial: quem abria a tela de login baixava, junto, os
   dashboards de aluno, gestor e empresa — incluindo o `recharts` (354 kB
   não comprimidos / ~106 kB gzip), usado SÓ nos relatórios do gestor.

   `React.lazy` transforma cada import numa requisição separada, feita só
   quando a rota é realmente visitada. As telas públicas (home, login,
   cadastro) seguem estáticas de propósito: são a porta de entrada, e
   deixá-las sob lazy só adicionaria uma ida-e-volta de rede antes do
   primeiro conteúdo aparecer.
   ========================================================================= */

/* ---------- Público: estático (é o primeiro paint) ---------- */
import Firstlook from "../pages/Initial/initial";
import Login from "../pages/auth/login/Login";
import SelectUserType from "../pages/auth/register/SelectUserType/SelectUserType";

/* ---------- Auth secundário: sob demanda ---------- */
const StudentRegistration = lazy(
  () => import("../pages/auth/register/StudentRegistration/StudentRegistration"),
);
const CompanyRegistration = lazy(
  () => import("../pages/auth/register/CompanyRegistration/CompanyRegistration"),
);
const RequestPasswordReset = lazy(
  () => import("../pages/auth/password/RequestReset/RequestReset"),
);
// `ResetPassword` é export nomeado, não default: `lazy` exige um módulo com
// `default`, por isso o re-empacotamento abaixo.
const ResetPassword = lazy(() =>
  import("../pages/auth/password/ResetPassword/ResetPassword").then((m) => ({
    default: m.ResetPassword,
  })),
);
const ChangePassword = lazy(
  () => import("../pages/auth/password/ChangePassword/ChangePassword"),
);
const ConfirmAccount = lazy(() => import("../pages/auth/confirm/ConfirmAccount"));
const NotFound = lazy(() => import("../pages/NotFound/NotFound"));

/* ---------- Dashboard Aluno ---------- */
const StudentLayout = lazy(() => import("../pages/dashboard/student/layout/StudentLayout"));
const StudentHome = lazy(() => import("../pages/dashboard/student/home/StudentHome"));
const StudentCurriculumCreate = lazy(
  () => import("../pages/dashboard/student/curriculums/StudentCurriculumCreate"),
);
const StudentCurriculumView = lazy(
  () => import("../pages/dashboard/student/curriculums/StudentCurriculumView"),
);
const StudentJobs = lazy(() => import("../pages/dashboard/student/jobs/studentJobs"));
const StudentJobDetails = lazy(
  () => import("../pages/dashboard/student/jobs/studentJobsDetails"),
);
const StudentApplications = lazy(
  () => import("../pages/dashboard/student/applications/StudentApplications"),
);

/* ---------- Dashboard Gestor (é quem traz o recharts) ---------- */
const ManagerLayout = lazy(() => import("../pages/dashboard/manager/layout/ManagerLayout"));
const ManagerDashboard = lazy(() => import("../pages/dashboard/manager/Home/ManagerHome"));
const ManagerJobs = lazy(() => import("../pages/dashboard/manager/jobs/ManagerJobs"));
const ManagerJobDetails = lazy(
  () => import("../pages/dashboard/manager/jobs/ManagerJobsDetails/JobDetails"),
);
const ManagerCurriculumList = lazy(
  () =>
    import(
      "../pages/dashboard/manager/Curriculums/ManagerCurriculums/ManagerCurriculumList"
    ),
);
const ManagerCurriculumView = lazy(
  () =>
    import(
      "../pages/dashboard/manager/Curriculums/ManagerCurriculums/ManagerCurriculumView"
    ),
);
const CurriculumPreview = lazy(
  () =>
    import("../pages/dashboard/manager/Curriculums/CurriculumPreview/curriculumPreview"),
);
const ManagerReports = lazy(() => import("../pages/dashboard/manager/reports/ManagerReports"));

/* ---------- Dashboard Empresa ---------- */
const CompanyLayout = lazy(() => import("../pages/dashboard/company/layout/CompanyLayout"));
const CompanyHome = lazy(() => import("../pages/dashboard/company/home/CompanyHome"));
const CompanyJobs = lazy(() => import("../pages/dashboard/company/CompanyJobs/CompanyJobs"));
const CompanyJobCreate = lazy(
  () => import("../pages/dashboard/company/CompanyCreateJob/CompanyCreateJob"),
);
const CompanyProfile = lazy(
  () => import("../pages/dashboard/company/CompanyProfile/CompanyProfile"),
);
const CompanyJobUpdate = lazy(
  () => import("../pages/dashboard/company/CompanyUpdateJob/UpdateJob"),
);
const CompanyJobDetails = lazy(
  () => import("../pages/dashboard/company/CompanyJobs/CompanyJobsDetails"),
);
const CompanyJobCandidates = lazy(
  () => import("../pages/dashboard/company/CompanyJobs/CandidateView/CandidateView"),
);
const CompanyCandidateProfile = lazy(
  () =>
    import("../pages/dashboard/company/CompanyJobs/CandidateView/CandidateViewProfile"),
);

/** Mostrado no intervalo entre clicar e o chunk da rota chegar. */
function CarregandoRota() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#12340f",
      }}
    >
      Carregando…
    </div>
  );
}

export default function AppRoutes() {
  return (
    <>
      {/* Título e meta description da rota atual. Fica fora do <Routes>
          para valer também nas rotas aninhadas e na 404. */}
      <RouteMeta />

      <Suspense fallback={<CarregandoRota />}>
        <Routes>
          <Route path="/" element={<Firstlook />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<SelectUserType />} />
          <Route path="/cadastro/estudante" element={<StudentRegistration />} />
          <Route path="/cadastro/empresa" element={<CompanyRegistration />} />
          <Route path="/esqueci-senha" element={<RequestPasswordReset />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />
          <Route path="/confirmar-cadastro" element={<ConfirmAccount />} />

          {/* TROCA DE SENHA — qualquer usuário autenticado.
              Sem `allowedRoles`: a rota não é de um papel, é da conta. As
              telas acima cobrem quem PERDEU o acesso; esta é para quem já
              está dentro e quer trocar a senha sem passar por e-mail. */}
          <Route element={<ProtectedRoute />}>
            <Route path="/alterar-senha" element={<ChangePassword />} />
          </Route>

          {/* ÁREA DO ALUNO */}
          <Route element={<ProtectedRoute allowedRoles={["candidate", "aluno"]} />}>
            <Route path="/dashboard/aluno" element={<StudentLayout />}>
              <Route index element={<StudentHome />} />
              <Route path="curriculo" element={<StudentCurriculumCreate />} />
              <Route path="curriculo/view" element={<StudentCurriculumView />} />
              <Route path="vagas" element={<StudentJobs />} />
              <Route path="vagas/:id" element={<StudentJobDetails />} />
              <Route path="candidaturas" element={<StudentApplications />} />
            </Route>
          </Route>

          {/* ÁREA DO GESTOR */}
          <Route element={<ProtectedRoute allowedRoles={["admin", "gestor"]} />}>
            <Route path="/dashboard/gestor" element={<ManagerLayout />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="vagas" element={<ManagerJobs />} />
              <Route path="vagas/:id" element={<ManagerJobDetails />} />
              <Route path="curriculos" element={<ManagerCurriculumList />} />
              <Route path="curriculo/:id" element={<ManagerCurriculumView />} />
              <Route path="curriculos/:id/preview" element={<CurriculumPreview />} />
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
              <Route path="vagas/:id" element={<CompanyJobDetails />} />
              <Route path="vagas/:id/candidatos" element={<CompanyJobCandidates />} />
              <Route
                path="vagas/:jobId/candidatos/:appId"
                element={<CompanyCandidateProfile />}
              />
              <Route path="vagas/editar/:id" element={<CompanyJobUpdate />} />
            </Route>
          </Route>

          {/* 404. Antes era `<Navigate to="/" replace />`: toda URL errada
              caía na home sem aviso nenhum — inclusive link de e-mail com
              typo — e o histórico era reescrito por cima. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {/* Rodapé institucional. Fica FORA do <Suspense> para não desaparecer
          enquanto um chunk de rota carrega, e ele mesmo decide se aparece
          (esconde-se em /dashboard/*). */}
      <SiteFooter />
    </>
  );
}
