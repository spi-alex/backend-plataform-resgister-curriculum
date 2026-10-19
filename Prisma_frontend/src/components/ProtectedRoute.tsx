import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/Authcontext";

interface ProtectedRouteProps {
  allowedRoles?: (
    | "admin"
    | "company"
    | "candidate"
    | "gestor"
    | "aluno"
    | "empresa"
  )[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();

  // Enquanto o refresh silencioso do boot não termina, não decidimos nada.
  // O access token agora mora em memória (ver services/authToken.ts), então
  // logo depois de um F5 ele ainda não existe — decidir aqui cedo demais
  // mandaria todo mundo para /login a cada recarga de página.
  if (loading) return null;

  // NOTA DE SEGURANÇA: esta guarda é de EXPERIÊNCIA DE USO, não de
  // segurança. Ela evita desenhar uma tela que o usuário não deveria ver,
  // mas quem controla o navegador controla o que está aqui. A trava que
  // vale é a do backend, que revalida papel e propriedade a cada
  // requisição (IsCompany/IsCandidate/IsGestor, filtros de queryset por
  // dono, `_pode_acessar_curriculo`) — coberta pelos testes em
  // PRISMA_backend/users/tests_authz.py.
  //
  // A checagem redundante em `localStorage.getItem("access_token")` que
  // existia aqui saiu junto com o token do localStorage.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const redirectPath =
      user.role === "candidate" || user.role === "aluno"
        ? "/dashboard/aluno"
        : user.role === "gestor" || user.role === "admin"
          ? "/dashboard/gestor"
          : "/dashboard/empresa";

    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
