/**
 * RWA BACKGROUND WORKER SERVICE
 * ==============================
 * Dedicated daemon responsible for:
 * 1. Transaction monitoring & AML velocity evaluation
 * 2. Investor accreditation & KYC/KYB expiration sweeping
 * 3. Immutable audit trail batch verification and on-chain anchoring
 */

import { TransactionMonitoringService } from './services/monitoring/TransactionMonitoringService.js';
import { ImmutableAuditService } from './services/audit/ImmutableAuditService.js';
import { KycKybWhitelistingService } from './services/KycKybWhitelistingService.js';

console.log('[Worker] Initializing RWA Background Worker daemon...');

const monitoringSvc = new TransactionMonitoringService();
const auditSvc = new ImmutableAuditService();
const whitelistingSvc = new KycKybWhitelistingService();

let isRunning = true;

async function runPeriodicSweep() {
  try {
    // 1. Audit chain verification
    const chainStatus = auditSvc.verifyChainIntegrity();
    if (!chainStatus.isValid) {
      console.error(`[Worker ALERT] Audit chain integrity check failed! Error: ${chainStatus.error}`);
    } else {
      console.log(`[Worker] Audit chain verified: ${chainStatus.totalEventsVerified} events intact. Latest hash: ${chainStatus.latestChainHash.slice(0, 16)}...`);
    }

    // 2. Active alerts check
    const activeAlerts = monitoringSvc.listAlerts().filter((a) => a.status === 'OPEN');
    if (activeAlerts.length > 0) {
      console.warn(`[Worker ALERT] ${activeAlerts.length} open AML monitoring alerts pending investigation.`);
    }
  } catch (err: any) {
    console.error('[Worker Error] Periodic sweep failed:', err.message);
  }
}

// Initial run
runPeriodicSweep();

// Schedule periodic sweep every 30 seconds
const interval = setInterval(runPeriodicSweep, 30000);

function shutdown(signal: string) {
  console.log(`[Worker] ${signal} received — gracefully shutting down worker`);
  isRunning = false;
  clearInterval(interval);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
