/**
 * Land registry ingestion — testnet fixtures mirror production API shapes.
 * Mainnet: set HM_LAND_REGISTRY_URL, TORRENS_API_URL, CADASTER_API_URL.
 */

import { resolveNetworkProfile } from '../config/networkProfile.js';

export type RegistryType = 'HM_LAND_REGISTRY' | 'TORRENS' | 'CADASTER';

export interface RegistryPropertyRecord {
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  titleNumber?: string;
  encumbrances?: Array<{ type: string; description: string }>;
  source: RegistryType;
  referenceId: string;
  fetchedAt: string;
  dataSource: 'live_api' | 'testnet_fixture';
}

function isKensingtonListing(ref: string) {
  const r = ref.toUpperCase();
  return (
    r.includes('KPG') ||
    r.includes('KENSINGTON') ||
    r.includes('98705321098') ||
    r === 'KPG-LUXURY-001'
  );
}

const kensingtonPalaceGardensFixture = (ref: string): RegistryPropertyRecord => ({
  title: 'High-End Modern Residence',
  address: 'Kensington Palace Gardens, London, UK',
  latitude: 51.502,
  longitude: -0.1874,
  squareFeet: 6200,
  bedrooms: 6,
  bathrooms: 5,
  yearBuilt: 2018,
  titleNumber: `HM-KPG-${ref}`,
  encumbrances: [{ type: 'MORTGAGE', description: 'Prime central London charge (fixture)' }],
  source: 'HM_LAND_REGISTRY',
  referenceId: ref,
  fetchedAt: new Date().toISOString(),
  dataSource: 'testnet_fixture',
});

const FIXTURES: Record<RegistryType, (ref: string) => RegistryPropertyRecord> = {
  HM_LAND_REGISTRY: (ref) => {
    if (isKensingtonListing(ref)) return kensingtonPalaceGardensFixture(ref);
    return {
      title: `HM Title ${ref}`,
      address: `${ref} Registry Lane, London`,
      latitude: 51.5074,
      longitude: -0.1278,
      squareFeet: 2500,
      bedrooms: 4,
      bathrooms: 2,
      yearBuilt: 1995,
      titleNumber: `HM-${ref}`,
      encumbrances: [{ type: 'MORTGAGE', description: 'Testnet fixture charge' }],
      source: 'HM_LAND_REGISTRY',
      referenceId: ref,
      fetchedAt: new Date().toISOString(),
      dataSource: 'testnet_fixture',
    };
  },
  TORRENS: (ref) => ({
    title: `Torrens Folio ${ref}`,
    address: `${ref} Pacific Hwy, Sydney`,
    latitude: -33.8688,
    longitude: 151.2093,
    squareFeet: 2200,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 2005,
    titleNumber: `TOR-${ref}`,
    encumbrances: [],
    source: 'TORRENS',
    referenceId: ref,
    fetchedAt: new Date().toISOString(),
    dataSource: 'testnet_fixture',
  }),
  CADASTER: (ref) => ({
    title: `Cadastre Parcel ${ref}`,
    address: `${ref} Rue Example, Paris`,
    latitude: 48.8566,
    longitude: 2.3522,
    squareFeet: 1800,
    bedrooms: 2,
    bathrooms: 1,
    yearBuilt: 1890,
    titleNumber: `CAD-${ref}`,
    encumbrances: [{ type: 'EASEMENT', description: 'Right of way (fixture)' }],
    source: 'CADASTER',
    referenceId: ref,
    fetchedAt: new Date().toISOString(),
    dataSource: 'testnet_fixture',
  }),
};

async function fetchLiveRegistry(
  registryType: RegistryType,
  referenceId: string
): Promise<RegistryPropertyRecord | null> {
  const urlKey =
    registryType === 'HM_LAND_REGISTRY'
      ? 'HM_LAND_REGISTRY_URL'
      : registryType === 'TORRENS'
        ? 'TORRENS_API_URL'
        : 'CADASTER_API_URL';
  const baseUrl = process.env?.[urlKey];
  if (!baseUrl) return null;

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/properties/${encodeURIComponent(referenceId)}`);
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  let raw: Record<string, unknown>;
  try {
    raw = (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
  return {
    title: String(raw.title ?? raw.propertyTitle ?? ''),
    address: String(raw.address ?? raw.propertyAddress ?? ''),
    latitude: Number(raw.latitude ?? raw.lat ?? 0),
    longitude: Number(raw.longitude ?? raw.lng ?? 0),
    squareFeet: Number(raw.squareFeet ?? raw.area ?? 0),
    bedrooms: Number(raw.bedrooms ?? 0),
    bathrooms: Number(raw.bathrooms ?? 0),
    yearBuilt: Number(raw.yearBuilt ?? raw.constructionYear ?? 0),
    titleNumber: String(raw.titleNumber ?? referenceId),
    encumbrances: Array.isArray(raw.encumbrances)
      ? (raw.encumbrances as Array<{ type: string; description: string }>)
      : [],
    source: registryType,
    referenceId,
    fetchedAt: new Date().toISOString(),
    dataSource: 'live_api',
  };
}

export async function fetchRegistryProperty(
  registryType: RegistryType,
  referenceId: string
): Promise<RegistryPropertyRecord> {
  const profile = resolveNetworkProfile();
  if (!profile.useIntegrationFixtures) {
    const live = await fetchLiveRegistry(registryType, referenceId);
    if (live) return live;
    throw new Error(`Live registry API failed for ${registryType} — configure env URLs`);
  }

  const live = await fetchLiveRegistry(registryType, referenceId);
  if (live) return live;
  return FIXTURES[registryType](referenceId);
}
