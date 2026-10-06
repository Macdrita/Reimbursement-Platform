"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/lib/types";
import { authAPI } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    managerId?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const clearSession = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    };

    const redirectIfLoggedOut = () => {
      if (localStorage.getItem("token")) return;

      clearSession();
      if (window.location.pathname.startsWith("/dashboard")) {
        router.replace("/login");
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "token" && event.newValue === null) {
        redirectIfLoggedOut();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("popstate", redirectIfLoggedOut);
    window.addEventListener("pageshow", redirectIfLoggedOut);

    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        authAPI
          .getMe()
          .then((res) => {
            if (localStorage.getItem("token") !== storedToken) return;
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          })
          .catch(clearSession)
          .finally(() => setIsLoading(false));
      } catch {
        clearSession();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("popstate", redirectIfLoggedOut);
      window.removeEventListener("pageshow", redirectIfLoggedOut);
    };
  }, [router]);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    managerId?: string;
  }) => {
    const res = await authAPI.register(data);
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
