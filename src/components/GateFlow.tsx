import React, { useState } from 'react';
import { ArrowRight, CheckCircle, XCircle, AlertCircle, Lock } from 'lucide-react';

export default function GateFlow() {
  const [activeGate, setActiveGate] = useState(0);

  const gates = [
    {
      name: 'DATA → INTELLIGENCE',
      description: 'Physical Reality to Trusted Signals',
      color: 'emerald',
      rules: [
        {
          name: 'Oracle Quorum Threshold',
          description: 'Minimum 2-of-3 oracle attestations required',
          status: 'pass',
          details: 'Chainlink DON + Pyth Network consensus',
        },
        {
          name: 'Digital Twin Anchor',
          description: 'Twin must be IPFS-anchored, CID on-chain',
          status: 'pass',
          details: 'Content-addressed immutability guarantee',
        },
        {
          name: 'Content Integrity',
          description: 'SHA3-512 hash must match source records',
          status: 'pass',
          details: 'Tamper-evidence verification',
        },
      ],
    },
    {
      name: 'INTELLIGENCE → SECURITY',
      description: 'Trusted Signals to Quantum-Safe Custody',
      color: 'blue',
      rules: [
        {
          name: 'Compliance Clearance',
          description: 'Investor must pass KYC/AML screening',
          status: 'pass',
          details: 'Accreditation + AML clearance + jurisdiction check',
        },
        {
          name: 'Risk Score Bounds',
          description: 'Composite risk must be below threshold',
          status: 'pass',
          details: '≤75 for US, ≤80 for other jurisdictions',
        },
        {
          name: 'Valuation Freshness',
          description: 'Valuation must be fresher than 90 days',
          status: 'warn',
          details: 'Model retraining triggered automatically',
        },
      ],
    },
    {
      name: 'SECURITY → EXECUTION',
      description: 'Quantum-Safe Custody to Settlement',
      color: 'amber',
      rules: [
        {
          name: 'Key Ceremony Complete',
          description: 'ML-DSA-87 keys generated in t-of-n ceremony',
          status: 'pass',
          details: '3-of-5 HSM quorum, air-gapped ceremony',
        },
        {
          name: 'ZK Credential Valid',
          description: 'Investor ZK proof on-chain verifiable',
          status: 'pass',
          details: 'Noir circuit + UltraPlonk verifier',
        },
        {
          name: 'Audit Trail Signed',
          description: 'All security events ML-DSA-87 signed',
          status: 'pass',
          details: 'Immutable post-quantum signatures',
        },
        {
          name: 'Recovery Status Clear',
          description: 'No pending recovery procedures',
          status: 'pass',
          details: 'Forced transfer module in standby',
        },
      ],
    },
    {
      name: 'EXECUTION → DATA',
      description: 'Settlement Events to Record Update',
      color: 'violet',
      rules: [
        {
          name: 'Transfer Event Recording',
          description: 'Token transfer triggers twin update',
          status: 'pass',
          details: 'IPFS CID updated, on-chain anchor refreshed',
        },
        {
          name: 'Income Distribution Recording',
          description: 'Distributions recorded with merkle proof',
          status: 'warn',
          details: 'Async recording, eventual consistency',
        },
      ],
    },
  ];

  const gate = gates[activeGate];

  return (
    <div className="space-y-6">
      {/* Gate Selector */}
      <div className="flex gap-2 flex-wrap">
        {gates.map((g, i) => (
          <button
            key={i}
            onClick={() => setActiveGate(i)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeGate === i
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Gate Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="mb-6">
          <h2 className={`text-lg font-bold text-${gate.color}-400`}>{gate.name}</h2>
          <p className="text-xs text-slate-400 mt-1">{gate.description}</p>
        </div>

        {/* Rules */}
        <div className="space-y-3">
          {gate.rules.map((rule, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {rule.status === 'pass' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  {rule.status === 'warn' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                  {rule.status === 'fail' && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">{rule.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{rule.description}</div>
                  <div className={`text-xs mt-2 px-2 py-1 rounded inline-block ${
                    rule.status === 'pass' ? 'bg-emerald-500/10 text-emerald-300' :
                    rule.status === 'warn' ? 'bg-amber-500/10 text-amber-300' :
                    'bg-red-500/10 text-red-300'
                  }`}>
                    {rule.details}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gate Crossing Example */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Gate Crossing Process
        </h3>

        <div className="space-y-3">
          {[
            { step: 1, label: 'Data collected', detail: 'Asset properties, oracle attestations' },
            { step: 2, label: 'Rules evaluated', detail: 'All gate rules checked atomically' },
            { step: 3, label: 'Validation gates', detail: 'Blockers stop crossing, warnings logged' },
            { step: 4, label: 'Cryptographic proof', detail: 'Boundary record signed with ML-DSA-87' },
            { step: 5, label: 'Layer transit', detail: 'Data crosses gate to next layer' },
            { step: 6, label: 'Event emitted', detail: 'LayerBoundary event indexed on-chain' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="bg-emerald-600 rounded-full w-7 h-7 flex items-center justify-center text-white text-xs font-bold">
                {item.step}
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{item.label}</div>
                <div className="text-xs text-slate-400">{item.detail}</div>
              </div>
              {i < 5 && <ArrowRight className="w-4 h-4 text-slate-600 ml-auto" />}
            </div>
          ))}
        </div>
      </div>

      {/* Rules Enforcement */}
      <div className="bg-gradient-to-r from-amber-900/20 to-transparent border border-amber-500/20 rounded-lg p-6">
        <h3 className="font-bold text-amber-400 mb-3">Rules Enforcement Guarantee</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Every integration gate is enforced deterministically. No data crosses without passing ALL blocking rules. Warnings are logged but do not block crossing. All gate crossings are cryptographically signed with ML-DSA-87 (FIPS 204), creating an immutable audit trail of which rules were checked and which passed.
        </p>
      </div>
    </div>
  );
}
