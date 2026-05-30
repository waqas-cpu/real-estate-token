import React from 'react';
import { Database, Brain, Lock, Zap, ChevronRight, AlertCircle } from 'lucide-react';

export default function LayerPanel({ selectedLayer, onSelect }: { selectedLayer: string | null; onSelect: (layer: string) => void }) {
  const layers = [
    {
      id: 'data',
      name: 'Data & Perception',
      icon: Database,
      color: 'emerald',
      rules: [
        { id: 'oracle-quorum', name: 'Oracle Quorum Threshold', desc: 'Min 2-of-3 attestations required' },
        { id: 'twin-anchor', name: 'Digital Twin Anchor', desc: 'IPFS CID must be on-chain verified' },
        { id: 'content-hash', name: 'Content Integrity', desc: 'SHA3-512 hash match required' },
      ],
      components: [
        { name: 'Land Registry APIs', role: 'Input source', desc: 'HM Land Registry, Torrens, Cadaster' },
        { name: 'IoT Sensor Layer', role: 'Monitoring', desc: 'Occupancy, energy, structural health' },
        { name: 'Oracle Network', role: 'Bridge', desc: 'Chainlink DECO, Pyth attestation' },
        { name: 'IPFS Storage', role: 'Archival', desc: 'Content-addressed immutable storage' },
        { name: 'Digital Twin', role: 'Artifact', desc: 'Canonical property record, versioned' },
        { name: 'Legal Attestation', role: 'Trust', desc: 'Notarized opinions, certificates' },
      ],
    },
    {
      id: 'intelligence',
      name: 'Intelligence',
      icon: Brain,
      color: 'blue',
      rules: [
        { id: 'compliance-check', name: 'Compliance Clearance', desc: 'KYC/AML pass required' },
        { id: 'risk-bounds', name: 'Risk Score Bounds', desc: 'Composite risk ≤ jurisdiction threshold' },
        { id: 'valuation-fresh', name: 'Valuation Freshness', desc: 'Must be < 90 days old' },
      ],
      components: [
        { name: 'AI Valuation Model', role: 'Pricing', desc: 'Hedonic + transformer, confidence bands' },
        { name: 'Risk Scoring', role: 'Assessment', desc: 'Credit, liquidity, operational, jurisdictional' },
        { name: 'KYC/AML Engine', role: 'Compliance', desc: 'Sanction screening, graph analysis' },
        { name: 'Compliance Rules', role: 'Regulatory', desc: 'MiCA, Reg D, FCA, VARA, MAS' },
        { name: 'On-chain Analytics', role: 'Monitoring', desc: 'The Graph subgraphs, market analysis' },
        { name: 'Oracle Integration', role: 'Feeding', desc: 'Staged publishing with confidence gates' },
      ],
    },
    {
      id: 'security',
      name: 'PQC Security',
      icon: Lock,
      color: 'amber',
      rules: [
        { id: 'key-ceremony', name: 'Key Ceremony Complete', desc: 'ML-DSA-87 t-of-n generation required' },
        { id: 'zk-valid', name: 'ZK Credential Valid', desc: 'Proof must be on-chain verifiable' },
        { id: 'audit-signed', name: 'Audit Trail Signed', desc: 'All events ML-DSA-87 signed' },
        { id: 'no-recovery', name: 'Recovery Clear', desc: 'No pending recovery procedures' },
      ],
      components: [
        { name: 'ML-DSA-87 Keys', role: 'Signing', desc: 'FIPS 204 lattice-based signatures' },
        { name: 'ML-KEM-1024 KEMs', role: 'Encryption', desc: 'FIPS 203 key encapsulation' },
        { name: 'SLH-DSA Backup', role: 'Stateless', desc: 'FIPS 205 hash-based backup' },
        { name: 'ZK Credentials', role: 'Privacy', desc: 'Noir circuits, UltraPlonk verification' },
        { name: 'Audit Trail', role: 'Logging', desc: 'Immutable event records, ZK proofs' },
        { name: 'Key Recovery', role: 'Resilience', desc: 'Social multisig, court-ordered transfer' },
      ],
    },
    {
      id: 'execution',
      name: 'Execution',
      icon: Zap,
      color: 'violet',
      rules: [
        { id: 'transfer-atomic', name: 'Atomic Transfer', desc: 'Compliance check before execution' },
        { id: 'recovery-clear', name: 'Recovery Status', desc: 'No recovery blocks transfers' },
        { id: 'escrow-valid', name: 'Escrow Validity', desc: 'Offering funds safely held' },
      ],
      components: [
        { name: 'ERC-3643 T-REX', role: 'Standard', desc: 'Security token with compliance hooks' },
        { name: 'Compliance Modules', role: 'Gating', desc: 'MaxBalance, CountryRestrict, TimeTransfer' },
        { name: 'Offering Contract', role: 'Issuance', desc: 'Subscription, escrow, pro-rata allocation' },
        { name: 'DAO Governance', role: 'Control', desc: 'Quadratic voting, timelocked proposals' },
        { name: 'Income Distribution', role: 'Yield', desc: 'Oracle-fed, merkle-tree claims' },
        { name: 'Secondary Market', role: 'Liquidity', desc: 'Compliant AMM, OTC, ATS integration' },
      ],
    },
  ];

  const selected = layers.find(l => l.id === selectedLayer) || layers[0];
  const Icon = selected.icon;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Layer Selection */}
      <div className="space-y-2">
        {layers.map(layer => {
          const LayerIcon = layer.icon;
          return (
            <button
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                selectedLayer === layer.id
                  ? `bg-${layer.color}-600 text-white`
                  : `bg-slate-800 text-slate-300 hover:bg-slate-700`
              }`}
            >
              <div className="flex items-center gap-2">
                <LayerIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{layer.name}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Rules */}
      <div className="space-y-3">
        <h3 className={`text-sm font-bold text-${selected.color}-400 flex items-center gap-2`}>
          <AlertCircle className="w-4 h-4" />
          Integration Rules
        </h3>
        <div className="space-y-2">
          {selected.rules.map(rule => (
            <div key={rule.id} className="bg-slate-800 rounded-lg p-3">
              <div className="font-semibold text-white text-xs">{rule.name}</div>
              <div className="text-xs text-slate-400 mt-1">{rule.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Components */}
      <div className="space-y-3">
        <h3 className={`text-sm font-bold text-${selected.color}-400 flex items-center gap-2`}>
          <ChevronRight className="w-4 h-4" />
          Core Components
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {selected.components.map(comp => (
            <div key={comp.name} className="bg-slate-800 rounded-lg p-3">
              <div className="font-semibold text-white text-xs">{comp.name}</div>
              <div className={`text-xs text-${selected.color}-300 mt-0.5`}>{comp.role}</div>
              <div className="text-xs text-slate-400 mt-1">{comp.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
