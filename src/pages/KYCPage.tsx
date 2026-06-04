import { useEffect, useState } from 'react';
import { Shield, Upload, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useKYCStatus } from '../lib/hooks';
import { startKYCVerification, isUsingBackend } from '../lib/dataSource';
import { LoadingState, ErrorState } from '../components/ui/Status';

export type KYCProfileDraft = {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  idType: 'passport' | 'drivers_license';
  idFileName?: string;
};

const NATIONALITIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'France',
  'Singapore',
  'United Arab Emirates',
  'Other',
];

function profileKey(wallet: string) {
  return `kycProfile_${wallet.toLowerCase()}`;
}

export function loadKYCProfile(wallet: string): KYCProfileDraft | null {
  try {
    const raw = localStorage.getItem(profileKey(wallet));
    return raw ? (JSON.parse(raw) as KYCProfileDraft) : null;
  } catch {
    return null;
  }
}

export function saveKYCProfile(wallet: string, profile: KYCProfileDraft) {
  localStorage.setItem(profileKey(wallet), JSON.stringify(profile));
}

export default function KYCPage() {
  const { investorWallet } = useAuth();
  const { data: kyc, loading, error, refetch } = useKYCStatus(investorWallet || null);
  const [jurisdiction, setJurisdiction] = useState('US');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [profile, setProfile] = useState<KYCProfileDraft>({
    fullName: '',
    dateOfBirth: '',
    nationality: 'United States',
    idType: 'passport',
  });

  useEffect(() => {
    if (!investorWallet) return;
    const saved = loadKYCProfile(investorWallet);
    if (saved) setProfile(saved);
  }, [investorWallet]);

  const verified = kyc?.accreditated && kyc?.aml_cleared_at;

  const handleFile = (file: File | null) => {
    if (!file) return;
    setProfile((p) => ({ ...p, idFileName: file.name }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investorWallet.trim()) {
      setMsg('Enter your wallet in the header first.');
      return;
    }
    if (!profile.fullName.trim() || !profile.dateOfBirth) {
      setMsg('Please complete all required personal information fields.');
      return;
    }
    if (!profile.idFileName) {
      setMsg('Upload a government-issued ID (passport or driver\'s license).');
      return;
    }

    saveKYCProfile(investorWallet.trim(), profile);

    if (!isUsingBackend()) {
      setMsg('Profile saved locally. Start the backend to complete verification.');
      return;
    }

    setBusy(true);
    setMsg('');
    try {
      await startKYCVerification(investorWallet.trim(), jurisdiction);
      setMsg('Verification submitted. Your ID is stored securely for review.');
      refetch?.();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  if (!investorWallet) {
    return (
      <div className="min-h-[60vh] bg-dark-hero flex items-center justify-center px-4">
        <div className="glass-panel-dark p-10 max-w-md text-center text-white">
          <Shield className="w-12 h-12 text-accent-cyan mx-auto mb-4" />
          <h1 className="font-display text-2xl font-semibold">Investor verification</h1>
          <p className="text-slate-400 mt-2">Add your wallet in the header to begin identity verification.</p>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="min-h-full bg-dark-hero py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-semibold text-white">Identity verification</h1>
        <p className="text-slate-400 mt-2">
          Provide personal details and a government-issued ID to invest in tokenized offerings.
        </p>

        <div className="mt-6 glass-panel-dark p-5 flex items-center gap-4 text-white">
          {verified ? (
            <CheckCircle className="w-10 h-10 text-accent-cyan shrink-0" />
          ) : (
            <Clock className="w-10 h-10 text-amber-400 shrink-0" />
          )}
          <div>
            <p className="font-semibold text-lg">
              {verified ? 'Eligible to invest' : 'Verification required'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {verified
                ? 'Your profile is cleared for offerings.'
                : 'Complete the form below to unlock investing.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 glass-panel-dark p-6 md:p-8 space-y-6 text-white">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-accent-cyan mb-4">
              Personal information
            </h2>
            <div className="space-y-4">
              <Field label="Full legal name" required>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className="kyc-input"
                  placeholder="As shown on your ID"
                  required
                />
              </Field>
              <Field label="Date of birth" required>
                <input
                  type="date"
                  value={profile.dateOfBirth}
                  onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                  className="kyc-input"
                  required
                />
              </Field>
              <Field label="Nationality" required>
                <select
                  value={profile.nationality}
                  onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
                  className="kyc-input"
                >
                  {NATIONALITIES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Region / jurisdiction">
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="kyc-input"
                >
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="EU">European Union</option>
                  <option value="SG">Singapore</option>
                </select>
              </Field>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-accent-cyan mb-4">
              Government-issued ID
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Upload a clear photo of your passport or driver&apos;s license. Files are encrypted in
              transit; only authorized compliance reviewers can access them.
            </p>

            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="idType"
                  checked={profile.idType === 'passport'}
                  onChange={() => setProfile({ ...profile, idType: 'passport' })}
                  className="accent-accent-cyan"
                />
                Passport
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="idType"
                  checked={profile.idType === 'drivers_license'}
                  onChange={() => setProfile({ ...profile, idType: 'drivers_license' })}
                  className="accent-accent-cyan"
                />
                Driver&apos;s license
              </label>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/25 rounded-xl p-8 cursor-pointer hover:border-accent-cyan/50 transition-colors">
              <Upload className="w-8 h-8 text-accent-cyan mb-2" />
              <span className="text-sm font-medium">Upload {profile.idType === 'passport' ? 'passport' : 'license'}</span>
              <span className="text-xs text-slate-500 mt-1">PNG, JPG or PDF — max 10 MB</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {profile.idFileName && (
                <span className="mt-3 text-xs text-accent-cyan">{profile.idFileName}</span>
              )}
            </label>
          </section>

          <button
            type="submit"
            disabled={busy || verified}
            className="w-full py-3 rounded-full bg-accent-cyan text-dark-hero font-bold text-sm hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Submitting…' : verified ? 'Verified' : 'Submit for verification'}
          </button>
          {msg && <p className="text-sm text-slate-300 text-center">{msg}</p>}
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-300 mb-1.5 block">
        {label}
        {required && <span className="text-accent-cyan ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
