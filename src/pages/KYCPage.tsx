import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, Upload, FileText, Shield, Zap } from 'lucide-react';

export default function KYCPage() {
  const [kycStatus, setKycStatus] = useState('verified');
  const [credentials, setCredentials] = useState([
    { id: 1, type: 'Identity', status: 'verified', date: '2026-03-15', expiry: '2027-03-15' },
    { id: 2, type: 'Accreditation', status: 'verified', date: '2026-03-20', expiry: '2027-03-20' },
    { id: 3, type: 'AML Screening', status: 'verified', date: '2026-05-20', expiry: '2026-11-20' },
    { id: 4, type: 'Jurisdiction Verification', status: 'verified', date: '2026-03-25', expiry: '2027-03-25' },
  ]);

  const [zkProofs, setZkProofs] = useState([
    { id: 1, name: 'Accreditation Proof', verified: true, circuit: 'Noir_accreditation_v1', date: '2026-05-20' },
    { id: 2, name: 'Jurisdiction Proof', verified: true, circuit: 'Noir_jurisdiction_v1', date: '2026-05-20' },
    { id: 3, name: 'AML Clearance Proof', verified: true, circuit: 'Noir_aml_v1', date: '2026-05-20' },
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">KYC & Compliance</h2>
        <p className="text-slate-400">Manage your investor credentials and ZK identity proofs</p>
      </div>

      {/* KYC Status Summary */}
      <div className="grid grid-cols-3 gap-6">
        {/* Overall Status */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Overall KYC Status</h3>
            {kycStatus === 'verified' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : kycStatus === 'pending' ? (
              <Clock className="w-6 h-6 text-amber-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400" />
            )}
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            kycStatus === 'verified' ? 'text-emerald-400' :
            kycStatus === 'pending' ? 'text-amber-400' :
            'text-red-400'
          }`}>
            {kycStatus.charAt(0).toUpperCase() + kycStatus.slice(1)}
          </div>
          <p className="text-sm text-slate-400">All verification checks completed successfully</p>
        </div>

        {/* Security Info */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">PQC Security</h3>
            <Shield className="w-6 h-6 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 mb-2">ML-DSA-87</div>
          <p className="text-sm text-slate-400">FIPS 204 quantum-safe signing enabled</p>
        </div>

        {/* ZK Credentials */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">ZK Credentials</h3>
            <Zap className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-2">{zkProofs.filter(p => p.verified).length}/{zkProofs.length}</div>
          <p className="text-sm text-slate-400">Privacy-preserving proofs active</p>
        </div>
      </div>

      {/* Credentials Status */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Credential Verification</h3>
        <div className="grid grid-cols-2 gap-4">
          {credentials.map((cred) => (
            <div key={cred.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="font-semibold text-white text-sm">{cred.type}</p>
                    <p className="text-xs text-slate-400">Verified on {cred.date}</p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="bg-slate-800 rounded px-3 py-2 mb-3">
                <p className="text-xs text-slate-400">Expires: {cred.expiry}</p>
              </div>
              <button className="w-full py-1 text-xs border border-slate-700 rounded hover:bg-slate-800 transition-colors text-slate-300">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ZK Proofs */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Zero-Knowledge Proofs</h3>
        <p className="text-sm text-slate-400 mb-4">Privacy-preserving proofs stored on-chain. No PII exposed.</p>
        <div className="space-y-3">
          {zkProofs.map((proof) => (
            <div key={proof.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    {proof.verified ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{proof.name}</p>
                    <p className="text-xs text-slate-400">Circuit: {proof.circuit}</p>
                    <p className="text-xs text-slate-500">Issued: {proof.date}</p>
                  </div>
                </div>
                <button className="px-4 py-2 text-sm border border-slate-700 rounded hover:bg-slate-800 transition-colors text-slate-300">
                  Verify On-Chain
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Rules */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Applicable Compliance Rules</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { rule: 'MiCA', jurisdiction: 'EU', status: 'Compliant' },
            { rule: 'Reg D', jurisdiction: 'US', status: 'Compliant' },
            { rule: 'FCA', jurisdiction: 'UK', status: 'Compliant' },
            { rule: 'VARA', jurisdiction: 'UAE', status: 'Compliant' },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">{item.rule}</p>
                  <p className="text-xs text-slate-400">{item.jurisdiction}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Upload */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-dashed border-slate-700 rounded-lg p-8">
        <div className="flex items-center justify-center flex-col gap-4">
          <Upload className="w-12 h-12 text-slate-600" />
          <div className="text-center">
            <h3 className="font-semibold text-white mb-1">Update Your Documents</h3>
            <p className="text-sm text-slate-400">Drag and drop or click to upload</p>
          </div>
          <button className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors">
            Upload Document
          </button>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-400 mb-1">AML Screening Expiring Soon</h4>
            <p className="text-sm text-slate-400">Your AML screening will expire on 2026-11-20. Please renew your credentials to continue trading.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
