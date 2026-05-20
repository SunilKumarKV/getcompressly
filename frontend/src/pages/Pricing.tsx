import { Check } from "lucide-react";

export function Pricing() {
  const plans = [
    { name: "Free", price: "$0", features: ["5 daily compressions", "25 MB max file", "3 files per batch", "Guest uploads"] },
    { name: "Pro", price: "$12", features: ["100 daily compressions", "100 MB max file", "20 files per batch", "Payments-ready Razorpay/Stripe structure"] }
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">Pricing</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-3 text-4xl font-bold">{plan.price}<span className="text-base font-normal text-slate-500">/mo</span></p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => <li className="flex gap-2 text-sm" key={feature}><Check className="text-emerald-600" size={18} />{feature}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
