/** Deterministic content hash (prototype stand-in for SHA3-512). Works in browser and Node. */
export function hashContent(data: string): string {
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (
    'sha3_' +
    (hash >>> 0).toString(16).padStart(8, '0') +
    data.length.toString(16)
  );
}

/** Canonical asset fields for content-integrity gate (ARCHITECTURE RULE_CONTENT_HASH). */
export function canonicalAssetPayload(asset: {
  address: string;
  title: string;
  lat: number;
  lng: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  registrySource: string;
}) {
  return {
    address: asset.address,
    title: asset.title,
    lat: asset.lat,
    lng: asset.lng,
    squareFeet: asset.squareFeet,
    bedrooms: asset.bedrooms,
    bathrooms: asset.bathrooms,
    yearBuilt: asset.yearBuilt,
    registrySource: asset.registrySource,
  };
}

export function hashAssetIntegrity(asset: Parameters<typeof canonicalAssetPayload>[0]): string {
  return hashContent(JSON.stringify(canonicalAssetPayload(asset)));
}
