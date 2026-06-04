import { Database, Brain, Lock, Zap, Shield } from 'lucide-react';

export default function ArchitectureOverview() {
  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Sovereign Layers', value: '4', color: 'emerald' },
          { label: 'Core Components', value: '24', color: 'blue' },
          { label: 'PQC Standards', value: '3', color: 'amber' },
          { label: 'Lifecycle Stages', value: '11', color: 'violet' },
        ].map((metric, i) => (
          <div key={i} className={`bg-slate-900 border border-${metric.color}-500/20 rounded-lg p-4`}>
            <div className={`text-2xl font-bold text-${metric.color}-400`}>{metric.value}</div>
            <div className="text-xs text-slate-400 mt-1">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Architecture Layers */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white mb-4">Horizontal Decomposition</h2>

        {[
          {
            icon: Database,
            name: 'Layer 1: Data & Perception',
            color: 'emerald',
            description: 'Physical world → verified digital twin',
            components: ['Land registries', 'IoT sensors', 'Oracles', 'IPFS storage', 'Digital twins', 'Legal attestation'],
          },
          {
            icon: Brain,
            name: 'Layer 2: Intelligence',
            color: 'blue',
            description: 'Verified data → trusted signals',
            components: ['AI valuation', 'Risk scoring', 'KYC/AML', 'Compliance rules', 'On-chain analytics', 'Oracle integration'],
          },
          {
            icon: Lock,
            name: 'Layer 3: PQC Security',
            color: 'amber',
            description: 'Trusted data → quantum-safe custody',
            components: ['ML-DSA-87 keys', 'ML-KEM-1024 KEMs', 'ZK credentials', 'Audit trails', 'Key recovery', 'Secure channels'],
          },
          {
            icon: Zap,
            name: 'Layer 4: Execution',
            color: 'violet',
            description: 'Authorized intent → immutable settlement',
            components: ['ERC-3643 tokens', 'Compliance modules', 'Offerings', 'DAO governance', 'Income distribution', 'Secondary market'],
          },
        ].map((layer, i) => {
          const Icon = layer.icon;
          return (
            <div key={i} className={`bg-slate-900 border border-${layer.color}-500/20 rounded-lg p-6`}>
              <div className="flex items-start gap-4">
                <div className={`bg-${layer.color}-500/10 p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${layer.color}-400`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-${layer.color}-400`}>{layer.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{layer.description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {layer.components.map((comp, j) => (
                      <span key={j} className={`text-xs bg-${layer.color}-500/10 text-${layer.color}-300 px-2 py-1 rounded`}>
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architectural Invariants */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Architectural Invariants
        </h2>

        <div className="space-y-3">
          {[
            {
              num: 1,
              title: 'No synthetic tokens',
              desc: 'All tokens require verified, oracle-attested physical property records',
            },
            {
              num: 2,
              title: 'Compliance gating',
              desc: 'Every transfer requires live KYC/AML check from on-chain registry',
            },
            {
              num: 3,
              title: 'Post-quantum security',
              desc: 'All cryptography uses NIST FIPS 204/205/206 PQC standards',
            },
            {
              num: 4,
              title: 'Zero-trust composition',
              desc: 'Each layer boundary guarded by cryptographic assertion gates',
            },
          ].map((inv, i) => (
            <div key={i} className="flex gap-4">
              <div className="bg-emerald-600 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                {inv.num}
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{inv.title}</div>
                <div className="text-xs text-slate-400">{inv.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Flow */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-bold text-white mb-4">Data Flow: Asset Tokenization</h2>

        <div className="space-y-2">
          {[
            { step: 1, label: 'Registry ingestion', sublabel: 'Land registries, IoT, legal docs' },
            { step: 2, label: 'Digital twin creation', sublabel: 'Versioned IPFS-anchored record' },
            { step: 3, label: 'Oracle attestation', sublabel: '2-of-3 quorum on valuation' },
            { step: 4, label: 'AI valuation', sublabel: 'Hedonic + macro adjustment, confidence bands' },
            { step: 5, label: 'KYC/AML screening', sublabel: 'ZK credential proof generation' },
            { step: 6, label: 'PQC key ceremony', sublabel: 'ML-DSA-87 signing keys t-of-n' },
            { step: 7, label: 'Token issuance', sublabel: 'ERC-3643 T-REX security tokens' },
            { step: 8, label: 'Transfer compliance', sublabel: 'Per-transfer ZK proof validation' },
            { step: 9, label: 'Settlement', sublabel: 'Immutable on-chain transaction' },
          ].map((item, i) => (
            <div key={i}>
              <div className="flex items-center gap-3">
                <div className="bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center text-emerald-400 text-xs font-bold">
                  {item.step}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">{item.label}</div>
                  <div className="text-xs text-slate-500">{item.sublabel}</div>
                </div>
              </div>
              {i < 8 && <div className="ml-4 h-6 border-l border-slate-700" />}
            </div>
          ))}
        </div>
      </div>

      {/* First Principles */}
      <div className="bg-gradient-to-r from-emerald-900/20 to-transparent border border-emerald-500/20 rounded-lg p-6">
        <h2 className="text-lg font-bold text-emerald-400 mb-3">First Principle</h2>
        <p className="text-sm text-slate-300">
          A real-world asset cannot be tokenized until its physical reality is unambiguously mapped to an on-chain identifier. Every layer exists to preserve that mapping's integrity across time,[...]
        </p>
      </div>
    </div>
  );
}
