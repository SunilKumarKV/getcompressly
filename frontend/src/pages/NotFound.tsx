import { Link } from "react-router-dom";

export function NotFound() {
  return <section className="mx-auto grid min-h-[calc(100vh-145px)] max-w-xl place-items-center px-4 text-center"><div><h1 className="text-4xl font-bold">Page not found</h1><p className="mt-3 text-slate-500">The page you requested does not exist.</p><Link className="mt-6 inline-flex rounded-lg bg-emerald-600 px-5 py-3 text-white" to="/">Go home</Link></div></section>;
}
