import { useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useProposals, useGovernanceVotes } from '../lib/hooks';
import { LoadingState, ErrorState, Badge } from '../components/ui/Status';
import { DataTable } from '../components/ui/DataTable';
import type { GovernanceProposal } from '../lib/api';
import { truncateWallet } from '../lib/format';

export default function GovernancePage() {
  const { investorWallet } = useAuth();
  const { data: proposals, loading: proposalsLoading, error } = useProposals();
  const { data: votes, loading: votesLoading } = useGovernanceVotes(investorWallet || null);

  const proposalById = useMemo(() => {
    const m = new Map<string, GovernanceProposal>();
    for (const p of proposals ?? []) m.set(p.id, p);
    return m;
  }, [proposals]);

  const activeAndPast = [...(proposals ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (proposalsLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="bg-white min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-navy">Governance</h1>
        <p className="text-slate-500 mt-1">
          Review past proposals and your voting history as a token holder
        </p>

        <section className="mt-10">
          <h2 className="font-semibold text-lg text-brand-navy mb-4">Past proposals</h2>
          <DataTable
            rows={activeAndPast}
            getRowKey={(p) => p.id}
            emptyMessage="No proposals yet. Proposals appear when token holders create votes."
            columns={[
              {
                key: 'id',
                header: 'Proposal ID',
                render: (p) => (
                  <span className="font-mono text-xs text-slate-500">{p.id.slice(0, 8)}…</span>
                ),
              },
              {
                key: 'title',
                header: 'Title',
                render: (p) => <span className="font-medium text-brand-navy">{p.title}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (p) => <StatusBadge status={p.status} />,
              },
              {
                key: 'type',
                header: 'Type',
                render: (p) => (
                  <span className="text-slate-600">{p.proposal_type.replace(/_/g, ' ')}</span>
                ),
              },
              {
                key: 'ended',
                header: 'Date',
                render: (p) =>
                  p.timelock_until
                    ? new Date(p.timelock_until).toLocaleDateString()
                    : new Date(p.created_at).toLocaleDateString(),
              },
            ]}
          />
        </section>

        <section className="mt-12">
          <h2 className="font-semibold text-lg text-brand-navy mb-4">Voting history</h2>
          {votesLoading ? (
            <LoadingState message="Loading votes…" />
          ) : (
            <DataTable
              rows={votes ?? []}
              getRowKey={(v) => v.id}
              emptyMessage={
                investorWallet
                  ? 'No votes recorded for your wallet yet.'
                  : 'Add your wallet in the header to see voting history.'
              }
              columns={[
                {
                  key: 'proposal',
                  header: 'Proposal',
                  render: (v) => {
                    const p = proposalById.get(v.proposal_id);
                    return p?.title ?? v.proposal_id.slice(0, 8) + '…';
                  },
                },
                {
                  key: 'vote',
                  header: 'Your vote',
                  render: (v) => (
                    <span
                      className={
                        v.support ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'
                      }
                    >
                      {v.support ? 'For' : 'Against'}
                    </span>
                  ),
                },
                {
                  key: 'weight',
                  header: 'Weight',
                  render: (v) => v.voting_power,
                },
                {
                  key: 'wallet',
                  header: 'Voter',
                  render: (v) => (
                    <span className="font-mono text-xs">{truncateWallet(v.voter_wallet)}</span>
                  ),
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (v) => new Date(v.created_at).toLocaleDateString(),
                },
              ]}
            />
          )}
        </section>

      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'ACTIVE'
      ? 'info'
      : status === 'PASSED' || status === 'EXECUTED'
        ? 'success'
        : status === 'FAILED' || status === 'CANCELLED'
          ? 'warn'
          : 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}
