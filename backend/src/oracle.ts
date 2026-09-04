/**
 * RWA ORACLE & DATA INGESTION SERVICE
 * ===================================
 * Dedicated daemon responsible for:
 * 1. Gathering physical asset appraisals and multi-source oracle data
 * 2. Validating cryptographic signatures (ECDSA & PQC ML-DSA-87)
 * 3. Enforcing heartbeat freshness and 10% maximum price deviation circuit breakers
 */

import { OracleIntegrityService } from './services/OracleIntegrityService.js';

console.log('[Oracle] Initializing RWA Oracle & Data Ingestion daemon...');

const oracleSvc = new OracleIntegrityService();
let isRunning = true;

async function runOracleHeartbeat() {
  if (!isRunning) return;
  try {
    const defaultAsset = 'prop-kensington-001';
    const activePrice = oracleSvc.getActivePrice(defaultAsset);
    console.log(`[Oracle] Heartbeat OK. Active benchmark price for ${defaultAsset}: $${activePrice.toLocaleString()} USD`);
  } catch (err: any) {
    console.error('[Oracle Error] Heartbeat validation failed:', err.message);
  }
}

// Initial run
runOracleHeartbeat();

// Run every 20 seconds
const interval = setInterval(runOracleHeartbeat, 20000);

function shutdown(signal: string) {
  console.log(`[Oracle] ${signal} received — gracefully shutting down oracle service`);
  isRunning = false;
  clearInterval(interval);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
