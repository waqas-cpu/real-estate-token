import { useEffect, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import type { AssetDetail } from '../lib/dataSource';
import { getInvestmentQuote, subscribeToOffering } from '../lib/dataSource';
import { formatUsd, usdcMicroToUsd } from '../lib/format';
import { useAuth } from '../lib/AuthContext';

type Props = {
  detail: AssetDetail;
  onClose: () => void;
  onSuccess: () => void;
};

export function InvestModal({ detail, onClose, onSuccess }: Props) {
  const { investorWallet, user } = useAuth();
  const [tokenCount, setTokenCount] = useState(10);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [paidUsd, setPaidUsd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const offering = detail.offering;
  const token = detail.token;

  useEffect(() => {
    if (!offering || !detail.asset.id) return;
    let cancelled = false;
    (async () => {
      setQuoteLoading(true);
      setQuoteError('');
      try {
        const q = await getInvestmentQuote(detail.asset.id, tokenCount);
        if (!cancelled) setPaidUsd(usdcMicroToUsd(q.paidUsdcMicro));
      } catch (e) {
        if (!cancelled) setQuoteError(e instanceof Error ? e.message : 'Could not load price');
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.asset.id, tokenCount, offering]);

  const handleInvest = async () => {
    if (!user) {
      setError('Sign in (header) to complete an investment.');
      return;
    }
    if (!offering || !investorWallet.trim()) {
      setError('Add your wallet address in the header before investing.');
      return;
    }
    if (offering.status !== 'ACTIVE') {
      setError('This offering is not open yet.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await subscribeToOffering(offering.id, investorWallet.trim(), tokenCount);
      setDone(true);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Investment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-brand-navy">Invest in property</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-brand-navy">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">{detail.asset.title}</p>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-brand-navy font-medium">Investment recorded</p>
            <p className="text-sm text-slate-500 mt-2">View updates in your portfolio.</p>
            <button type="button" onClick={onClose} className="mt-6 w-full btn-primary">
              Done
            </button>
          </div>
        ) : !token || !offering ? (
          <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-4 py-4">
            This property is not open for investment yet. Check back when the offering is live.
          </p>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500">Token symbol</label>
                <p className="text-brand-navy font-medium">{token.symbol}</p>
              </div>
              {detail.valuation && (
                <div>
                  <label className="text-xs text-slate-500">Estimated value</label>
                  <p className="text-brand-navy">{formatUsd(detail.valuation.fmv)}</p>
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Number of tokens</label>
                <input
                  type="number"
                  min={1}
                  max={3000}
                  value={tokenCount}
                  onChange={(e) => setTokenCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="input-field"
                />
              </div>
              <div className="p-3 bg-brand-50 rounded-lg border border-brand-100">
                <p className="text-xs text-slate-500">Estimated total (USDC)</p>
                <p className="text-xl font-bold text-brand-700">
                  {quoteLoading ? '…' : quoteError ? '—' : paidUsd || '—'}
                </p>
                {quoteError && <p className="text-xs text-amber-400 mt-1">{quoteError}</p>}
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={submitting || quoteLoading}
              onClick={handleInvest}
              className="mt-6 w-full btn-primary disabled:opacity-50"
            >
              {submitting ? 'Processing…' : 'Confirm investment'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
