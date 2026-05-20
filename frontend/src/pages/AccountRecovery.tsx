import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, getApiError } from "../lib/api";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post<{ message: string }>("/auth/forgot-password", { email });
      setMessage(data.message);
    } catch (err) {
      setError(getApiError(err));
    }
  }
  return <SimpleForm title="Forgot password" message={message} error={error} onSubmit={submit}><input className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-3 dark:border-slate-700" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /><button className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white">Send reset link</button></SimpleForm>;
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post<{ message: string }>("/auth/reset-password", { token: params.get("token"), password });
      setMessage(data.message);
    } catch (err) {
      setError(getApiError(err));
    }
  }
  return <SimpleForm title="Reset password" message={message} error={error} onSubmit={submit}><input className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-3 dark:border-slate-700" placeholder="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /><button className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white">Reset password</button></SimpleForm>;
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit() {
    setError("");
    try {
      const { data } = await api.post<{ message: string }>("/auth/verify-email", { token: params.get("token") });
      setMessage(data.message);
    } catch (err) {
      setError(getApiError(err));
    }
  }
  return <SimpleForm title="Verify email" message={message} error={error}><button onClick={() => void submit()} className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white">Verify email</button></SimpleForm>;
}

function SimpleForm({ title, message, error, onSubmit, children }: { title: string; message?: string; error?: string; onSubmit?: (event: FormEvent) => void; children: React.ReactNode }) {
  return <section className="mx-auto grid min-h-[calc(100vh-145px)] max-w-md items-center px-4 py-12"><form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h1 className="text-2xl font-bold">{title}</h1>{message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}<div className="mt-5">{children}</div></form></section>;
}
