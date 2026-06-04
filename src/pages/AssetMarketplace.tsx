import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useAssets } from '../lib/hooks';
import { getAssetDetail, type AssetDetail } from '../lib/dataSource';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/Status';
import { OfferingCard } from '../components/marketing/OfferingCard';
import { PropertyDetailPanel } from '../components/marketing/PropertyDetailPanel';
import { InvestModal } from '../components/InvestModal';
import { getDisplayAddress } from '../lib/propertyCatalog';

type StatusFilter = 'all' | 'verified' | 'pending';

type Props = {
  initialSearch?: string;
  onSearchChange?: (query: string) => void;
};

export default function AssetMarketplace({ initialSearch = '', onSearchChange }: Props) {
  const { data: bundle, loading, error } = useAssets();
  const assets = bundle?.assets ?? [];
  const summaries = bundle?.summaries ?? {};

  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  const updateSearch = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };
  const [status, setStatus] = useState<StatusFilter>('all');
  const [location, setLocation] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [investDetail, setInvestDetail] = useState<AssetDetail | null>(null);

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.address.toLowerCase().includes(q) ||
      getDisplayAddress(a).toLowerCase().includes(q);
    const matchStatus =
      status === 'all' ||
      (status === 'verified' && a.verified) ||
      (status === 'pending' && !a.verified);
    const addr = getDisplayAddress(a).toLowerCase();
    const matchLoc = !location || addr.includes(location.toLowerCase());
    return matchSearch && matchStatus && matchLoc;
  });

  const openAsset = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await getAssetDetail(id));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-full">
      <section className="border-b border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <h1 className="text-3xl md:text-4xl font-bold text-brand-navy tracking-tight">
              Investment marketplace
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <FilterSelect
                label="Status"
                value={status}
                onChange={(v) => setStatus(v as StatusFilter)}
                options={[
                  ['all', 'All'],
                  ['verified', 'Verified'],
                  ['pending', 'In review'],
                ]}
              />
              <FilterSelect
                label="Location"
                value={location}
                onChange={setLocation}
                options={[
                  ['', 'Any'],
                  ['london', 'London'],
                  ['kensington', 'Kensington Palace Gardens'],
                  ['new york', 'New York'],
                  ['california', 'California'],
                  ['texas', 'Texas'],
                ]}
              />
              <FilterSelect
                label="Asset type"
                value="residential"
                onChange={() => {}}
                options={[['residential', 'Residential']]}
              />
              <FilterSelect
                label="Price range"
                value="any"
                onChange={() => {}}
                options={[
                  ['any', 'Any'],
                  ['1m', '$1M+'],
                  ['10m', '$10M+'],
                ]}
              />
            </div>
          </div>

          <div className="mt-6 max-w-md flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <Search className="w-4 h-4 text-slate-400 ml-3" />
            <input
              type="search"
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              placeholder="Search assets…"
              className="flex-1 py-2.5 px-3 bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {loading && <LoadingState message="Loading offerings…" />}
        {error && <ErrorState message={error.message} />}
        {!loading && !error && !assets.length && (
          <EmptyState
            title="No offerings yet"
            hint="When properties are tokenized, they appear here for investors."
          />
        )}
        {!loading && !error && filtered.length > 0 && (
          <p className="text-sm text-slate-500 mb-6">
            {filtered.length} {filtered.length === 1 ? 'property' : 'properties'}
          </p>
        )}
        {!loading && !error && assets.length > 0 && !filtered.length && (
          <EmptyState title="No matches" hint="Try a different search or filter." />
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((asset) => (
            <OfferingCard
              key={asset.id}
              asset={asset}
              summary={{
                valuationFmv: summaries[asset.id]?.valuationFmv,
                totalSupply: summaries[asset.id]?.totalSupply,
                offering: summaries[asset.id]?.offering,
              }}
              onView={() => openAsset(asset.id)}
            />
          ))}
        </div>
      </section>

      {selectedId && (
        <PropertyDetailPanel
          detail={detail}
          loading={detailLoading}
          onClose={() => {
            setSelectedId(null);
            setDetail(null);
          }}
          onInvest={() => detail && setInvestDetail(detail)}
        />
      )}

      {investDetail && (
        <InvestModal
          detail={investDetail}
          onClose={() => setInvestDetail(null)}
          onSuccess={() => {
            setInvestDetail(null);
            if (selectedId) openAsset(selectedId);
          }}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="text-xs text-slate-500">
      <span className="block mb-1 font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 min-w-[120px]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
