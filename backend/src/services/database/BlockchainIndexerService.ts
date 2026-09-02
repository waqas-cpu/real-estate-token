/**
 * LAYER 5: BLOCKCHAIN INDEXER DATABASE SERVICE
 * ============================================
 * What it stores: Wallet balances, token transfers, smart contract events.
 * Suitable technology: The Graph indexer (+ PostgreSQL high-performance sync cache)
 */

import { getSupabaseAdmin } from '../../supabase.js';
import type {
  IndexedTransfer,
  IndexedContractEvent,
  WalletBalanceSnapshot,
} from '../../../../src/lib/types/databaseLayers.js';

export class BlockchainIndexerService {
  private memoryTransfers: IndexedTransfer[] = [];
  private memoryEvents: IndexedContractEvent[] = [];
  private memoryBalances: Map<string, WalletBalanceSnapshot> = new Map(); // `${tokenAddress}-${walletAddress}` -> Snapshot

  constructor() {
    this.seedDefaultIndexedData();
  }

  private seedDefaultIndexedData() {
    const tokenAddr = '0x1234567890123456789012345678901234567890'.toLowerCase();
    const deployer = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'.toLowerCase();
    const investor1 = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'.toLowerCase();
    const offeringContract = '0x5555555555555555555555555555555555555555'.toLowerCase();

    const now = new Date().toISOString();

    // Seed initial mint transfer
    this.recordTransfer({
      chainId: 11155111,
      tokenAddress: tokenAddr,
      fromAddress: '0x0000000000000000000000000000000000000000',
      toAddress: offeringContract,
      amount: '30000',
      transactionHash: '0xabc1230000000000000000000000000000000000000000000000000000000001',
      blockNumber: 6200100,
      blockTimestamp: now,
    });

    // Seed offering subscription transfer
    this.recordTransfer({
      chainId: 11155111,
      tokenAddress: tokenAddr,
      fromAddress: offeringContract,
      toAddress: investor1,
      amount: '7000',
      transactionHash: '0xabc123000000000000000000000000000000000000000000000000000000002',
      blockNumber: 6200250,
      blockTimestamp: now,
    });

    // Seed balances
    this.updateWalletBalance(tokenAddr, investor1, '7000', '0', 6200250);
    this.updateWalletBalance(tokenAddr, deployer, '20000', '5000', 6200250);
    this.updateWalletBalance(tokenAddr, offeringContract, '3000', '0', 6200250);

    // Seed compliance events
    this.recordContractEvent({
      chainId: 11155111,
      contractAddress: tokenAddr,
      eventName: 'ComplianceAdded',
      blockNumber: 6200050,
      transactionHash: '0xevt0000000000000000000000000000000000000000000000000000000000001',
      logIndex: 1,
      parameters: {
        complianceModule: '0xComplianceModuleMaxBalance',
        maxTokens: 3000,
      },
      blockTimestamp: now,
    });
  }

