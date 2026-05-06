/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode } from "react";
import api from "../services/api";

// Adicionado 'student' e 'manager' para bater com a lógica do Login
type UserRole =
  | "admin"
  | "company"
  | "candidate"
  | "gestor"
  | "aluno"
  | "empresa"
  | "student"
  | "manager";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading] = useState(false);

  const getSafeStorage = (key: string) => {
    const value = localStorage.getItem(key);
    if (!value || value === "undefined" || value === "null" || value === "")
      return null;
    return value;
  };

  const [token, setToken] = useState<string | null>(() =>
    getSafeStorage("access_token"),
  );

  const [user, setUser] = useState<User | null>(() => {
    const storedUser = getSafeStorage("auth_user");
    const hasToken = !!getSafeStorage("access_token");

    if (storedUser && hasToken) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = async (email: string, password: string): Promise<User> => {
    try {
      // Ajustado para bater com o seu api.ts (users/login/)
      const response = await api.post("users/login/", {
        username: email,
        password: password,
      });

      const { access, refresh, role, name, id } = response.data;

      const userData: User = {
        id,
        name,
        email,
        role: role as UserRole,
      };

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("auth_user", JSON.stringify(userData));

      setToken(access);
      setUser(userData);

      return userData;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    window.location.replace("/login?reset=true");
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
