import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useAssets, useSecurityTokens } from '../lib/hooks';
import { getDistributions, isUsingBackend } from '../lib/dataSource';
import { formatUsd, usdcMicroToUsd } from '../lib/format';
import { LoadingState, ErrorState, EmptyState, Badge } from '../components/ui/Status';
import { DataTable } from '../components/ui/DataTable';

const PLACEHOLDER =
  'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=200';

export default function PortfolioPage() {
  const { investorWallet } = useAuth();
  const { data: tokens, loading, error } = useSecurityTokens();
  const { data: bundle } = useAssets();
  const [distributions, setDistributions] = useState<
    Awaited<ReturnType<typeof getDistributions>>
  >([]);

  const assetsById = useMemo(() => {
    const map = new Map<string, { title: string; address: string }>();
    for (const a of bundle?.assets ?? []) map.set(a.id, a);
    return map;
  }, [bundle]);

  useEffect(() => {
    if (!tokens?.length || !isUsingBackend()) return;
    getDistributions(tokens[0].id).then(setDistributions).catch(() => setDistributions([]));
  }, [tokens]);

  const totalTokens = tokens?.reduce((s, t) => s + Number(t.total_supply), 0) ?? 0;
  const portfolioValue = totalTokens * 100;
  const cashBalance = distributions.length
    ? distributions.reduce((s, d) => s + Number(d.net_income) / 1_000_000, 0)
    : 0;

  const allocation = [
    { label: 'Residential', pct: 65, color: '#0d9488' },
    { label: 'Commercial', pct: 25, color: '#115e59' },
    { label: 'Mixed-use', pct: 10, color: '#f27121' },
  ];

  const holdings =
    tokens?.map((t) => {
      const asset = assetsById.get(t.asset_id);
      return {
        id: t.id,
        name: asset?.title ?? t.symbol,
        location: asset?.address?.split(',').slice(-2).join(', ') ?? '—',
        tokens: Number(t.total_supply).toLocaleString(),
        dividend: '10% fixed annually',
        projection: formatUsd(Number(t.total_supply) * 150),
        ownership: '1.25%',
        status: 'Active' as const,
        image: PLACEHOLDER,
      };
    }) ?? [];

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-navy">Portfolio</h1>
        <p className="text-slate-500 mt-1">Track token holdings, allocation, and income</p>

        {!investorWallet && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            Add your wallet in the header to personalize holdings when on-chain linking is enabled.
          </div>
        )}

        {loading && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState message={error.message} /></div>}

        {!loading && !error && (
          <>
            <div className="mt-8 grid lg:grid-cols-3 gap-6">
              <MetricCard label="Total portfolio value" value={formatUsd(portfolioValue)} delta="+8.2%" />
              <MetricCard label="Cash balance" value={formatUsd(cashBalance)} />
              <MetricCard label="Total tokens held" value={totalTokens.toLocaleString()} />
            </div>

            <div className="mt-6 grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h2 className="font-semibold text-brand-navy mb-4">Your token holdings</h2>
                {!tokens?.length ? (
                  <EmptyState
                    title="No investments yet"
                    hint="Browse offerings and invest in an active property."
                  />
                ) : (
                  <DataTable
                    rows={holdings}
                    getRowKey={(r) => r.id}
                    emptyMessage="No holdings"
                    columns={[
                      {
                        key: 'asset',
                        header: 'Asset',
                        render: (r) => (
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <img src={r.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                            <div>
                              <p className="font-semibold text-brand-navy">{r.name}</p>
                              <p className="text-xs text-slate-500">{r.location}</p>
                            </div>
                          </div>
                        ),
                      },
                      { key: 'tokens', header: 'Tokens', render: (r) => r.tokens },
                      { key: 'dividend', header: 'Dividend (%)', render: (r) => r.dividend },
                      { key: 'proj', header: '5YR projection', render: (r) => r.projection },
                      { key: 'own', header: 'Ownership (%)', render: (r) => r.ownership },
                      {
                        key: 'status',
                        header: 'Status',
                        render: (r) => <Badge tone="success">{r.status}</Badge>,
                      },
                    ]}
                  />
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
                <h2 className="font-semibold text-brand-navy mb-4">Investment distribution</h2>
                <DonutChart segments={allocation} />
                <ul className="mt-4 space-y-2 text-sm">
                  {allocation.map((s) => (
                    <li key={s.label} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                      <span className="text-slate-600">
                        {s.pct}% {s.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {distributions.length > 0 && (
              <div className="mt-10">
                <h2 className="font-semibold text-brand-navy mb-4">Recent distributions</h2>
                <DataTable
                  rows={distributions}
                  getRowKey={(d) => d.id}
                  columns={[
                    {
                      key: 'period',
                      header: 'Period',
                      render: (d) =>
                        `${new Date(d.period_start).toLocaleDateString()} – ${new Date(d.period_end).toLocaleDateString()}`,
                    },
                    {
                      key: 'amount',
                      header: 'Net income',
                      render: (d) => (
                        <span className="font-semibold text-brand-700">
                          {usdcMicroToUsd(d.net_income)}
                        </span>
                      ),
                    },
                    {
                      key: 'date',
                      header: 'Distribution date',
                      render: (d) => new Date(d.distribution_date).toLocaleDateString(),
                    },
                  ]}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl md:text-3xl font-bold text-brand-navy mt-2">{value}</p>
      {delta && <p className="text-sm text-emerald-600 font-medium mt-1">{delta}</p>}
    </div>
  );
}

function DonutChart({ segments }: { segments: { pct: number; color: string }[] }) {
  let offset = 0;
  const stops = segments
    .map((s) => {
      const start = offset;
      offset += s.pct;
      return `${s.color} ${start}% ${offset}%`;
    })
    .join(', ');

  return (
    <div
      className="w-36 h-36 mx-auto rounded-full"
      style={{ background: `conic-gradient(${stops})` }}
    >
      <div className="w-24 h-24 m-6 rounded-full bg-white" />
    </div>
  );
}
