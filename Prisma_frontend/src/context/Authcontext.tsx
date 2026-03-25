/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode } from "react";
import api from "../services/api";

// 1. Tipagem (O que o usuário tem)
type UserRole = "student" | "manager" | "company"| "aluno" | "candidate" | "gestor" | "empresa";
interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

// 2. O que o nosso "interfone" de autenticação oferece para o resto do app
interface AuthContextType {
  user: User | null;
  token: string | null;
  // Mudamos aqui: removemos o 'role' dos argumentos e mudamos o retorno para Promise<User>
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
}

// 3. Criando o contexto (a caixa de dados)
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// 4. O Provedor (O motor que faz tudo funcionar)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("auth_user");
    const storedToken = localStorage.getItem("access_token");
    if (storedUser && storedToken) {
      return JSON.parse(storedUser);
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem("access_token");
    return storedToken || null;
  });

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await api.post("token/", {
        username: email,
        password: password,
      });

      const { access, refresh } = response.data;

      // IMPORTANTE: Se o seu backend não envia a role no 'token/',
      // vamos assumir 'student' por enquanto para não travar seu teste,
      // mas o ideal é que o response.data traga o 'role'.
      const userData: User = {
        id: 1,
        name: email.split("@")[0],
        email,
        role: response.data.role || "student",
      };

      setUser(userData);
      setToken(access);

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("auth_user", JSON.stringify(userData));

      return userData; // Retornando o User para satisfazer a Promise<User>
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 5. O Gancho (Hook) para usar em outras telas
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve estar dentro do AuthProvider");
  return context;
}
