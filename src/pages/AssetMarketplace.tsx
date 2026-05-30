import React, { useState } from 'react';
import { Search, Filter, TrendingUp, MapPin, Calendar, DollarSign, Eye, ShoppingCart, Star } from 'lucide-react';

export default function AssetMarketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);

  const assets = [
    {
      id: 1,
      name: 'Luxury London Townhouse',
      symbol: 'LDN-LUX-001',
      location: 'Mayfair, London, UK',
      value: '$1,250,000',
      tokenPrice: '$2,500',
      totalTokens: '500',
      availableTokens: '150',
      yield: '4.2%',
      raised: '$600,000',
      target: '$1,250,000',
      type: 'Residential',
      investors: 234,
      rating: 4.8,
      image: 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=600',
      verified: true,
      riskScore: 65,
    },
    {
      id: 2,
      name: 'Manhattan Commercial Tower',
      symbol: 'NYC-COM-002',
      location: 'Midtown, New York, USA',
      value: '$3,500,000',
      tokenPrice: '$3,500',
      totalTokens: '1000',
      availableTokens: '245',
      yield: '5.1%',
      raised: '$2,100,000',
      target: '$3,500,000',
      type: 'Commercial',
      investors: 567,
      rating: 4.9,
      image: 'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=600',
      verified: true,
      riskScore: 42,
    },
    {
      id: 3,
      name: 'Dubai Marina Residential',
      symbol: 'DXB-RES-003',
      location: 'Dubai Marina, UAE',
      value: '$850,000',
      tokenPrice: '$1,700',
      totalTokens: '500',
      availableTokens: '320',
      yield: '6.5%',
      raised: '$200,000',
      target: '$850,000',
      type: 'Residential',
      investors: 89,
      rating: 4.6,
      image: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=600',
      verified: false,
      riskScore: 58,
    },
    {
      id: 4,
      name: 'Paris Office Complex',
      symbol: 'PAR-OFF-004',
      location: 'La Défense, Paris, France',
      value: '$2,200,000',
      tokenPrice: '$2,200',
      totalTokens: '1000',
      availableTokens: '500',
      yield: '4.8%',
      raised: '$1,100,000',
      target: '$2,200,000',
      type: 'Commercial',
      investors: 312,
      rating: 4.7,
      image: 'https://images.pexels.com/photos/3735206/pexels-photo-3735206.jpeg?auto=compress&cs=tinysrgb&w=600',
      verified: true,
      riskScore: 52,
    },
    {
      id: 5,
      name: 'Tokyo Luxury Apartments',
      symbol: 'TYO-LUX-005',
      location: 'Shibuya, Tokyo, Japan',
      value: '$1,650,000',
      tokenPrice: '$1,650',
      totalTokens: '1000',
      availableTokens: '450',
      yield: '5.5%',
      raised: '$825,000',
      target: '$1,650,000',
      type: 'Residential',
      investors: 421,
      rating: 4.8,
      image: 'https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?auto=compress&cs=tinysrgb&w=600',
      verified: true,
      riskScore: 48,
    },
    {
      id: 6,
      name: 'Singapore Retail Mall',
      symbol: 'SG-RET-006',
      location: 'Marina Bay, Singapore',
      value: '$2,850,000',
      tokenPrice: '$2,850',
      totalTokens: '1000',
      availableTokens: '200',
      yield: '5.9%',
      raised: '$2,565,000',
      target: '$2,850,000',
      type: 'Retail',
      investors: 678,
      rating: 4.9,
      image: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=600',
      verified: true,
      riskScore: 38,
    },
  ];

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || asset.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const selectedAssetData = selectedAsset ? assets.find(a => a.id === selectedAsset) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Asset Marketplace</h2>
        <p className="text-slate-400">Discover and invest in verified real estate tokens</p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Residential', 'Commercial', 'Retail'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterType === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {type === 'all' ? 'All Assets' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-3 gap-6">
        {filteredAssets.map((asset) => (
          <div
            key={asset.id}
            onClick={() => setSelectedAsset(asset.id)}
            className={`bg-slate-900 border rounded-lg overflow-hidden cursor-pointer transition-all hover:border-emerald-500 ${
              selectedAsset === asset.id ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-800'
            }`}
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden bg-slate-800">
              <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 flex gap-2">
                {asset.verified && (
                  <div className="bg-emerald-600/90 px-2 py-1 rounded text-xs text-white font-semibold">
                    Verified
                  </div>
                )}
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  asset.riskScore < 50 ? 'bg-green-600/90 text-white' :
                  asset.riskScore < 70 ? 'bg-amber-600/90 text-white' :
                  'bg-red-600/90 text-white'
                }`}>
                  Risk: {asset.riskScore}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white text-sm">{asset.name}</h3>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-xs text-slate-400">{asset.rating}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {asset.location}
              </p>

              {/* Asset Info Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div>
                  <p className="text-slate-500">Asset Value</p>
                  <p className="font-semibold text-white">{asset.value}</p>
                </div>
                <div>
                  <p className="text-slate-500">Token Price</p>
                  <p className="font-semibold text-white">{asset.tokenPrice}</p>
                </div>
                <div>
                  <p className="text-slate-500">Annual Yield</p>
                  <p className="font-semibold text-emerald-400">{asset.yield}</p>
                </div>
                <div>
                  <p className="text-slate-500">Available</p>
                  <p className="font-semibold text-white">{asset.availableTokens}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-500">Funded</p>
                  <p className="text-xs font-semibold text-white">
                    {Math.round((parseFloat(asset.raised.slice(1).replace(/,/g, '')) / parseFloat(asset.target.slice(1).replace(/,/g, ''))) * 100)}%
                  </p>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 w-1/2"></div>
                </div>
              </div>

              {/* Investors */}
              <p className="text-xs text-slate-400 mb-3">{asset.investors} investors</p>

              {/* Action Button */}
              <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
                <ShoppingCart className="w-4 h-4" />
                Invest Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Asset Detail Modal */}
      {selectedAssetData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur z-40 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{selectedAssetData.name}</h3>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Asset Image */}
              <img src={selectedAssetData.image} alt={selectedAssetData.name} className="w-full h-64 object-cover rounded-lg mb-4" />

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-white">{selectedAssetData.value}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Annual Yield</p>
                  <p className="text-2xl font-bold text-emerald-400">{selectedAssetData.yield}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Token Price</p>
                  <p className="text-2xl font-bold text-white">{selectedAssetData.tokenPrice}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Available Tokens</p>
                  <p className="text-2xl font-bold text-white">{selectedAssetData.availableTokens}</p>
                </div>
              </div>

              {/* Funding Progress */}
              <div className="bg-slate-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-400 mb-2">Funding Progress</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-emerald-500 w-1/2"></div>
                    </div>
                    <p className="text-xs text-slate-400">{selectedAssetData.raised} of {selectedAssetData.target}</p>
                  </div>
                </div>
              </div>

              {/* Description and Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Type</p>
                  <p className="font-semibold text-white">{selectedAssetData.type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Risk Score</p>
                  <p className="font-semibold text-white">{selectedAssetData.riskScore}/100</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Investors</p>
                  <p className="font-semibold text-white">{selectedAssetData.investors}</p>
                </div>
              </div>

              {/* Investment Button */}
              <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Invest {selectedAssetData.availableTokens} Tokens
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
