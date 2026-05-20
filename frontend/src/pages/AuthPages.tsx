import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-145px)] max-w-md items-center px-4 py-12">
      <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="mt-2 text-sm text-slate-500">{mode === "login" ? "Log in to see your compression history." : "Start saving your compression history."}</p>
        {mode === "register" && <input className="mt-5 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-3 dark:border-slate-700" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />}
        <input className="mt-4 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-3 dark:border-slate-700" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="mt-4 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-3 dark:border-slate-700" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
        <button disabled={loading} className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white disabled:opacity-60">
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === "login" ? "New here? " : "Already registered? "}
          <Link className="text-emerald-600" to={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Login"}</Link>
        </p>
      </form>
    </section>
  );
}

export function Login() {
  return <AuthForm mode="login" />;
}

export function Register() {
  return <AuthForm mode="register" />;
}
