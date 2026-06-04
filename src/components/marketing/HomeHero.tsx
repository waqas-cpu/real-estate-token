import { Search, ArrowRight, BarChart3 } from 'lucide-react';

import { PREMIUM_PROPERTIES_PORTFOLIO_IMAGE } from '../../lib/propertyCatalog';

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  onInvest: () => void;
  onSearchSubmit?: () => void;
};

export function HomeHero({ search, onSearchChange, onInvest, onSearchSubmit }: Props) {
  return (
    <section className="relative overflow-hidden bg-dark-hero text-white min-h-[520px]">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_80%_20%,_#26d0ce33_0%,_transparent_55%)]" />
      <div
        className="absolute bottom-0 left-0 right-0 h-32 opacity-30"
        style={{
          background:
            'linear-gradient(transparent, #0a0e1b), repeating-linear-gradient(90deg, #26d0ce22 0 1px, transparent 1px 48px)',
          transform: 'perspective(400px) rotateX(60deg)',
          transformOrigin: 'bottom',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20 relative grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-accent-cyan text-sm font-semibold uppercase tracking-widest mb-4">
            Real estate tokenization
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">
            Own a piece of premium property, digitally
          </h1>
          <p className="mt-5 text-slate-400 text-lg max-w-lg">
            Fractional token offerings with compliant onboarding, transparent funding progress, and
            investor-ready property pages.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onInvest}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-accent-cyan text-dark-hero font-bold text-sm hover:brightness-110 transition-all"
            >
              Invest now
              <ArrowRight className="w-4 h-4" />
            </button>
            <form
              className="flex-1 flex items-center bg-white/5 border border-white/25 rounded-full overflow-hidden pl-4 pr-2"
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit?.();
              }}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search properties or location…"
                className="flex-1 py-3 px-3 bg-transparent text-white placeholder:text-slate-500 text-sm focus:outline-none"
              />
            </form>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="glass-card p-4 max-w-md ml-auto">
            <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-800">
              <img
                src={PREMIUM_PROPERTIES_PORTFOLIO_IMAGE}
                alt="Premium properties portfolio"
                className="w-full h-full object-cover"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-hero/90 via-transparent to-transparent pointer-events-none" />
            </div>
            <p className="text-accent-cyan text-xs font-bold uppercase tracking-wider mt-4">
              Tokenized assets
            </p>
            <p className="font-display text-xl font-semibold mt-1">Premium properties portfolio</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <p className="text-sm text-slate-400">Curated institutional-grade listings</p>
              <div className="flex items-end gap-1 h-12">
                {[40, 65, 45, 80, 55].map((h, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-t bg-accent-cyan/80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-[10px] text-slate-500 uppercase">
              <span className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3 text-accent-cyan" /> Growth
              </span>
              <span>Returns</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
