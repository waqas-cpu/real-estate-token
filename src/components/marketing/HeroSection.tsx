import { ArrowRight, Shield, Coins, LineChart } from 'lucide-react';

type Props = {
  onBrowse: () => void;
  onLearnTokenize?: () => void;
};

export function HeroSection({ onBrowse, onLearnTokenize }: Props) {
  return (
    <section className="relative overflow-hidden bg-brand-navy text-white">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_#0d9488_0%,_transparent_50%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 relative">
        <div className="max-w-2xl">
          <p className="text-brand-100 text-sm font-semibold uppercase tracking-wider mb-4">
            Real estate tokenization
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">
            Own a piece of premium property, digitally
          </h1>
          <p className="mt-5 text-lg text-slate-300 leading-relaxed">
            Browse verified token offerings, invest from your wallet, and track income — built like
            leading platforms such as Arrived and Fundrise, with blockchain-backed transparency.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={onBrowse} className="btn-primary bg-brand-500 hover:bg-brand-600">
              View live offerings
              <ArrowRight className="w-4 h-4" />
            </button>
            {onLearnTokenize && (
              <button type="button" onClick={onLearnTokenize} className="btn-secondary border-white/30 text-white hover:bg-white/10">
                Tokenize your property
              </button>
            )}
          </div>
        </div>
        <div className="mt-12 grid grid-cols-3 gap-4 max-w-xl">
          <Stat icon={<Coins className="w-5 h-5" />} label="Fractional tokens" value="From $100*" />
          <Stat icon={<Shield className="w-5 h-5" />} label="Compliant flow" value="KYC built-in" />
          <Stat icon={<LineChart className="w-5 h-5" />} label="Full pipeline" value="4 layers" />
        </div>
        <p className="mt-4 text-xs text-slate-500">*Minimum varies by offering</p>
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
      <div className="text-brand-100 mb-2">{icon}</div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-sm mt-0.5">{value}</p>
    </div>
  );
}
