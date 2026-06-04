type ViteImportMeta = ImportMeta & { env?: Record<string, string | undefined> };

function viteEnv(key: string): string {
  if (typeof import.meta === 'undefined') return '';
  return (import.meta as ViteImportMeta).env?.[key] ?? '';
}

export type IpfsPinMode = 'pinata_live' | 'simulated';

export function getIpfsPinMode(): IpfsPinMode {
  const jwt =
    (typeof process !== 'undefined' && process.env?.PINATA_JWT) ||
    viteEnv('VITE_PINATA_JWT') ||
    '';
  const apiKey =
    (typeof process !== 'undefined' && process.env?.PINATA_API_KEY) ||
    viteEnv('VITE_IPFS_API_KEY') ||
    '';
  return jwt || apiKey ? 'pinata_live' : 'simulated';
}

/**
 * Pinata IPFS pinning — production Pinata when PINATA_JWT / PINATA_API_KEY set.
 */
export async function pinJsonToIpfs(data: Record<string, unknown>): Promise<string> {
  const jwt =
    (typeof process !== 'undefined' && process.env?.PINATA_JWT) ||
    viteEnv('VITE_PINATA_JWT') ||
    '';

  const apiKey =
    (typeof process !== 'undefined' && process.env?.PINATA_API_KEY) ||
    viteEnv('VITE_IPFS_API_KEY') ||
    '';
  if (!jwt && !apiKey) {
    const json = JSON.stringify(data);
    const encoded =
      typeof Buffer !== 'undefined'
        ? Buffer.from(json).toString('base64')
        : btoa(json);
    return 'Qm' + encoded.replace(/[^a-zA-Z0-9]/g, '').slice(0, 44);
  }

  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : { pinata_api_key: apiKey }),
    },
    body: JSON.stringify({
      pinataContent: data,
      pinataMetadata: { name: `rwa-twin-${Date.now()}` },
    }),
  });

  if (!res.ok) {
    throw new Error(`Pinata pin failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { IpfsHash: string };
  return body.IpfsHash;
}