  /**
   * Record a token transfer event.
   */
  async recordTransfer(
    input: Omit<IndexedTransfer, 'id' | 'createdAt' | 'blockTimestamp'> & { blockTimestamp?: string }
  ): Promise<IndexedTransfer> {
    const transfer: IndexedTransfer = {
      id: `xfer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      chainId: input.chainId ?? 11155111,
      tokenAddress: input.tokenAddress.toLowerCase(),
      fromAddress: input.fromAddress.toLowerCase(),
      toAddress: input.toAddress.toLowerCase(),
      amount: input.amount,
      transactionHash: input.transactionHash,
      blockNumber: input.blockNumber,
      blockTimestamp: input.blockTimestamp ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.memoryTransfers.unshift(transfer);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('token_transfers').insert({
        id: transfer.id,
        chain_id: transfer.chainId,
        token_address: transfer.tokenAddress,
        from_address: transfer.fromAddress,
        to_address: transfer.toAddress,
        amount: transfer.amount,
        transaction_hash: transfer.transactionHash,
        block_number: transfer.blockNumber,
        block_timestamp: transfer.blockTimestamp,
      });
    } catch {
      // Offline fallback
    }

    return transfer;
  }

  /**
   * Record a smart contract event (e.g. ComplianceAdded, TokenLocked, KYCRegistered).
   */
  async recordContractEvent(
    input: Omit<IndexedContractEvent, 'id' | 'createdAt' | 'blockTimestamp'> & { blockTimestamp?: string }
  ): Promise<IndexedContractEvent> {
    const event: IndexedContractEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      chainId: input.chainId ?? 11155111,
      contractAddress: input.contractAddress.toLowerCase(),
      eventName: input.eventName,
      blockNumber: input.blockNumber,
      transactionHash: input.transactionHash,
      logIndex: input.logIndex ?? 0,
      parameters: input.parameters ?? {},
      blockTimestamp: input.blockTimestamp ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.memoryEvents.unshift(event);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('blockchain_indexed_events').insert({
        id: event.id,
        chain_id: event.chainId,
        contract_address: event.contractAddress,
        event_name: event.eventName,
        block_number: event.blockNumber,
        transaction_hash: event.transactionHash,
        log_index: event.logIndex,
        parameters: event.parameters,
        block_timestamp: event.blockTimestamp,
      });
    } catch {
      // Offline fallback
    }

    return event;
  }

  /**
   * Update or index a wallet balance snapshot.
   */
  async updateWalletBalance(
    tokenAddress: string,
    walletAddress: string,
    balance: string,
    lockedBalance: string = '0',
    blockNumber: number = 0
  ): Promise<WalletBalanceSnapshot> {
    const key = `${tokenAddress.toLowerCase()}-${walletAddress.toLowerCase()}`;
    const now = new Date().toISOString();

    const snapshot: WalletBalanceSnapshot = {
      id: `bal-${key}`,
      tokenAddress: tokenAddress.toLowerCase(),
      walletAddress: walletAddress.toLowerCase(),
      balance,
      lockedBalance,
      blockNumber,
      snapshotTimestamp: now,
      createdAt: now,
    };

    this.memoryBalances.set(key, snapshot);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('wallet_balance_snapshots').upsert({
        token_address: snapshot.tokenAddress,
        wallet_address: snapshot.walletAddress,
        balance: snapshot.balance,
        locked_balance: snapshot.lockedBalance,
        block_number: snapshot.blockNumber,
        snapshot_timestamp: snapshot.snapshotTimestamp,
      });
    } catch {
      // Offline fallback
    }

    return snapshot;
  }

  /**
   * Get an indexed wallet balance.
   */
  async getWalletBalance(tokenAddress: string, walletAddress: string): Promise<WalletBalanceSnapshot | null> {
    const key = `${tokenAddress.toLowerCase()}-${walletAddress.toLowerCase()}`;
    if (this.memoryBalances.has(key)) {
      return this.memoryBalances.get(key)!;
    }

    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('wallet_balance_snapshots')
        .select('*')
        .eq('token_address', tokenAddress.toLowerCase())
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      if (data) {
        const snapshot: WalletBalanceSnapshot = {
          id: data.id,
          tokenAddress: data.token_address,
          walletAddress: data.wallet_address,
          balance: data.balance,
          lockedBalance: data.locked_balance,
          blockNumber: Number(data.block_number),
          snapshotTimestamp: data.snapshot_timestamp,
          createdAt: data.created_at,
        };
        this.memoryBalances.set(key, snapshot);
        return snapshot;
      }
    } catch {
      // Offline fallback
    }

    return null;
  }

  /**
   * Query transfer history with flexible filters.
   */
  async getTransferHistory(filter: {
    tokenAddress?: string;
    walletAddress?: string;
    fromAddress?: string;
    toAddress?: string;
    limit?: number;
    offset?: number;
  }): Promise<IndexedTransfer[]> {
    let transfers = [...this.memoryTransfers];

    if (filter.tokenAddress) {
      transfers = transfers.filter((t) => t.tokenAddress === filter.tokenAddress!.toLowerCase());
    }
    if (filter.walletAddress) {
      const w = filter.walletAddress.toLowerCase();
      transfers = transfers.filter((t) => t.fromAddress === w || t.toAddress === w);
    }
    if (filter.fromAddress) {
      transfers = transfers.filter((t) => t.fromAddress === filter.fromAddress!.toLowerCase());
    }
    if (filter.toAddress) {
      transfers = transfers.filter((t) => t.toAddress === filter.toAddress!.toLowerCase());
    }

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 50;
    return transfers.slice(offset, offset + limit);
  }

  /**
   * Query contract events stream.
   */
  async getContractEvents(filter: {
    contractAddress?: string;
    eventName?: string;
    fromBlock?: number;
    limit?: number;
  }): Promise<IndexedContractEvent[]> {
    let events = [...this.memoryEvents];

    if (filter.contractAddress) {
      events = events.filter((e) => e.contractAddress === filter.contractAddress!.toLowerCase());
    }
    if (filter.eventName) {
      events = events.filter((e) => e.eventName.toLowerCase() === filter.eventName!.toLowerCase());
    }
    if (filter.fromBlock !== undefined) {
      events = events.filter((e) => e.blockNumber >= filter.fromBlock!);
    }

    const limit = filter.limit ?? 50;
    return events.slice(0, limit);
  }

  /**
   * Emulates The Graph subgraph GraphQL execution interface.
   */
  async executeSubgraphGraphQL(query: string, _variables?: Record<string, unknown>) {
    // In live production, fetch from process.env.THE_GRAPH_ENDPOINT
    // Here we provide the standard GraphQL query resolution against our indexed store
    const normalized = query.toLowerCase();

    if (normalized.includes('transfers')) {
      return {
        data: {
          tokenTransfers: this.memoryTransfers.slice(0, 20).map((t) => ({
            id: t.id,
            from: { id: t.fromAddress },
            to: { id: t.toAddress },
            value: t.amount,
            blockNumber: t.blockNumber,
            transactionHash: t.transactionHash,
          })),
        },
      };
    }

    if (normalized.includes('accounts') || normalized.includes('holders')) {
      return {
        data: {
          accountBalances: Array.from(this.memoryBalances.values()).map((b) => ({
            id: `${b.tokenAddress}-${b.walletAddress}`,
            account: { id: b.walletAddress },
            balance: b.balance,
            lockedBalance: b.lockedBalance,
          })),
        },
      };
    }

    return {
      data: {
        tokens: [
          {
            id: '0x1234567890123456789012345678901234567890',
            symbol: 'RWAT',
            name: 'Kensington High Street Token',
            totalSupply: '30000',
            transfersCount: this.memoryTransfers.length,
            holdersCount: this.memoryBalances.size,
          },
        ],
      },
    };
  }
}
