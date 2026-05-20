import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import type { JobsResponse, UsageResponse } from "../types";
import { api, downloadUrl, getApiError } from "../lib/api";

function bytes(value: number | null | undefined) {
  if (!value) return "0 B";
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export function Dashboard() {
  const [jobs, setJobs] = useState<JobsResponse["jobs"]>([]);
  const [usage, setUsage] = useState<UsageResponse["usage"] | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [jobsRes, usageRes] = await Promise.all([api.get<JobsResponse>("/compress/jobs"), api.get<UsageResponse>("/user/usage")]);
      setJobs(jobsRes.data.jobs);
      setUsage(usageRes.data.usage);
    } catch (err) {
      setError(getApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  async function remove(id: string) {
    await api.delete(`/compress/jobs/${id}`);
    setJobs((current) => current.filter((job) => job.id !== id));
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
      {usage && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">Plan</p><p className="text-2xl font-semibold">{usage.plan}</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">Used today</p><p className="text-2xl font-semibold">{usage.usedToday}/{usage.dailyLimit}</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">Max file</p><p className="text-2xl font-semibold">{usage.maxFileSizeMb} MB</p></div>
        </div>
      )}
      <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 font-semibold dark:border-slate-800">Compression history</div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {jobs.length === 0 && <p className="p-4 text-sm text-slate-500">No jobs yet.</p>}
          {jobs.map((job) => (
            <div key={job.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-medium">{job.originalFileName}</p>
                <p className="text-sm text-slate-500">{job.status} · {bytes(job.originalSize)} to {bytes(job.compressedSize)} · {job.compressionPercentage}% smaller</p>
              </div>
              <div className="flex gap-2">
                {job.downloadToken && <a className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 dark:border-slate-700" href={downloadUrl(job.downloadToken)} aria-label="Download"><Download size={17} /></a>}
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 dark:border-slate-700" onClick={() => void remove(job.id)} aria-label="Delete"><Trash2 size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
