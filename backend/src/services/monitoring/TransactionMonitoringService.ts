import { getSupabaseAdmin } from '../../supabase.js';

export interface MonitoringAlert {
  id: string;
  walletAddress: string;
  alertType:
    | 'VELOCITY_SPIKE'
    | 'STRUCTURING_DETECTED'
    | 'SANCTIONS_MATCH'
    | 'LARGE_VOLUME'
    | 'UNAUTHORIZED_TRANSFER'
    | 'RAPID_CIRCULATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  details: Record<string, any>;
  status: 'OPEN' | 'INVESTIGATING' | 'DISMISSED' | 'FROZEN_CONFIRMED';
  createdAt: string;
}

export class TransactionMonitoringService {
  private inMemoryAlerts: Map<string, MonitoringAlert> = new Map();
  private recentWalletTxs: Map<string, Array<{ amountUsd: number; timestamp: number }>> = new Map();
  // Mock sanctioned address list (e.g. Tornado Cash, OFAC SDN addresses)
  private knownSanctionedWallets = new Set([
    '0x8589427373d6d84e98730d7795d8f6f8731fda16',
    '0x72a5843cc08275c8171e549c92ec9ea8c854e16f',
    '0x_sanctioned_test_wallet',
  ]);

  evaluateTransaction(tx: {
    txHash: string;
    walletAddress: string;
    amountUsd: number;
    destinationAddress?: string;
    timestamp?: number;
  }): { isFlagged: boolean; riskScore: number; alerts: MonitoringAlert[] } {
    const wallet = tx.walletAddress.toLowerCase();
    const dest = tx.destinationAddress?.toLowerCase();
    const time = tx.timestamp ?? Date.now();
    const newAlerts: MonitoringAlert[] = [];
    let riskScore = 10;

    // Track history for velocity & structuring
    const history = this.recentWalletTxs.get(wallet) || [];
    history.push({ amountUsd: tx.amountUsd, timestamp: time });
    // Keep last 1 hour
    const oneHourAgo = time - 3600000;
    const cleanHistory = history.filter((h) => h.timestamp >= oneHourAgo);
    this.recentWalletTxs.set(wallet, cleanHistory);

    // 1. Sanctions Check
    if (this.knownSanctionedWallets.has(wallet) || (dest && this.knownSanctionedWallets.has(dest))) {
      riskScore = 100;
      const alert: MonitoringAlert = {
        id: `alert-sanc-${Date.now()}`,
        walletAddress: wallet,
        alertType: 'SANCTIONS_MATCH',
        severity: 'CRITICAL',
        riskScore: 100,
        details: { txHash: tx.txHash, matchedAddress: wallet, amountUsd: tx.amountUsd },
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };
      newAlerts.push(alert);
      this.inMemoryAlerts.set(alert.id, alert);
    }

    // 2. Structuring Detection ($9,000 - $9,999 USD or multiple sub-$10k transfers)
    if (tx.amountUsd >= 9000 && tx.amountUsd < 10000) {
      riskScore = Math.max(riskScore, 75);
      const alert: MonitoringAlert = {
        id: `alert-struct-${Date.now()}`,
        walletAddress: wallet,
        alertType: 'STRUCTURING_DETECTED',
        severity: 'HIGH',
        riskScore: 75,
        details: {
          txHash: tx.txHash,
          amountUsd: tx.amountUsd,
          reason: 'Transaction amount just below $10,000 BSA/AML reporting threshold',
        },
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };
      newAlerts.push(alert);
      this.inMemoryAlerts.set(alert.id, alert);
    }

    // 3. Velocity Spike (> 4 transactions in 1 hour)
    if (cleanHistory.length >= 4) {
      riskScore = Math.max(riskScore, 65);
      const alert: MonitoringAlert = {
        id: `alert-velo-${Date.now()}`,
        walletAddress: wallet,
        alertType: 'VELOCITY_SPIKE',
        severity: 'MEDIUM',
        riskScore: 65,
        details: {
          txCount: cleanHistory.length,
          windowMs: 3600000,
          totalVolumeUsd: cleanHistory.reduce((s, h) => s + h.amountUsd, 0),
        },
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };
      newAlerts.push(alert);
      this.inMemoryAlerts.set(alert.id, alert);
    }

    // 4. Large Volume (> $250,000)
    if (tx.amountUsd >= 250000) {
      riskScore = Math.max(riskScore, 50);
      const alert: MonitoringAlert = {
        id: `alert-vol-${Date.now()}`,
        walletAddress: wallet,
        alertType: 'LARGE_VOLUME',
        severity: 'MEDIUM',
        riskScore: 50,
        details: { amountUsd: tx.amountUsd },
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };
      newAlerts.push(alert);
      this.inMemoryAlerts.set(alert.id, alert);
    }

    return {
      isFlagged: newAlerts.length > 0,
      riskScore,
      alerts: newAlerts,
    };
  }

  listAlerts(): MonitoringAlert[] {
    return Array.from(this.inMemoryAlerts.values()).reverse();
  }

  resolveAlert(
    alertId: string,
    resolution: 'DISMISSED' | 'FROZEN_CONFIRMED',
    _resolvedBy: string
  ): MonitoringAlert {
    const alert = this.inMemoryAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    alert.status = resolution;
    return alert;
  }
}
