import axios from "axios";

export const TOKEN_KEY = "tripnest_token";
const apiBaseUrl = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "")
  : "/api";

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  return config;
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; errors?: { message: string }[] }
      | undefined;
    return data?.errors?.[0]?.message ?? data?.message ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
