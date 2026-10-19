/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api, { renovarSessao } from "../services/api";
import {
  AUTH_USER_KEY,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../services/authToken";

// 'student' e 'manager' foram removidos daqui: o backend nunca emite esses
// valores em `role` (ver User.ROLE_CHOICES) — só existiam neste tipo e
// quebravam o `tsc -b` (usado pelo `npm run build`) em ProtectedRoute.tsx.
type UserRole =
  | "admin"
  | "company"
  | "candidate"
  | "gestor"
  | "aluno"
  | "empresa";

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function lerUsuarioSalvo(): User | null {
  const bruto = localStorage.getItem(AUTH_USER_KEY);
  if (!bruto || bruto === "undefined" || bruto === "null") return null;
  try {
    return JSON.parse(bruto) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => lerUsuarioSalvo());
  const [token, setToken] = useState<string | null>(() => getAccessToken());

  // `loading` só é true quando há de fato um refresh silencioso pela frente
  // — ou seja, quando existe um perfil salvo indicando que já houve login
  // neste navegador. Sem essa espera, `ProtectedRoute` avaliaria "não
  // autenticado" no primeiro render de todo F5 (o token mora em memória e
  // ainda não existe) e chutaria o usuário para /login com a sessão válida.
  // Quem nunca logou não espera nada.
  const [loading, setLoading] = useState(() => lerUsuarioSalvo() !== null);

  /**
   * Boot: tenta restaurar a sessão a partir do cookie httpOnly.
   *
   * Este passo é a contrapartida de tirar o token do `localStorage`. O access
   * token vive só em memória, então some a cada recarga de página; o cookie
   * de refresh (que o JavaScript não enxerga) é o que prova que a sessão
   * ainda vale, e o backend devolve um access token novo em troca.
   */
  useEffect(() => {
    let ativo = true;

    // Sem perfil salvo, nunca houve login neste navegador — não vale gastar
    // uma requisição que já se sabe que vai falhar. (`loading` já nasceu
    // false nesse caso, na inicialização do estado acima.)
    if (!lerUsuarioSalvo()) {
      return;
    }

    renovarSessao()
      .then((access) => {
        if (!ativo) return;
        setToken(access);
      })
      .catch(() => {
        if (!ativo) return;
        // Cookie expirado ou revogado: limpa o que sobrou na interface.
        clearAccessToken();
        localStorage.removeItem(AUTH_USER_KEY);
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    // O corpo da resposta traz `access` mas NÃO traz mais `refresh` — esse
    // vai num cookie httpOnly que o navegador guarda sozinho.
    const response = await api.post("users/login/", {
      username: email,
      password: password,
    });

    const { access, role, name, id } = response.data;

    const userData: User = { id, name, email, role: role as UserRole };

    setAccessToken(access);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));

    setToken(access);
    setUser(userData);

    return userData;
  };

  const logout = () => {
    // Logout de verdade acontece no SERVIDOR: `POST users/logout/` revoga
    // todos os tokens já emitidos para o usuário e apaga o cookie. Antes o
    // logout era só `localStorage.clear()` — o token continuava válido no
    // backend até expirar, então "sair da conta" num computador
    // compartilhado não protegia nada.
    const finalizar = () => {
      clearAccessToken();
      localStorage.clear();
      sessionStorage.clear();
      setToken(null);
      setUser(null);
      window.location.replace("/login?reset=true");
    };

    api.post("users/logout/").then(finalizar).catch(finalizar);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve estar dentro do AuthProvider");
  return context;
}
