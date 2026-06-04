/** User-facing formatting — hides raw micro-units and chain details */

export function formatUsd(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return '—';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function usdcMicroToUsd(micro: string | number | bigint): string {
  const n = Number(micro) / 1_000_000;
  return formatUsd(n);
}

export function riskLabel(composite: number | null | undefined): {
  label: string;
  tone: 'low' | 'medium' | 'high' | 'unknown';
} {
  if (composite == null) return { label: 'Not rated', tone: 'unknown' };
  if (composite <= 35) return { label: 'Low risk', tone: 'low' };
  if (composite <= 65) return { label: 'Medium risk', tone: 'medium' };
  return { label: 'Higher risk', tone: 'high' };
}

export function offeringProgress(raised: string, maxRaise: string): number {
  const r = parseFloat(raised) || 0;
  const m = parseFloat(maxRaise) || 1;
  return Math.min(100, Math.round((r / m) * 100));
}

export function truncateWallet(wallet: string): string {
  if (wallet.length < 12) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}
