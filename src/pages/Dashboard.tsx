import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useAssets } from '../lib/hooks';
import { getPortfolioMetrics, isUsingBackend } from '../lib/dataSource';
import { HomeHero } from '../components/marketing/HomeHero';
import { TokenizationSteps } from '../components/marketing/TokenizationSteps';
import { OfferingCard } from '../components/marketing/OfferingCard';
import { LoadingState } from '../components/ui/Status';
import type { PageId } from '../components/layout/AppLayout';
import { COMING_SOON_PROPERTIES, resolveCatalogEntry } from '../lib/propertyCatalog';

type PageNav = (page: PageId, marketplaceSearch?: string) => void;

export default function Dashboard({
  userRole,
  onNavigate,
}: {
  userRole: string;
  onNavigate?: PageNav;
}) {
  const { user } = useAuth();
  const { data: bundle, loading } = useAssets();
  const [search, setSearch] = useState('');
  const [metrics, setMetrics] = useState({ verifiedAssets: 0, securityTokens: 0, distributions: 0 });

  useEffect(() => {
    if (!isUsingBackend() || !user) return;
    getPortfolioMetrics().then(setMetrics).catch(() => {});
  }, [user]);

  const assets = bundle?.assets ?? [];
  const summaries = bundle?.summaries ?? {};
  const kensington = assets.find((a) => resolveCatalogEntry(a));
  const featured = kensington
    ? [kensington, ...assets.filter((a) => a.id !== kensington.id).slice(0, 2)]
    : assets.slice(0, 3);

  return (
    <div className="bg-dark-hero">
      <HomeHero
        search={search}
        onSearchChange={setSearch}
        onInvest={() => onNavigate?.('marketplace')}
        onSearchSubmit={() => onNavigate?.('marketplace', search.trim())}
      />

      <section className="bg-white border-b border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TrustStat label="Listed properties" value={loading ? '—' : String(assets.length)} />
            <TrustStat label="Security tokens" value={String(metrics.securityTokens)} />
            <TrustStat label="Distributions" value={String(metrics.distributions)} />
            <TrustStat label="Platform" value="Testnet ready" />
          </div>
        </div>
      </section>

      <div className="bg-brand-cream">
        <TokenizationSteps />

        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="section-title">Featured offerings</h2>
              <p className="text-slate-500 mt-2">Curated tokenized properties available now</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('marketplace')}
              className="text-brand-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all"
            >
              See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {loading ? (
            <LoadingState message="Loading offerings…" />
          ) : featured.length ? (
            <div className="grid md:grid-cols-3 gap-6">
              {featured.map((a) => (
                <OfferingCard
                  key={a.id}
                  asset={a}
                  summary={{
                    valuationFmv: summaries[a.id]?.valuationFmv,
                    totalSupply: summaries[a.id]?.totalSupply,
                    offering: summaries[a.id]?.offering,
                  }}
                  onView={() => onNavigate?.('marketplace')}
                />
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">
              No offerings yet — run the issuer pipeline to list assets.
            </p>
          )}
        </section>

        <section className="pb-16 max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <h2 className="section-title">Further properties to be added</h2>
          <p className="text-slate-500 mt-2 mb-6">Upcoming tokenized listings on the platform</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {COMING_SOON_PROPERTIES.map((p) => (
              <div
                key={p.title}
                className="bg-white rounded-xl border border-dashed border-slate-300 p-5 text-center"
              >
                <p className="font-semibold text-brand-navy">{p.title}</p>
                <p className="text-sm text-slate-500 mt-1">{p.location}</p>
                <p className="text-xs text-accent-orange font-medium mt-3">{p.note}</p>
              </div>
            ))}
          </div>
        </section>

        {userRole === 'admin' && (
          <div className="pb-12 text-center">
            <button
              type="button"
              onClick={() => onNavigate?.('admin')}
              className="btn-secondary"
            >
              Tokenize your property
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TrustStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-5 shadow-card text-center md:text-left border border-slate-100">
      <p className="text-2xl font-bold text-brand-navy">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}
