import axios from "axios";
import { useEffect, useState, type ReactNode } from "react";
import { api, TOKEN_KEY } from "../services/api";
import type { AuthResponse, User } from "../types";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    api
      .get<{ user: User }>("/auth/me")
      .then((response) => setUser(response.data.user))
      .catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          return;
        }
        console.error("Failed to restore session:", error);
        setSessionError("Couldn't verify your session. Check your connection and log in again.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setSessionError("");
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await api.post<AuthResponse>("/auth/register", { name, email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setSessionError("");
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
