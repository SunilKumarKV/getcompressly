import { useMemo, useState } from "react";
import { Download, UploadCloud, XCircle } from "lucide-react";
import type { CompressionLevel } from "@getcompressly/shared";
import type { JobsResponse } from "../types";
import { api, downloadUrl, getApiError } from "../lib/api";

const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const maxMb = 25;

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`;
}

export function Compress() {
  const [files, setFiles] = useState<File[]>([]);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<JobsResponse["jobs"]>([]);

  const validation = useMemo(() => {
    const invalid = files.find((file) => !allowed.includes(file.type) || file.size > maxMb * 1024 * 1024);
    return invalid ? `${invalid.name} is not supported or exceeds ${maxMb} MB.` : "";
  }, [files]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((current) => [...current, ...Array.from(list)]);
    setError("");
  }

  async function submit() {
    if (files.length === 0 || validation) {
      setError(validation || "Choose at least one PDF or image.");
      return;
    }
    setLoading(true);
    setProgress(0);
    setError("");
    setJobs([]);
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append("compressionLevel", level);
    try {
      const { data } = await api.post<JobsResponse>("/compress", form, {
        onUploadProgress: (event) => setProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 50)
      });
      setJobs(data.jobs);
      setFiles([]);
      setProgress(100);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Compress files</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Drop PDFs, JPG, PNG, JPEG, or WebP files. Downloads expire automatically.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
          <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg bg-slate-50 p-8 text-center dark:bg-slate-950">
            <UploadCloud className="mb-4 text-emerald-600" size={42} />
            <span className="text-lg font-semibold">Drag files here or browse</span>
            <span className="mt-2 text-sm text-slate-500">Multiple uploads supported</span>
            <input className="hidden" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => addFiles(e.target.files)} />
          </label>
          {files.length > 0 && (
            <div className="mt-5 space-y-3">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <span className="truncate pr-3">{file.name}</span>
                  <span className="text-slate-500">{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <label className="text-sm font-medium">Compression level</label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["low", "medium", "high"] as CompressionLevel[]).map((item) => (
              <button key={item} onClick={() => setLevel(item)} className={`rounded-lg border px-3 py-2 text-sm capitalize ${level === item ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950" : "border-slate-200 dark:border-slate-800"}`}>
                {item}
              </button>
            ))}
          </div>
          {loading && <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full bg-emerald-600" style={{ width: `${progress}%` }} /></div>}
          {(error || validation) && <p className="mt-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"><XCircle size={18} />{error || validation}</p>}
          <button onClick={submit} disabled={loading} className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white disabled:opacity-60">
            {loading ? "Processing..." : "Compress now"}
          </button>
        </aside>
      </div>
      {jobs.length > 0 && (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Results</h2>
          <div className="mt-4 grid gap-3">
            {jobs.map((job) => (
              <div key={job.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[1fr_auto] dark:border-slate-800">
                <div>
                  <p className="font-medium">{job.originalFileName}</p>
                  <p className="text-sm text-slate-500">{job.status === "COMPLETED" ? `${formatBytes(job.originalSize)} to ${formatBytes(job.compressedSize)} (${job.compressionPercentage}% smaller)` : job.errorMessage}</p>
                </div>
                {job.downloadToken && <a className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-slate-950" href={downloadUrl(job.downloadToken)}><Download size={16} />Download</a>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
