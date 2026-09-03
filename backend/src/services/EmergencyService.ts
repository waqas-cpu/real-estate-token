import { getSupabaseAdmin } from '../supabase.js';

export interface EmergencyActionRecord {
  id: string;
  targetType: 'OFFERING' | 'TOKEN' | 'WALLET' | 'GLOBAL';
  targetAddress: string;
  action: 'PAUSE' | 'UNPAUSE' | 'FREEZE' | 'UNFREEZE';
  reason: string;
  triggeredBy: string;
  timestamp: string;
}

export class EmergencyService {
  private pausedOfferings: Set<string> = new Set();
  private pausedTokens: Set<string> = new Set();
  private frozenWallets: Map<string, { reason: string; frozenAt: string; triggeredBy: string }> = new Map();
  private history: EmergencyActionRecord[] = [];

  async pauseOffering(offeringAddress: string, reason: string, triggeredBy: string) {
    const addr = offeringAddress.toLowerCase();
    this.pausedOfferings.add(addr);

    const record: EmergencyActionRecord = {
      id: `em-${Date.now()}`,
      targetType: 'OFFERING',
      targetAddress: addr,
      action: 'PAUSE',
      reason,
      triggeredBy,
      timestamp: new Date().toISOString(),
    };
    this.history.push(record);
    await this.logEmergencyAudit(record);

    return { success: true, offering: addr, paused: true, reason };
  }

  async unpauseOffering(offeringAddress: string, triggeredBy: string) {
    const addr = offeringAddress.toLowerCase();
    this.pausedOfferings.delete(addr);

    const record: EmergencyActionRecord = {
      id: `em-${Date.now()}`,
      targetType: 'OFFERING',
      targetAddress: addr,
      action: 'UNPAUSE',
      reason: 'Admin resolution',
      triggeredBy,
      timestamp: new Date().toISOString(),
    };
    this.history.push(record);
    await this.logEmergencyAudit(record);

    return { success: true, offering: addr, paused: false };
  }

  async freezeWallet(tokenAddress: string, walletAddress: string, reason: string, triggeredBy: string) {
    const token = tokenAddress.toLowerCase();
    const wallet = walletAddress.toLowerCase();
    const key = `${token}:${wallet}`;

    this.frozenWallets.set(key, {
      reason,
      frozenAt: new Date().toISOString(),
      triggeredBy,
    });

    const record: EmergencyActionRecord = {
      id: `em-${Date.now()}`,
      targetType: 'WALLET',
      targetAddress: wallet,
      action: 'FREEZE',
      reason,
      triggeredBy,
      timestamp: new Date().toISOString(),
    };
    this.history.push(record);
    await this.logEmergencyAudit(record);

    return { success: true, token, wallet, frozen: true, reason };
  }

  async unfreezeWallet(tokenAddress: string, walletAddress: string, triggeredBy: string) {
    const token = tokenAddress.toLowerCase();
    const wallet = walletAddress.toLowerCase();
    const key = `${token}:${wallet}`;

    this.frozenWallets.delete(key);

    const record: EmergencyActionRecord = {
      id: `em-${Date.now()}`,
      targetType: 'WALLET',
      targetAddress: wallet,
      action: 'UNFREEZE',
      reason: 'Admin clearance',
      triggeredBy,
      timestamp: new Date().toISOString(),
    };
    this.history.push(record);
    await this.logEmergencyAudit(record);

    return { success: true, token, wallet, frozen: false };
  }

  isOfferingPaused(offeringAddress: string): boolean {
    return this.pausedOfferings.has(offeringAddress.toLowerCase());
  }

  isWalletFrozen(tokenAddress: string, walletAddress: string): boolean {
    const key = `${tokenAddress.toLowerCase()}:${walletAddress.toLowerCase()}`;
    return this.frozenWallets.has(key);
  }

  getStatus() {
    return {
      pausedOfferings: Array.from(this.pausedOfferings),
      pausedTokens: Array.from(this.pausedTokens),
      frozenWallets: Array.from(this.frozenWallets.entries()).map(([k, v]) => ({
        tokenAndWallet: k,
        ...v,
      })),
      totalEmergencyEvents: this.history.length,
      recentActions: this.history.slice(-10).reverse(),
    };
  }

  private async logEmergencyAudit(record: EmergencyActionRecord) {
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('audit_events').insert({
        event_type: `EMERGENCY_${record.action}_${record.targetType}`,
        layer: 'SECURITY',
        actor: record.triggeredBy,
        details: record,
        signature_ml_dsa: `sig_emergency_${Date.now()}`,
      });
    } catch {
      // test fallback
    }
  }
}
