export interface OracleAttestationInput {
  assetId: string;
  source: 'CHAINLINK' | 'PYTH' | 'CERTIFIED_APPRAISER' | 'CUSTOM';
  valuationUsd: number;
  confidence: number;
  timestamp: string;
  signature: string;
}

export interface OracleAttestationValidationResult {
  accepted: boolean;
  reason?: string;
  isStale: boolean;
  circuitBreakerTripped: boolean;
  deviationPercentage: number;
  quorumReached: boolean;
  activeValuationUsd: number;
}

export class OracleIntegrityService {
  private maxStalenessMs = 24 * 60 * 60 * 1000; // 24 hours
  private maxDeviationThresholdPct = 10; // 10% max deviation
  private activeAssetPrices: Map<string, number> = new Map([
    ['prop-kensington-001', 3000000],
  ]);
  private attestationsByAsset: Map<string, OracleAttestationInput[]> = new Map();

  /**
   * Validate incoming oracle attestation against data integrity rules, staleness, and deviation bands.
   */
  validateAndIngestAttestation(attestation: OracleAttestationInput): OracleAttestationValidationResult {
    const now = Date.now();
    const attestationTime = new Date(attestation.timestamp).getTime();
    const isStale = now - attestationTime > this.maxStalenessMs;

    if (isStale) {
      return {
        accepted: false,
        reason: 'Attestation timestamp exceeds 24-hour heartbeat staleness threshold',
        isStale: true,
        circuitBreakerTripped: false,
        deviationPercentage: 0,
        quorumReached: false,
        activeValuationUsd: this.activeAssetPrices.get(attestation.assetId) ?? 3000000,
      };
    }

    if (!attestation.signature || attestation.signature.length < 10) {
      return {
        accepted: false,
        reason: 'Cryptographic attestation signature is missing or invalid',
        isStale: false,
        circuitBreakerTripped: false,
        deviationPercentage: 0,
        quorumReached: false,
        activeValuationUsd: this.activeAssetPrices.get(attestation.assetId) ?? 3000000,
      };
    }

    const currentPrice = this.activeAssetPrices.get(attestation.assetId) ?? attestation.valuationUsd;
    const diff = Math.abs(attestation.valuationUsd - currentPrice);
    const deviationPct = Math.round((diff / currentPrice) * 10000) / 100;

    if (deviationPct > this.maxDeviationThresholdPct) {
      return {
        accepted: false,
        reason: `Price deviation of ${deviationPct}% exceeds 10% circuit-breaker threshold`,
        isStale: false,
        circuitBreakerTripped: true,
        deviationPercentage: deviationPct,
        quorumReached: false,
        activeValuationUsd: currentPrice,
      };
    }

    // Ingest attestation
    const existing = this.attestationsByAsset.get(attestation.assetId) || [];
    existing.push(attestation);
    this.attestationsByAsset.set(attestation.assetId, existing);

    // Check multi-oracle quorum (at least 2 independent sources)
    const uniqueSources = new Set(existing.map((a) => a.source));
    const quorumReached = uniqueSources.size >= 2;

    if (quorumReached) {
      // Calculate median / average of recent attestations
      const recent = existing.filter((a) => now - new Date(a.timestamp).getTime() <= this.maxStalenessMs);
      const avgPrice = recent.reduce((sum, a) => sum + a.valuationUsd, 0) / recent.length;
      this.activeAssetPrices.set(attestation.assetId, Math.round(avgPrice));
    }

    return {
      accepted: true,
      isStale: false,
      circuitBreakerTripped: false,
      deviationPercentage: deviationPct,
      quorumReached,
      activeValuationUsd: this.activeAssetPrices.get(attestation.assetId) ?? attestation.valuationUsd,
    };
  }

  getActivePrice(assetId: string): number {
    return this.activeAssetPrices.get(assetId) ?? 3000000;
  }
}
