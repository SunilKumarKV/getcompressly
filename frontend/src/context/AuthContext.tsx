import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ApiUser } from "@getcompressly/shared";
import type { AuthResponse } from "../types";
import { api, clearToken, getApiError, saveToken } from "../lib/api";

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: ApiUser }>("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        try {
          const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
          saveToken(data.token);
          setUser(data.user);
        } catch (error) {
          throw new Error(getApiError(error));
        }
      },
      async register(name, email, password) {
        try {
          const { data } = await api.post<AuthResponse>("/auth/register", { name, email, password });
          saveToken(data.token);
          setUser(data.user);
        } catch (error) {
          throw new Error(getApiError(error));
        }
      },
      logout() {
        void api.post("/auth/logout").catch(() => undefined);
        clearToken();
        setUser(null);
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
