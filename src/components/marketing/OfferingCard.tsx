import { MapPin } from 'lucide-react';
import type { PhysicalAsset, TokenOffering } from '../../lib/api';
import { formatUsd, offeringProgress, usdcMicroToUsd } from '../../lib/format';
import {
  getDefaultFundingPercent,
  getDisplayAddress,
  getDisplayTitle,
  getPropertyImage,
} from '../../lib/propertyCatalog';
import { PropertyImage } from './PropertyImage';

function parseLocation(address: string) {
  const parts = address.split(',').map((s) => s.trim());
  if (parts.length >= 2) {
    return { city: parts[parts.length - 2], region: parts[parts.length - 1] };
  }
  return { city: address.slice(0, 40), region: '' };
}

export type OfferingSummary = {
  valuationFmv?: number | null;
  totalSupply?: string | null;
  offering?: TokenOffering | null;
};

type Props = {
  asset: PhysicalAsset;
  summary?: OfferingSummary;
  onView: () => void;
};

export function OfferingCard({ asset, summary, onView }: Props) {
  const img = getPropertyImage(asset);
  const displayTitle = getDisplayTitle(asset);
  const displayAddress = getDisplayAddress(asset);
  const loc = parseLocation(displayAddress);
  const offering = summary?.offering;
  const maxRaise = offering ? parseFloat(offering.max_raise) / 1_000_000 : summary?.valuationFmv ?? 0;
  const raised = offering ? parseFloat(offering.total_raised) / 1_000_000 : 0;
  const fallbackPct = getDefaultFundingPercent(asset);
  const pct = offering
    ? offeringProgress(offering.total_raised, offering.max_raise)
    : fallbackPct ?? (asset.verified ? 72 : 35);
  const displayValue = summary?.valuationFmv ?? maxRaise;
  const tokensAvail = summary?.totalSupply
    ? Number(summary.totalSupply).toLocaleString()
    : offering
      ? Math.floor(parseFloat(offering.max_raise) / parseFloat(offering.token_price || '1')).toLocaleString()
      : '—';

  return (
    <article className="bg-white rounded-xl overflow-hidden shadow-card border border-slate-100 hover:shadow-card-hover transition-shadow">
      <div className="relative h-52 overflow-hidden">
        <PropertyImage src={img} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-lg leading-tight uppercase tracking-wide">
            {displayTitle}
          </h3>
          <p className="flex items-center gap-1 text-sm text-white/90 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {loc.city}
            {loc.region ? `, ${loc.region}` : ''}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-baseline gap-2">
          <div>
            <p className="text-xs text-slate-400 uppercase">Value</p>
            <p className="text-2xl font-bold text-brand-navy">
              {displayValue ? formatUsd(displayValue) : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase">Tokens available</p>
            <p className="text-lg font-semibold text-slate-700">{tokensAvail}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="progress-orange">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span className="font-semibold text-accent-orange">{pct}% funded</span>
            <span>
              {offering
                ? `${usdcMicroToUsd(offering.total_raised)} / ${usdcMicroToUsd(offering.max_raise)}`
                : raised
                  ? `${formatUsd(raised)} / ${formatUsd(maxRaise)}`
                  : 'Offering pending'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onView}
          className="mt-5 w-full py-3 rounded-lg bg-brand-navy hover:bg-slate-800 text-white font-semibold text-sm transition-colors"
        >
          View offering
        </button>
      </div>
    </article>
  );
}
