import { MapPin, ArrowRight } from 'lucide-react';
import type { PhysicalAsset } from '../../lib/api';
import { Badge } from '../ui/Status';

const PLACEHOLDER_IMAGES = [
  'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3735206/pexels-photo-3735206.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function imageForAsset(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h += id.charCodeAt(i);
  return PLACEHOLDER_IMAGES[h % PLACEHOLDER_IMAGES.length];
}

type Props = {
  asset: PhysicalAsset;
  onView: () => void;
};

export function PropertyCard({ asset, onView }: Props) {
  const img = imageForAsset(asset.id);

  return (
    <article className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-slate-100">
      <div className="relative h-48 overflow-hidden">
        <img
          src={img}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          {asset.verified ? (
            <Badge tone="success">Verified</Badge>
          ) : (
            <Badge tone="warn">In review</Badge>
          )}
          <Badge tone="info">Tokenized</Badge>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-brand-navy text-lg leading-snug line-clamp-2">
          {asset.title}
        </h3>
        <p className="flex items-start gap-1.5 text-sm text-slate-500 mt-2">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{asset.address}</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-400 text-xs">Registry</p>
            <p className="font-medium text-slate-700">{formatRegistry(asset.registry_source)}</p>
          </div>
          {asset.square_feet && (
            <div>
              <p className="text-slate-400 text-xs">Size</p>
              <p className="font-medium text-slate-700">{asset.square_feet.toLocaleString()} sq ft</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onView}
          className="mt-5 w-full btn-primary group-hover:bg-brand-700"
        >
          View offering
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}

function formatRegistry(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
