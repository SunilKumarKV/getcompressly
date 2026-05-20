import { Link } from "react-router-dom";
import { ArrowRight, FileImage, FileText, ShieldCheck, type LucideIcon } from "lucide-react";

const features: Array<{ title: string; copy: string; Icon: LucideIcon }> = [
  { title: "Images", copy: "JPG, PNG, and WebP quality presets powered by sharp.", Icon: FileImage },
  { title: "PDFs", copy: "Ghostscript first, qpdf fallback, clear server guidance when unavailable.", Icon: FileText },
  { title: "Secure", copy: "JWT auth, rate limits, MIME detection, and tokenized downloads.", Icon: ShieldCheck }
];

export function Home() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-145px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-600">Fast local-first compression</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">GetCompressly</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          Compress PDFs and images with a clean SaaS workflow: guest uploads, user history, usage limits, secure token downloads, and deployment-ready architecture.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/compress" className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white">
            Start compressing <ArrowRight size={18} />
          </Link>
          <Link to="/pricing" className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 font-medium dark:border-slate-700">
            View plans
          </Link>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4">
          {features.map(({ title, copy, Icon }) => (
            <div key={title} className="flex gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Icon size={19} />
              </span>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
