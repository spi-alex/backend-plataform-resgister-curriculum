import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

type UserRole = "student" | "manager" | "company";

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 🔁 Carrega do localStorage ao iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    const storedToken = localStorage.getItem("auth_token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, []);

  const login = async (
    email: string,
    password: string,
    role: UserRole
  ) => {
    // SIMULAÇÃO DE BACKEND (remover quando integrar API)
    const fakeResponse = {
      user: {
        id: 1,
        name: email.split("@")[0],
        email,
        role,
      },
      token: "fake-jwt-token-123456",
    };

    // Quando integrar API será algo assim:
    /*
    const response = await api.post("/login", { email, password });
    const { user, token } = response.data;
    */

    setUser(fakeResponse.user);
    setToken(fakeResponse.token);

    localStorage.setItem(
      "auth_user",
      JSON.stringify(fakeResponse.user)
    );
    localStorage.setItem("auth_token", fakeResponse.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve estar dentro do AuthProvider");
  }
  return context;
}