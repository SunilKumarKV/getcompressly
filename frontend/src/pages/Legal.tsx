export function Privacy() {
  return <Legal title="Privacy Policy" copy="GetCompressly stores uploaded files temporarily for compression and download. Files expire according to backend configuration, and downloads use secure tokens rather than local paths." />;
}

export function Terms() {
  return <Legal title="Terms of Service" copy="Use GetCompressly for files you are allowed to process. Placeholder billing integrations are present for future Razorpay or Stripe plans." />;
}

function Legal({ title, copy }: { title: string; copy: string }) {
  return <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8"><h1 className="text-3xl font-bold">{title}</h1><p className="mt-4 leading-8 text-slate-600 dark:text-slate-300">{copy}</p></section>;
}
