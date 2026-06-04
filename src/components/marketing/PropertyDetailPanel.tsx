import { X, ShoppingCart, Home, TrendingUp } from 'lucide-react';
import type { AssetDetail } from '../../lib/dataSource';
import { formatUsd, riskLabel, offeringProgress } from '../../lib/format';
import { Badge } from '../ui/Status';
import { LoadingState } from '../ui/Status';
import {
  getDisplayAddress,
  getDisplayTitle,
  getPropertyDescription,
  getPropertyImage,
  PROPERTY_IMAGES,
  resolveCatalogEntry,
} from '../../lib/propertyCatalog';
import { PropertyImage } from './PropertyImage';

type Props = {
  detail: AssetDetail | null;
  loading: boolean;
  onClose: () => void;
  onInvest: () => void;
};

export function PropertyDetailPanel({ detail, loading, onClose, onInvest }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-brand-navy/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <h2 className="font-display font-semibold text-brand-navy">Offering details</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6">
          {loading && <LoadingState />}
          {detail && (
            <>
              <PropertyImage
                src={getPropertyImage(detail.asset)}
                className="w-full h-48 object-cover rounded-xl"
              />
              {resolveCatalogEntry(detail.asset)?.galleryImageUrl && (
                <PropertyImage
                  src={resolveCatalogEntry(detail.asset)!.galleryImageUrl!}
                  className="w-full h-36 object-cover rounded-xl mt-3"
                />
              )}
              <h3 className="text-2xl font-semibold text-brand-navy mt-4">
                {getDisplayTitle(detail.asset)}
              </h3>
              <p className="text-slate-500 mt-2">{getDisplayAddress(detail.asset)}</p>
              {getPropertyDescription(detail.asset) && (
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  {getPropertyDescription(detail.asset)}
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-4">
                {detail.valuation && (
                  <div className="bg-brand-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Est. value</p>
                    <p className="text-xl font-bold text-brand-700 mt-1">
                      {formatUsd(detail.valuation.fmv)}
                    </p>
                  </div>
                )}
                {detail.risk?.composite != null && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Risk profile</p>
                    <p className="text-lg font-semibold text-brand-navy mt-1">
                      {riskLabel(detail.risk.composite).label}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone={detail.asset.verified ? 'success' : 'warn'}>
                  {detail.asset.verified ? 'Verified asset' : 'Pending verification'}
                </Badge>
                {detail.token && <Badge tone="info">{detail.token.symbol}</Badge>}
              </div>

              {detail.offering && (
                <div className="mt-8 border border-slate-200 rounded-xl p-5">
                  <p className="font-semibold text-brand-navy flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-600" />
                    Active offering
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Status: {detail.offering.status}</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Funded</span>
                      <span>
                        {offeringProgress(
                          detail.offering.total_raised,
                          detail.offering.max_raise
                        )}
                        %
                      </span>
                    </div>
                    <div className="progress-orange">
                      <span
                        style={{
                          width: `${offeringProgress(
                            detail.offering.total_raised,
                            detail.offering.max_raise
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  {detail.offering.status === 'ACTIVE' ? (
                    <button type="button" onClick={onInvest} className="mt-5 w-full btn-primary">
                      <ShoppingCart className="w-4 h-4" />
                      Invest in this offering
                    </button>
                  ) : (
                    <p className="mt-4 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                      This offering is not open for subscription yet.
                    </p>
                  )}
                </div>
              )}

              {!detail.offering && (
                <div className="mt-8 flex gap-3 items-start bg-slate-50 rounded-xl p-4">
                  <Home className="w-5 h-5 text-slate-400 shrink-0" />
                  <p className="text-sm text-slate-600">
                    Token offering coming soon. Check back or explore other listings.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
