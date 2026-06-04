import type { PhysicalAsset } from './api';

/** Same-origin images (served from /public/properties) — reliable when CDN blocks hotlinking. */
/**
 * Home hero only — “Premium properties portfolio” card image.
 * File: public/properties/kensington-modern.jpg
 */
export const PREMIUM_PROPERTIES_PORTFOLIO_IMAGE = '/properties/kensington-modern.jpg';

export const PROPERTY_IMAGES = {
  /** Investments marketplace & featured offering cards */
  offering: '/properties/kensington-aerial.jpg',
  aerial: '/properties/kensington-aerial.jpg',
  fallback: '/properties/fallback-luxury.jpg',
} as const;

/** Fallback chain for listing cards (excludes kensington-modern.jpg) */
export const PROPERTY_IMAGE_FALLBACKS = [
  PROPERTY_IMAGES.offering,
  PROPERTY_IMAGES.fallback,
];

/** Curated display + imagery for flagship listings (DB may still use registry refs). */
export interface PropertyCatalogEntry {
  slug: string;
  title: string;
  addressDisplay: string;
  description: string;
  imageUrl: string;
  galleryImageUrl?: string;
  locationTag: string;
  defaultFundingPercent?: number;
  registryReferenceId: string;
  match: (asset: PhysicalAsset) => boolean;
}

export const KENSINGTON_SLUG = 'kensington-palace-gardens';

function isLondonListing(asset: PhysicalAsset) {
  const addr = asset.address.toLowerCase();
  const title = asset.title.toLowerCase();
  return (
    addr.includes('kensington palace gardens') ||
    addr.includes('registry lane') ||
    addr.includes('london') ||
    title.includes('smoke') ||
    title.includes('hm title') ||
    title.includes('luxury') ||
    title.includes('high-end modern')
  );
}

export const PROPERTY_CATALOG: PropertyCatalogEntry[] = [
  {
    slug: KENSINGTON_SLUG,
    title: 'High-End Modern Residence',
    addressDisplay: 'Kensington Palace Gardens, London, UK',
    description:
      'A high-end modern real estate property with a sleek architectural design, large glass windows, and a beautifully landscaped garden.',
    imageUrl: PROPERTY_IMAGES.offering,
    galleryImageUrl: undefined,
    locationTag: 'London',
    defaultFundingPercent: 75,
    registryReferenceId: 'KPG-LUXURY-001',
    match: (asset) =>
      asset.address.toLowerCase().includes('kensington palace gardens') ||
      asset.title.toLowerCase().includes('high-end modern') ||
      asset.address.includes('98705321098') ||
      isLondonListing(asset),
  },
];

export const COMING_SOON_PROPERTIES: Array<{
  title: string;
  location: string;
  note: string;
}> = [
  { title: 'Waterfront villa collection', location: 'Dubai Marina', note: 'To be added' },
  { title: 'Manhattan commercial tower', location: 'New York, NY', note: 'To be added' },
  { title: 'Alpine chalet estate', location: 'Zermatt', note: 'To be added' },
];

export function resolveCatalogEntry(asset: PhysicalAsset): PropertyCatalogEntry | null {
  return PROPERTY_CATALOG.find((e) => e.match(asset)) ?? null;
}

export function getPropertyImage(asset: PhysicalAsset): string {
  return resolveCatalogEntry(asset)?.imageUrl ?? defaultImageForId(asset.id);
}

export function getDisplayTitle(asset: PhysicalAsset): string {
  const entry = resolveCatalogEntry(asset);
  if (entry) return entry.title;
  if (isLondonListing(asset)) return 'High-End Modern Residence';
  return asset.title;
}

export function getDisplayAddress(asset: PhysicalAsset): string {
  const entry = resolveCatalogEntry(asset);
  if (entry) return entry.addressDisplay;
  if (isLondonListing(asset)) return 'Kensington Palace Gardens, London, UK';
  return asset.address;
}

export function getPropertyDescription(asset: PhysicalAsset): string | null {
  return resolveCatalogEntry(asset)?.description ?? null;
}

export function getDefaultFundingPercent(asset: PhysicalAsset): number | undefined {
  return resolveCatalogEntry(asset)?.defaultFundingPercent;
}

function defaultImageForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h += id.charCodeAt(i);
  return PROPERTY_IMAGE_FALLBACKS[h % PROPERTY_IMAGE_FALLBACKS.length];
}
