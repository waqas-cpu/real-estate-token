import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Building2, Activity, ArrowUpRight, ArrowDownLeft, MoreVertical, Lock, CheckCircle2 } from 'lucide-react';

export default function Dashboard({ userRole }: { userRole: string }) {
  const [portfolioValue, setPortfolioValue] = useState('$245,850');
  const [assets, setAssets] = useState([
    {
      id: 1,
      name: 'Luxury London Townhouse',
      symbol: 'LDN-LUX-001',
      location: 'Mayfair, London',
      value: '$1,250,000',
      tokenPrice: '$2,500',
      yield: '4.2%',
      status: 'Verified',
      image: 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      id: 2,
      name: 'Manhattan Commercial Tower',
      symbol: 'NYC-COM-002',
      location: 'Midtown, New York',
      value: '$3,500,000',
      tokenPrice: '$3,500',
      yield: '5.1%',
      status: 'Verified',
      image: 'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      id: 3,
      name: 'Dubai Marina Residential',
      symbol: 'DXB-RES-003',
      location: 'Dubai Marina, UAE',
      value: '$850,000',
      tokenPrice: '$1,700',
      yield: '6.5%',
      status: 'In Review',
      image: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
  ]);

  const [recentTransactions, setRecentTransactions] = useState([
    { id: 1, type: 'purchase', asset: 'LDN-LUX-001', amount: '50 tokens', value: '$125,000', date: '2 hours ago', status: 'completed' },
    { id: 2, type: 'income', asset: 'NYC-COM-002', amount: 'Dividend', value: '+$1,245', date: '1 day ago', status: 'completed' },
    { id: 3, type: 'sale', asset: 'DXB-RES-003', amount: '25 tokens', value: '$42,500', date: '3 days ago', status: 'completed' },
  ]);

  const [metrics, setMetrics] = useState([
    { label: 'Total Assets', value: '3', change: '+1' },
    { label: 'Monthly Yield', value: '$4,250', change: '+12%' },
    { label: 'Portfolio Return', value: '8.2%', change: '+2.1%' },
    { label: 'KYC Status', value: 'Verified', change: '✓' },
  ]);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back, {userRole === 'investor' ? 'Investor' : 'Issuer'}</h2>
        <p className="text-slate-400">Manage your real estate token portfolio with quantum-safe security</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">{metric.label}</span>
              {i === 0 && <Building2 className="w-4 h-4 text-emerald-400" />}
              {i === 1 && <DollarSign className="w-4 h-4 text-blue-400" />}
              {i === 2 && <TrendingUp className="w-4 h-4 text-amber-400" />}
              {i === 3 && <CheckCircle2 className="w-4 h-4 text-green-400" />}
            </div>
            <div className="text-2xl font-bold text-white">{metric.value}</div>
            <div className="text-xs text-emerald-400 mt-1">{metric.change}</div>
          </div>
        ))}
      </div>

      {/* Portfolio Value Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-slate-400 text-sm mb-1">Total Portfolio Value</p>
            <h3 className="text-4xl font-bold text-white">{portfolioValue}</h3>
          </div>
          <div className="text-right">
            <p className="text-emerald-400 text-sm flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              +8.2% this month
            </p>
          </div>
        </div>
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 w-3/4"></div>
        </div>
      </div>

      {/* Featured Assets */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Featured Assets</h3>
        <div className="grid grid-cols-3 gap-4">
          {assets.map((asset) => (
            <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-all">
              <div className="h-48 bg-slate-800 overflow-hidden">
                <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm">{asset.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${asset.status === 'Verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {asset.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{asset.location}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-slate-500">Asset Value</p>
                    <p className="font-semibold text-white">{asset.value}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Token Price</p>
                    <p className="font-semibold text-white">{asset.tokenPrice}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="text-xs text-emerald-400">{asset.yield} annual yield</span>
                  <button className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors">
                    Invest
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Recent Transactions</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        {tx.type === 'purchase' && <ArrowDownLeft className="w-4 h-4 text-blue-400" />}
                        {tx.type === 'sale' && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
                        {tx.type === 'income' && <DollarSign className="w-4 h-4 text-green-400" />}
                        {tx.type}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-white font-medium">{tx.asset}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{tx.amount}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-white">{tx.value}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{tx.date}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Architecture Insights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            Security Status
          </h4>
          <ul className="space-y-2">
            <li className="text-xs text-slate-400">PQC-Secured: ML-DSA-87 signing</li>
            <li className="text-xs text-slate-400">KYC/AML: Verified</li>
            <li className="text-xs text-slate-400">Compliance: MiCA approved</li>
          </ul>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            System Health
          </h4>
          <ul className="space-y-2">
            <li className="text-xs text-emerald-400">Data Layer: Ready</li>
            <li className="text-xs text-emerald-400">Intelligence Layer: Ready</li>
            <li className="text-xs text-emerald-400">Execution Layer: Ready</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
