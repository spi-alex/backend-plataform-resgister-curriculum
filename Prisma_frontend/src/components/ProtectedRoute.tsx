import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/Authcontext";

// Atualizamos aqui para incluir 'empresa' e 'gestor' explicitamente
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

  // Checagem extra de segurança: verifica se o token realmente existe no navegador
  const hasToken = !!localStorage.getItem("access_token");

  if (loading) return null;

  // Se o context diz que não está autenticado OU o token sumiu do storage
  if (!isAuthenticated || !hasToken) {
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
