import { useState } from 'react';
import { Home } from 'lucide-react';
import { PROPERTY_IMAGE_FALLBACKS } from '../../lib/propertyCatalog';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** Default: offering fallbacks. Pass [] for hero-only image (e.g. kensington-modern.jpg). */
  fallbacks?: string[];
};

/** Card/detail hero image with same-origin + CDN fallback chain. */
export function PropertyImage({
  src,
  alt = '',
  className = 'w-full h-full object-cover',
  fallbacks = PROPERTY_IMAGE_FALLBACKS,
}: Props) {
  const chain = [src, ...fallbacks.filter((u) => u !== src)];
  const [index, setIndex] = useState(0);
  const current = chain[index] ?? '';
  const failed = index >= chain.length;

  if (failed || !current) {
    return (
      <div className={`${className} bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center`}>
        <Home className="w-12 h-12 text-white/40" />
      </div>
    );
  }

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
