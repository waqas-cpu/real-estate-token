import { FileText, Rocket, Users } from 'lucide-react';

const STEPS = [
  {
    icon: FileText,
    title: 'Structure & verify',
    desc: 'Property is ingested, valued, and compliance-checked before any tokens are issued.',
  },
  {
    icon: Rocket,
    title: 'Launch offering',
    desc: 'Security tokens go live with clear economics, dates, and investor documents.',
  },
  {
    icon: Users,
    title: 'Onboard investors',
    desc: 'Investors browse, verify identity, subscribe, and track portfolio performance.',
  },
];

export function TokenizationSteps() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <p className="text-brand-600 text-sm font-semibold uppercase tracking-wider text-center">
          How it works
        </p>
        <h2 className="section-title text-center mt-2">Tokenization in three steps</h2>
        <p className="text-slate-500 text-center max-w-xl mx-auto mt-3">
          The same journey used by institutional tokenization platforms — simplified for property
          owners and everyday investors.
        </p>
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative text-center md:text-left">
              <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-4">
                <s.icon className="w-6 h-6" />
              </span>
              <span className="absolute top-0 left-14 md:left-12 text-5xl font-display font-bold text-slate-100 -z-10">
                {i + 1}
              </span>
              <h3 className="font-semibold text-brand-navy text-lg">{s.title}</h3>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
