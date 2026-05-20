import { useEffect, useState } from "react";
import { api, getApiError } from "../lib/api";

interface Stats { users: number; jobs: number; completed: number; failed: number; usageToday: number }

export function Admin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get<{ stats: Stats }>("/admin/stats").then((res) => setStats(res.data.stats)).catch((err) => setError(getApiError(err)));
  }, []);
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Operational stats placeholder for future billing, moderation, and support tooling.</p>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
      {stats && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(stats).map(([key, value]) => <div key={key} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm capitalize text-slate-500">{key}</p><p className="text-2xl font-semibold">{value}</p></div>)}</div>}
    </section>
  );
}
