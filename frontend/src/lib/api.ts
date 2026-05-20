import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
const tokenKey = "getcompressly_token";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenKey);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function saveToken(token: string) {
  localStorage.setItem(tokenKey, token);
}

export function clearToken() {
  localStorage.removeItem(tokenKey);
}

export function getApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export function downloadUrl(token: string) {
  return `${API_URL}/compress/download/${token}`;
}
