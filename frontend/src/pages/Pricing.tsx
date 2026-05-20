import { useState } from "react";
import { Check } from "lucide-react";
import { api, getApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function Pricing() {
  const { user } = useAuth();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const plans = [
    { name: "Free", price: "$0", features: ["5 daily compressions", "10 MB max file", "Small batches", "Guest uploads"], cta: null },
    { name: "Pro", price: interval === "monthly" ? "$12" : "$120", features: ["100 daily compressions", "200 MB max file", "Priority queue", "Billing portal"], cta: "Upgrade" }
  ];
  async function checkout() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post<{ url: string }>("/billing/create-checkout-session", { interval });
      window.location.href = data.url;
    } catch (err) {
      setError(getApiError(err));
      setLoading(false);
    }
  }
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Pricing</h1>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
          {(["monthly", "yearly"] as const).map((item) => (
            <button key={item} onClick={() => setInterval(item)} className={`rounded-md px-4 py-2 text-sm capitalize ${interval === item ? "bg-emerald-600 text-white" : ""}`}>{item}</button>
          ))}
        </div>
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-3 text-4xl font-bold">{plan.price}<span className="text-base font-normal text-slate-500">{plan.name === "Pro" ? interval === "monthly" ? "/mo" : "/yr" : ""}</span></p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => <li className="flex gap-2 text-sm" key={feature}><Check className="text-emerald-600" size={18} />{feature}</li>)}
            </ul>
            {plan.cta && <button disabled={loading} onClick={() => void checkout()} className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white disabled:opacity-60">{loading ? "Opening checkout..." : plan.cta}</button>}
          </div>
        ))}
      </div>
    </section>
  );
}
