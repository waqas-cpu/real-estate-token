import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Send, MoreVertical, AlertCircle } from 'lucide-react';

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState([
    {
      id: 1,
      symbol: 'LDN-LUX-001',
      name: 'Luxury London Townhouse',
      tokens: 50,
      tokenPrice: 2500,
      value: 125000,
      dayChange: 1250,
      yield: 4.2,
      allocation: 51,
      location: 'Mayfair, London',
    },
    {
      id: 2,
      symbol: 'NYC-COM-002',
      name: 'Manhattan Commercial Tower',
      tokens: 25,
      tokenPrice: 3500,
      value: 87500,
      dayChange: -875,
      yield: 5.1,
      allocation: 36,
      location: 'Midtown, New York',
    },
    {
      id: 3,
      symbol: 'DXB-RES-003',
      name: 'Dubai Marina Residential',
      tokens: 10,
      tokenPrice: 1700,
      value: 17000,
      dayChange: 340,
      yield: 6.5,
      allocation: 7,
      location: 'Dubai Marina',
    },
  ]);

  const [incomeDistributions, setIncomeDistributions] = useState([
    {
      id: 1,
      symbol: 'LDN-LUX-001',
      amount: 2150,
      date: '2026-05-15',
      status: 'Claimed',
      type: 'Rental Income',
    },
    {
      id: 2,
      symbol: 'NYC-COM-002',
      amount: 1845,
      date: '2026-05-10',
      status: 'Pending',
      type: 'Dividend',
    },
    {
      id: 3,
      symbol: 'DXB-RES-003',
      amount: 567,
      date: '2026-04-30',
      status: 'Claimed',
      type: 'Rental Income',
    },
  ]);

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalYield = holdings.reduce((sum, h) => sum + (h.value * h.yield / 100), 0);
  const dayChange = holdings.reduce((sum, h) => sum + h.dayChange, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Your Portfolio</h2>
        <p className="text-slate-400">Manage and monitor your real estate token holdings</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Total Value</p>
          <p className="text-3xl font-bold text-white">${(totalValue / 1000).toFixed(0)}K</p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {dayChange > 0 ? '+' : ''}{dayChange.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Monthly Yield</p>
          <p className="text-3xl font-bold text-white">${(totalYield / 12 / 1000).toFixed(1)}K</p>
          <p className="text-xs text-slate-400 mt-1">{(totalYield / totalValue * 100).toFixed(1)}% annual</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Holdings</p>
          <p className="text-3xl font-bold text-white">{holdings.length}</p>
          <p className="text-xs text-slate-400 mt-1">Real estate assets</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-1">Pending Income</p>
          <p className="text-3xl font-bold text-white">$1.8K</p>
          <p className="text-xs text-amber-400 mt-1">Ready to claim</p>
        </div>
      </div>

      {/* Holdings */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Your Holdings</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Location</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Tokens</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Price/Token</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Value</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Change</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Yield</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Allocation</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300"></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => (
                  <tr key={holding.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{holding.symbol}</p>
                        <p className="text-xs text-slate-400">{holding.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{holding.location}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-white">{holding.tokens}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-400">${holding.tokenPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-white">${holding.value.toLocaleString()}</td>
                    <td className={`px-6 py-4 text-right text-sm font-semibold flex items-center justify-end gap-1 ${holding.dayChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {holding.dayChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      ${Math.abs(holding.dayChange).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-emerald-400 font-semibold">{holding.yield}%</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-400">{holding.allocation}%</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Asset Allocation Pie Chart */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Portfolio Allocation</h3>
          <div className="space-y-3">
            {holdings.map((holding) => (
              <div key={holding.id}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-slate-300">{holding.symbol}</p>
                  <p className="text-sm font-semibold text-white">{holding.allocation}%</p>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    style={{ width: `${holding.allocation}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Income Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Distributions</h3>
          <div className="space-y-3">
            {incomeDistributions.slice(0, 3).map((dist) => (
              <div key={dist.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">{dist.type}</p>
                    <p className="text-xs text-slate-400">{dist.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">${dist.amount.toLocaleString()}</p>
                  <p className={`text-xs ${dist.status === 'Claimed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {dist.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Income Distribution Table */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Distribution History</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {incomeDistributions.map((dist) => (
                  <tr key={dist.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-6 py-4 text-sm font-semibold text-white">{dist.symbol}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{dist.type}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-white">${dist.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{dist.date}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        dist.status === 'Claimed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {dist.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {dist.status === 'Pending' ? (
                        <button className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1">
                          <Send className="w-3 h-3" />
                          Claim
                        </button>
                      ) : (
                        <p className="text-xs text-slate-400">Claimed</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
