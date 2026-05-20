import axios, { AxiosHeaders } from "axios";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
const tokenKey = "getcompressly_token";

export const api = axios.create({ baseURL: API_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenKey);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const attempted = error.config ? AxiosHeaders.from(error.config.headers).has("x-refresh-attempted") : false;
    if (axios.isAxiosError(error) && error.response?.status === 401 && error.config && !attempted) {
      try {
        const { data } = await axios.post<{ token: string }>(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        saveToken(data.token);
        const headers = AxiosHeaders.from(error.config.headers);
        headers.set("Authorization", `Bearer ${data.token}`);
        headers.set("x-refresh-attempted", "1");
        error.config.headers = headers;
        return api.request(error.config);
      } catch {
        clearToken();
      }
    }
    return Promise.reject(error);
  }
);

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
