/**
 * RWA BLOCKCHAIN INDEXER SERVICE
 * ==============================
 * Dedicated daemon responsible for:
 * 1. Listening to configured blockchain RPC (Sepolia / Mainnet / Local Hardhat)
 * 2. Ingesting ERC-3643 / ERC-20 transfer, mint, burn, and compliance events
 * 3. Maintaining idempotent event ledger and wallet balance snapshots
 */

import { BlockchainIndexerService } from './services/database/BlockchainIndexerService.js';
import { config } from './config.js';

console.log('[Indexer] Initializing RWA Blockchain Event Indexer daemon...');
console.log(`[Indexer] Network Profile: ${config.rwaNetworkProfile}, RPC: ${config.sepoliaRpcUrl ? 'Configured' : 'Using Fallback'}`);

const indexerSvc = new BlockchainIndexerService();
let isRunning = true;

async function pollEvents() {
  if (!isRunning) return;
  try {
    const transfers = await indexerSvc.getTransferHistory({ limit: 10 });
    console.log(`[Indexer] Synced. Active transfer ledger size: ${transfers.length} events.`);
  } catch (err: any) {
    console.error('[Indexer Error] Event poll failed:', err.message);
  }
}

// Initial poll
pollEvents();

// Poll periodically
const interval = setInterval(pollEvents, 15000);

function shutdown(signal: string) {
  console.log(`[Indexer] ${signal} received — gracefully shutting down indexer`);
  isRunning = false;
  clearInterval(interval);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
