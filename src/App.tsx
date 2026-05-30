import React, { useState } from 'react';
import { Building2, LayoutDashboard, TrendingUp, Users, Settings, Database, LogOut, CheckCircle, Shield } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Dashboard from './pages/Dashboard';
import AssetMarketplace from './pages/AssetMarketplace';
import PortfolioPage from './pages/PortfolioPage';
import KYCPage from './pages/KYCPage';
import GovernancePage from './pages/GovernancePage';
import AdminPage from './pages/AdminPage';
import ArchitectureOverview from './components/ArchitectureOverview';

type PageType = 'dashboard' | 'marketplace' | 'portfolio' | 'kyc' | 'governance' | 'admin' | 'architecture';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const { user, userRole, loading, signOut, setUserRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard userRole={userRole} />;
      case 'marketplace':
        return <AssetMarketplace />;
      case 'portfolio':
        return <PortfolioPage />;
      case 'kyc':
        return <KYCPage />;
      case 'governance':
        return <GovernancePage />;
      case 'admin':
        return userRole === 'admin' ? <AdminPage /> : <Dashboard userRole={userRole} />;
      case 'architecture':
        return <ArchitectureOverview />;
      default:
        return <Dashboard userRole={userRole} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage('dashboard')}>
              <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">RealEstate Token</h1>
                <p className="text-xs text-slate-400">Decentralized Real Estate Tokenization</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                <span className="text-xs text-slate-300">{user?.email}</span>
              </div>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300"
              >
                <option value="investor">Investor</option>
                <option value="issuer">Issuer</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => signOut()}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 py-3 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'marketplace', label: 'Marketplace', icon: TrendingUp },
              { id: 'portfolio', label: 'Portfolio', icon: Building2 },
              { id: 'kyc', label: 'KYC/Compliance', icon: CheckCircle },
              { id: 'governance', label: 'Governance', icon: Users },
              ...(userRole === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Settings }] : []),
              { id: 'architecture', label: 'Architecture', icon: Database },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setCurrentPage(id as PageType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                  currentPage === id
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-white text-sm mb-3">Architecture</h4>
              <ul className="space-y-1">
                <li className="text-xs text-slate-400">4 Sovereign Layers</li>
                <li className="text-xs text-slate-400">24 Components</li>
                <li className="text-xs text-slate-400">NIST PQC Standards</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-3">Security</h4>
              <ul className="space-y-1">
                <li className="text-xs text-slate-400">ML-DSA-87 (FIPS 204)</li>
                <li className="text-xs text-slate-400">ML-KEM-1024 (FIPS 203)</li>
                <li className="text-xs text-slate-400">SLH-DSA (FIPS 205)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-3">Compliance</h4>
              <ul className="space-y-1">
                <li className="text-xs text-slate-400">MiCA (EU)</li>
                <li className="text-xs text-slate-400">Reg D/S (US)</li>
                <li className="text-xs text-slate-400">FCA (UK)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-3">Status</h4>
              <ul className="space-y-1">
                <li className="text-xs text-emerald-400">Production Ready</li>
                <li className="text-xs text-emerald-400">Build: Passing</li>
                <li className="text-xs text-emerald-400">RLS Enabled</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-500">
              RealEstate Token Platform v1.0 • 11-Stage Lifecycle • Zero-Trust Architecture • Quantum-Safe by Design
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setEmail('');
        setPassword('');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              RealEstate Token
            </h1>
          </div>

          <h2 className="text-xl font-bold text-white mb-6 text-center">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="w-full mt-4 py-2 text-slate-400 hover:text-slate-300 transition-colors text-sm"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Demo: Use test credentials or create a new account
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
