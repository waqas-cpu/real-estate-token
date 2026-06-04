import { Wallet } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export function WalletBar({ light = false }: { light?: boolean }) {
  const { investorWallet, setInvestorWallet } = useAuth();

  const box = light
    ? 'bg-white/10 border-white/20'
    : 'bg-white border border-slate-200 shadow-sm';
  const icon = light ? 'text-brand-100' : 'text-brand-600';
  const input = light
    ? 'bg-transparent text-xs text-white w-32 sm:w-40 placeholder:text-slate-400'
    : 'bg-transparent text-xs text-slate-800 w-32 sm:w-40 placeholder:text-slate-400';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${box}`}>
      <Wallet className={`w-4 h-4 shrink-0 ${icon}`} />
      <input
        type="text"
        value={investorWallet}
        onChange={(e) => setInvestorWallet(e.target.value)}
        placeholder="Wallet 0x…"
        className={`${input} focus:outline-none`}
        title="Used for investments and compliance checks"
      />
    </div>
  );
}
