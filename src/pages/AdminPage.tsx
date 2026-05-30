import React, { useState } from 'react';
import { Plus, Eye, Edit2, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const [tokenizationForm, setTokenizationForm] = useState({
    propertyName: '',
    address: '',
    value: '',
    targetRaise: '',
    annualYield: '',
  });

  const [issuedTokens, setIssuedTokens] = useState([
    {
      id: 1,
      symbol: 'LDN-LUX-001',
      name: 'Luxury London Townhouse',
      status: 'active',
      createdDate: '2026-03-15',
      tokenSupply: 500,
      totalRaised: 1250000,
      investors: 234,
    },
    {
      id: 2,
      symbol: 'NYC-COM-002',
      name: 'Manhattan Commercial Tower',
      status: 'active',
      createdDate: '2026-02-20',
      tokenSupply: 1000,
      totalRaised: 3500000,
      investors: 567,
    },
    {
      id: 3,
      symbol: 'DXB-RES-003',
      name: 'Dubai Marina Residential',
      status: 'pending',
      createdDate: '2026-05-10',
      tokenSupply: 500,
      totalRaised: 200000,
      investors: 89,
    },
  ]);

  const [pendingVerifications, setPendingVerifications] = useState([
    { id: 1, type: 'Investor KYC', name: 'John Investor', status: 'pending', date: '2026-05-28' },
    { id: 2, type: 'Asset Document', asset: 'LDN-LUX-001', status: 'pending', date: '2026-05-27' },
    { id: 3, type: 'Valuation Report', asset: 'NYC-COM-002', status: 'pending', date: '2026-05-26' },
  ]);

  const handleSubmitToken = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle token submission
    console.log('Submitting token:', tokenizationForm);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600/20 to-red-500/10 border border-red-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h2>
        <p className="text-slate-400">Manage asset tokenization and compliance verification</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Total Tokens Issued</p>
          <p className="text-3xl font-bold text-white">{issuedTokens.length}</p>
          <p className="text-xs text-emerald-400 mt-1">2,000 total tokens</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Total Raised</p>
          <p className="text-3xl font-bold text-white">$4.95M</p>
          <p className="text-xs text-emerald-400 mt-1">+12% this month</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Active Investors</p>
          <p className="text-3xl font-bold text-white">890</p>
          <p className="text-xs text-blue-400 mt-1">Verified</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Pending Reviews</p>
          <p className="text-3xl font-bold text-white">{pendingVerifications.length}</p>
          <p className="text-xs text-amber-400 mt-1">Awaiting action</p>
        </div>
      </div>

      {/* Tokenization Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-400" />
          Launch New Token
        </h3>
        <form onSubmit={handleSubmitToken} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Property Name</label>
              <input
                type="text"
                value={tokenizationForm.propertyName}
                onChange={(e) => setTokenizationForm({ ...tokenizationForm, propertyName: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="e.g., Monaco Penthouse"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Address</label>
              <input
                type="text"
                value={tokenizationForm.address}
                onChange={(e) => setTokenizationForm({ ...tokenizationForm, address: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="e.g., Monaco, France"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Asset Value (USD)</label>
              <input
                type="number"
                value={tokenizationForm.value}
                onChange={(e) => setTokenizationForm({ ...tokenizationForm, value: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="2500000"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Target Raise (USD)</label>
              <input
                type="number"
                value={tokenizationForm.targetRaise}
                onChange={(e) => setTokenizationForm({ ...tokenizationForm, targetRaise: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="2500000"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Annual Yield (%)</label>
              <input
                type="number"
                step="0.1"
                value={tokenizationForm.annualYield}
                onChange={(e) => setTokenizationForm({ ...tokenizationForm, annualYield: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="5.5"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Launch Token
          </button>
        </form>
      </div>

      {/* Issued Tokens */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Issued Tokens</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Supply</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Raised</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Investors</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issuedTokens.map((token) => (
                  <tr key={token.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-6 py-4 text-sm font-semibold text-white">{token.symbol}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-white font-semibold">{token.name}</p>
                        <p className="text-xs text-slate-400">{token.createdDate}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        token.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {token.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-white font-semibold">{token.tokenSupply}</td>
                    <td className="px-6 py-4 text-right text-sm text-white font-semibold">${(token.totalRaised / 1000000).toFixed(1)}M</td>
                    <td className="px-6 py-4 text-right text-sm text-white font-semibold">{token.investors}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Verifications */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Pending Verifications</h3>
        <div className="space-y-3">
          {pendingVerifications.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="font-semibold text-white">{item.type}</p>
                    <p className="text-sm text-slate-400">
                      {(item as any).name || (item as any).asset || 'Item'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-slate-400">{item.date}</p>
                  <div className="flex gap-2">
                    <button className="px-4 py-1 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-semibold">
                      Approve
                    </button>
                    <button className="px-4 py-1 text-sm border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-semibold">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            System Status
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Database</p>
              <p className="text-sm font-semibold text-emerald-400">Healthy</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Oracle Network</p>
              <p className="text-sm font-semibold text-emerald-400">Connected</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Smart Contracts</p>
              <p className="text-sm font-semibold text-emerald-400">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Quick Actions
          </h4>
          <div className="space-y-2">
            <button className="w-full py-2 text-sm border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 font-semibold">
              Export Audit Report
            </button>
            <button className="w-full py-2 text-sm border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 font-semibold">
              Verify All Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
