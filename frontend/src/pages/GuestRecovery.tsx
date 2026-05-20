import { useState } from "react";
import type { JobsResponse } from "../types";
import { api, downloadUrl, getApiError } from "../lib/api";

export function GuestRecovery() {
  const [token, setToken] = useState(localStorage.getItem("getcompressly_guest_recovery") ?? "");
  const [jobs, setJobs] = useState<JobsResponse["jobs"]>([]);
  const [error, setError] = useState("");
  async function recover() {
    setError("");
    try {
      const { data } = await api.get<JobsResponse>(`/guest/recover/${encodeURIComponent(token)}`);
      setJobs(data.jobs);
    } catch (err) {
      setError(getApiError(err));
    }
  }
  return <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"><h1 className="text-3xl font-bold">Recover guest jobs</h1><div className="mt-6 flex flex-col gap-3 sm:flex-row"><input className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-3 dark:border-slate-700" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Recovery token" /><button onClick={() => void recover()} className="rounded-lg bg-emerald-600 px-5 py-3 text-white">Recover</button></div>{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}<div className="mt-6 grid gap-3">{jobs.map((job) => <div key={job.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="font-medium">{job.originalFileName}</p><p className="text-sm text-slate-500">{job.status} · {job.stage}</p>{job.downloadToken && <a className="mt-3 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-slate-950" href={downloadUrl(job.downloadToken)}>Download</a>}</div>)}</div></section>;
}
