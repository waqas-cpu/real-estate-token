import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { AppLayout, type PageId } from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import AssetMarketplace from './pages/AssetMarketplace';
import PortfolioPage from './pages/PortfolioPage';
import KYCPage from './pages/KYCPage';
import GovernancePage from './pages/GovernancePage';
import AdminPage from './pages/AdminPage';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const { user, loading, userRole } = useAuth();

  const handleNavigate = (page: PageId, searchQuery?: string) => {
    if (page === 'marketplace' && searchQuery !== undefined) {
      setMarketplaceSearch(searchQuery);
    }
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard userRole={userRole} onNavigate={handleNavigate} />;
      case 'marketplace':
        return (
          <AssetMarketplace
            initialSearch={marketplaceSearch}
            onSearchChange={setMarketplaceSearch}
          />
        );
      case 'portfolio':
        return <PortfolioPage />;
      case 'kyc':
        return <KYCPage />;
      case 'governance':
        return <GovernancePage />;
      case 'admin':
        return userRole === 'admin' ? (
          <AdminPage />
        ) : (
          <Dashboard userRole={userRole} onNavigate={handleNavigate} />
        );
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onOpenLogin={() => setShowLogin(true)}
    >
      {renderPage()}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </AppLayout>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { signUp, signIn, user } = useAuth();

  useEffect(() => {
    if (user) onClose();
  }, [user, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isSignUp) await signUp(email, password);
      else await signIn(email, password);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 relative shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-brand-navy text-sm font-medium"
        >
          Skip
        </button>
        <h2 className="font-display text-xl font-semibold text-brand-navy">Sign in</h2>
        <p className="text-slate-500 text-sm mt-1 mb-6">Optional — only needed to invest</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" className="input-field" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" className="input-field" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="w-full btn-primary">
            {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-4 text-sm text-brand-600 font-medium">
          {isSignUp ? 'Already have an account?' : 'Create an account'}
        </button>
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
