import type { ReactNode } from 'react';
import {
  Building2,
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Shield,
  Users,
  Settings,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { WalletBar } from '../WalletBar';
import { isUsingBackend } from '../../lib/dataSource';

export type PageId = 'dashboard' | 'marketplace' | 'portfolio' | 'kyc' | 'governance' | 'admin';

type Props = {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenLogin: () => void;
  children: ReactNode;
};

const NAV: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'marketplace', label: 'Investments', icon: TrendingUp },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet },
  { id: 'kyc', label: 'Verify', icon: Shield },
  { id: 'governance', label: 'Governance', icon: Users },
];

export function AppLayout({
  currentPage,
  onNavigate,
  onOpenLogin,
  children,
}: Props) {
  const { user, userRole, signOut, setUserRole } = useAuth();
  const nav = [...NAV, ...(userRole === 'admin' ? [{ id: 'admin' as const, label: 'Tokenize', icon: Settings }] : [])];
  const isHome = currentPage === 'dashboard';

  return (
    <div className={`min-h-screen flex flex-col ${isHome ? 'bg-dark-hero' : 'bg-brand-cream'}`}>
      <header
        className={`sticky top-0 z-50 shadow-md ${
          isHome ? 'bg-dark-hero/95 backdrop-blur border-b border-white/10' : 'bg-white border-b border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 h-16">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 shrink-0"
            >
              <div className={`p-2 rounded-lg ${isHome ? 'bg-accent-cyan/20' : 'bg-brand-500'}`}>
                <Building2 className={`w-5 h-5 ${isHome ? 'text-accent-cyan' : 'text-white'}`} />
              </div>
              <span
                className={`font-bold text-lg tracking-tight hidden sm:block ${
                  isHome ? 'text-white' : 'text-brand-navy'
                }`}
              >
                RealEstate Token
              </span>
            </button>

            <nav className="hidden lg:flex items-center gap-1">
              {nav.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === id
                      ? isHome
                        ? 'text-accent-cyan'
                        : 'text-brand-navy border-b-2 border-brand-navy -mb-px rounded-none'
                      : isHome
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-500 hover:text-brand-navy'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className={`hidden md:block ${isHome ? '[&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white' : ''}`}>
                <WalletBar light={isHome} />
              </div>
              {userRole === 'admin' && (
                <select
                  value={userRole}
                  onChange={(e) =>
                    setUserRole(e.target.value as 'investor' | 'issuer' | 'admin')
                  }
                  className={`hidden sm:block px-2 py-1.5 rounded-lg text-xs ${
                    isHome
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'border border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="investor">Investor view</option>
                  <option value="admin">Issuer view</option>
                </select>
              )}
              {user ? (
                <>
                  <span
                    className={`hidden xl:inline text-xs max-w-[120px] truncate ${
                      isHome ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className={`p-2 rounded-lg ${isHome ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100'}`}
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className={
                    isHome
                      ? 'px-4 py-2 rounded-full border border-white/40 text-white text-xs font-semibold hover:bg-white/10'
                      : 'btn-primary text-xs py-2'
                  }
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Log in / Sign up
                </button>
              )}
            </div>
          </div>
        </div>

        <nav
          className={`lg:hidden border-t flex overflow-x-auto px-2 gap-1 ${
            isHome ? 'border-white/10' : 'border-slate-200 bg-white'
          }`}
        >
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap ${
                currentPage === id
                  ? isHome
                    ? 'text-accent-cyan border-b-2 border-accent-cyan'
                    : 'text-brand-navy border-b-2 border-brand-navy'
                  : isHome
                    ? 'text-slate-500'
                    : 'text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-4 gap-8 text-sm">
          <div className="md:col-span-2">
            <p className="font-display font-semibold text-brand-navy text-lg">RealEstate Token</p>
            <p className="text-slate-500 mt-2 max-w-md">
              End-to-end real estate tokenization — fractional offerings, compliant onboarding, and
              investor-ready property pages.
            </p>
          </div>
          <div>
            <p className="font-semibold text-brand-navy mb-2">Investors</p>
            <ul className="space-y-1 text-slate-500">
              <li>Browse offerings</li>
              <li>Portfolio & distributions</li>
              <li>Identity verification</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-brand-navy mb-2">Issuers</p>
            <ul className="space-y-1 text-slate-500">
              <li>Tokenize property</li>
              <li>Launch offerings</li>
              <li>Manage investors</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} RealEstate Token
          {isUsingBackend() && <span className="text-brand-600"> · Live platform</span>}
        </div>
      </footer>
    </div>
  );
}
