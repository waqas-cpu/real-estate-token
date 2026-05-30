import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Clock, CheckCircle2, Vote } from 'lucide-react';

export default function GovernancePage() {
  const [proposals, setProposals] = useState([
    {
      id: 1,
      title: 'Asset Manager Fee Reduction',
      description: 'Reduce asset management fee from 1.5% to 1.2% annually',
      asset: 'LDN-LUX-001',
      status: 'active',
      votesFor: 2450,
      votesAgainst: 320,
      startDate: '2026-05-20',
      endDate: '2026-06-03',
      votingPower: 0.85,
      userVoted: false,
    },
    {
      id: 2,
      title: 'Property Renovation Capex Approval',
      description: 'Approve $150,000 renovation budget for facade and interior upgrades',
      asset: 'NYC-COM-002',
      status: 'active',
      votesFor: 3210,
      votesAgainst: 180,
      startDate: '2026-05-18',
      endDate: '2026-06-01',
      votingPower: 0.92,
      userVoted: true,
    },
    {
      id: 3,
      title: 'Asset Sale Approval',
      description: 'Approve sale of Dubai Marina property at $920,000',
      asset: 'DXB-RES-003',
      status: 'voting',
      votesFor: 1850,
      votesAgainst: 520,
      startDate: '2026-05-25',
      endDate: '2026-06-08',
      votingPower: 0.78,
      userVoted: false,
    },
    {
      id: 4,
      title: 'Emergency Maintenance Fund',
      description: 'Create $50,000 emergency maintenance fund for structural repairs',
      asset: 'LDN-LUX-001',
      status: 'passed',
      votesFor: 2890,
      votesAgainst: 145,
      startDate: '2026-05-10',
      endDate: '2026-05-24',
      votingPower: 0.85,
      userVoted: true,
    },
  ]);

  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);

  const getProposalStats = (p: any) => {
    const total = p.votesFor + p.votesAgainst;
    const forPercent = (p.votesFor / total * 100).toFixed(1);
    return { total, forPercent };
  };

  const activeProposals = proposals.filter(p => p.status === 'active' || p.status === 'voting');
  const passedProposals = proposals.filter(p => p.status === 'passed');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-purple-500/10 border border-purple-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Governance & Voting</h2>
        <p className="text-slate-400">Participate in community decisions using quadratic voting</p>
      </div>

      {/* Voting Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Total Proposals</p>
          <p className="text-3xl font-bold text-white">{proposals.length}</p>
          <p className="text-xs text-slate-500 mt-1">Lifetime governance</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Active Votes</p>
          <p className="text-3xl font-bold text-white">{activeProposals.length}</p>
          <p className="text-xs text-slate-500 mt-1">Requiring attention</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Your Votes Cast</p>
          <p className="text-3xl font-bold text-white">{proposals.filter(p => p.userVoted).length}</p>
          <p className="text-xs text-slate-500 mt-1">Historical participation</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Voting Power</p>
          <p className="text-3xl font-bold text-white">2.35</p>
          <p className="text-xs text-slate-500 mt-1">√(token balance)</p>
        </div>
      </div>

      {/* Active Proposals */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Active Proposals</h3>
        <div className="space-y-4">
          {activeProposals.map((proposal) => {
            const stats = getProposalStats(proposal);
            return (
              <div
                key={proposal.id}
                onClick={() => setSelectedProposal(proposal.id)}
                className={`bg-slate-900 border rounded-lg p-6 cursor-pointer transition-all hover:border-purple-500 ${
                  selectedProposal === proposal.id ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white mb-1">{proposal.title}</h4>
                    <p className="text-sm text-slate-400">{proposal.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    proposal.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {proposal.status}
                  </span>
                </div>

                {/* Voting Info */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-400">Voting Results</p>
                    <p className="text-sm font-semibold text-white">
                      {stats.forPercent}% in favor ({stats.total} votes)
                    </p>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${parseFloat(stats.forPercent)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Vote Counts */}
                <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">For</p>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-emerald-400" />
                      <p className="font-semibold text-white">{(proposal.votesFor / 1000).toFixed(1)}K</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Against</p>
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="w-4 h-4 text-red-400" />
                      <p className="font-semibold text-white">{(proposal.votesAgainst / 1000).toFixed(1)}K</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Your Power</p>
                    <p className="font-semibold text-white">{proposal.votingPower}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                  <Clock className="w-4 h-4" />
                  Voting ends {proposal.endDate}
                </div>

                {/* Vote Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-2 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-colors font-semibold text-sm">
                    Vote For
                  </button>
                  <button className="py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors font-semibold text-sm">
                    Vote Against
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Passed Proposals */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Passed Proposals</h3>
        <div className="space-y-3">
          {passedProposals.map((proposal) => {
            const stats = getProposalStats(proposal);
            return (
              <div key={proposal.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <h4 className="font-semibold text-white">{proposal.title}</h4>
                    </div>
                    <p className="text-sm text-slate-400">{proposal.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">{stats.forPercent}% approval</p>
                    <p className="text-xs text-slate-400">Passed {proposal.endDate}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proposal Details Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur z-40 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {(() => {
                const proposal = proposals.find(p => p.id === selectedProposal)!;
                const stats = getProposalStats(proposal);
                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">{proposal.title}</h3>
                      <button
                        onClick={() => setSelectedProposal(null)}
                        className="text-slate-400 hover:text-white text-2xl"
                      >
                        ×
                      </button>
                    </div>

                    <p className="text-slate-400 mb-4">{proposal.description}</p>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-800">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Asset</p>
                        <p className="font-semibold text-white">{proposal.asset}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Status</p>
                        <p className="font-semibold text-white capitalize">{proposal.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Started</p>
                        <p className="font-semibold text-white">{proposal.startDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Ends</p>
                        <p className="font-semibold text-white">{proposal.endDate}</p>
                      </div>
                    </div>

                    {/* Voting Chart */}
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-white mb-2">Voting Results</p>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          style={{ width: `${parseFloat(stats.forPercent)}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">For</p>
                          <p className="font-semibold text-emerald-400">{proposal.votesFor.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white">{stats.forPercent}% in favor</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Against</p>
                          <p className="font-semibold text-red-400">{proposal.votesAgainst.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                        <Vote className="w-4 h-4" />
                        Vote For
                      </button>
                      <button className="py-3 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                        <Vote className="w-4 h-4" />
                        Vote Against
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
