/**
 * LAYER 4: TOKENIZATION DATABASE SERVICE
 * ======================================
 * What it stores: Token ID, property ID, SPV, issuance tranches, cap table, token supply.
 * Technology: PostgreSQL
 * Features: Cap table tracking, ownership percentage calculation, issuance tranches,
 * locked vs circulating supply.
 */

import { getSupabaseAdmin } from '../../supabase.js';
import type {
  CapTableEntry,
  CapTableSummary,
  TokenIssuanceTranche,
  IssuanceStatus,
} from '../../../../src/lib/types/databaseLayers.js';

export interface SecurityTokenMeta {
  id: string;
  assetId: string;
  spvId?: string | null;
  symbol: string;
  name: string;
  totalSupply: string;
  decimals: number;
  contractAddress: string;
  trexIdentityRegistry?: string | null;
  complianceModules: string[];
  creator: string;
  createdAt: string;
}

export class TokenizationDatabaseService {
  private memoryTokens: Map<string, SecurityTokenMeta> = new Map();
  private memoryIssuances: Map<string, TokenIssuanceTranche> = new Map();
  private memoryCapTables: Map<string, Map<string, CapTableEntry>> = new Map(); // tokenId -> (wallet -> CapTableEntry)

  constructor() {
    this.seedDefaultToken();
  }

  private seedDefaultToken() {
    const tokenId = 'token-kensington-rwat-001';
    const token: SecurityTokenMeta = {
      id: tokenId,
      assetId: 'prop-kensington-001',
      spvId: 'spv-kensington-prime-001',
      symbol: 'RWAT',
      name: 'Kensington High Street Token',
      totalSupply: '30000',
      decimals: 0,
      contractAddress: '0x1234567890123456789012345678901234567890',
      trexIdentityRegistry: '0x9876543210987654321098765432109876543210',
      complianceModules: ['0xComplianceModuleMaxBalance'],
      creator: '0x0000000000000000000000000000000000000001',
      createdAt: new Date().toISOString(),
    };
    this.memoryTokens.set(token.id, token);
    this.memoryTokens.set(token.symbol.toUpperCase(), token);

    // Seed default issuance tranche
    const tranche: TokenIssuanceTranche = {
      id: 'tranche-primary-001',
      tokenId: token.id,
      spvId: token.spvId,
      trancheName: 'Series A Primary Offering',
      targetRaiseUsd: 3000000,
      minimumRaiseUsd: 1500000,
      tokenPriceUsd: 100,
      tokensOffered: '30000',
      tokensIssued: '10000',
      issuanceStatus: 'ACTIVE',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 60 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memoryIssuances.set(tranche.id, tranche);

    // Seed default cap table entries
    const tokenCapTable = new Map<string, CapTableEntry>();
    const spvWallet = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'; // SPV Treasury / Issuer
    const investor1 = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
    const investor2 = '0x90f79bf6eb2c4f870365e785982e1f101e93b906';

    const now = new Date().toISOString();
    tokenCapTable.set(spvWallet, {
      id: `cap-${token.id}-${spvWallet}`,
      tokenId: token.id,
      investorWallet: spvWallet,
      tokenBalance: '20000',
      lockedBalance: '5000',
      ownershipPercentage: 66.66667,
      votingWeight: 66.66667,
      claimEntitlementShare: 66.66667,
      isWhitelisted: true,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    });
    tokenCapTable.set(investor1, {
      id: `cap-${token.id}-${investor1}`,
      tokenId: token.id,
      investorWallet: investor1,
      tokenBalance: '7000',
      lockedBalance: '0',
      ownershipPercentage: 23.33333,
      votingWeight: 23.33333,
      claimEntitlementShare: 23.33333,
      isWhitelisted: true,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    });
    tokenCapTable.set(investor2, {
      id: `cap-${token.id}-${investor2}`,
      tokenId: token.id,
      investorWallet: investor2,
      tokenBalance: '3000',
      lockedBalance: '0',
      ownershipPercentage: 10.0,
      votingWeight: 10.0,
      claimEntitlementShare: 10.0,
      isWhitelisted: true,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    });

    this.memoryCapTables.set(token.id, tokenCapTable);
  }

  /** Register or update a security token */
  async registerToken(input: {
    id?: string;
    assetId: string;
    spvId?: string;
    symbol: string;
    name: string;
    totalSupply: string;
    decimals?: number;
    contractAddress: string;
    trexIdentityRegistry?: string;
    complianceModules?: string[];
    creator: string;
  }): Promise<SecurityTokenMeta> {
    const tokenId = input.id ?? `token-${Date.now()}-${input.symbol.toLowerCase()}`;
    const token: SecurityTokenMeta = {
      id: tokenId,
      assetId: input.assetId,
      spvId: input.spvId ?? null,
      symbol: input.symbol.toUpperCase(),
      name: input.name,
      totalSupply: input.totalSupply,
      decimals: input.decimals ?? 0,
      contractAddress: input.contractAddress,
      trexIdentityRegistry: input.trexIdentityRegistry ?? null,
      complianceModules: input.complianceModules ?? [],
      creator: input.creator,
      createdAt: new Date().toISOString(),
    };

    this.memoryTokens.set(token.id, token);
    this.memoryTokens.set(token.symbol, token);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('security_tokens').upsert({
        id: token.id,
        asset_id: token.assetId,
        spv_id: token.spvId,
        symbol: token.symbol,
        token_name: token.name,
        total_supply: token.totalSupply,
        decimals: token.decimals,
        contract_address: token.contractAddress,
        trex_identity_registry: token.trexIdentityRegistry,
        compliance_modules: token.complianceModules,
        creator: token.creator,
      });
    } catch {
      // Offline fallback
    }

    return token;
  }

  /** Retrieve token by ID or Symbol */
  async getToken(tokenIdOrSymbol: string): Promise<SecurityTokenMeta | null> {
    const key = tokenIdOrSymbol.toUpperCase();
    if (this.memoryTokens.has(key)) return this.memoryTokens.get(key)!;
    if (this.memoryTokens.has(tokenIdOrSymbol)) return this.memoryTokens.get(tokenIdOrSymbol)!;

    try {
      const supabase = getSupabaseAdmin();
      const query = supabase.from('security_tokens').select('*');
      const { data } = tokenIdOrSymbol.startsWith('0x')
        ? await query.eq('contract_address', tokenIdOrSymbol).single()
        : await query.or(`id.eq.${tokenIdOrSymbol},symbol.eq.${tokenIdOrSymbol.toUpperCase()}`).single();

      if (data) {
        const token: SecurityTokenMeta = {
          id: data.id,
          assetId: data.asset_id,
          spvId: data.spv_id,
          symbol: data.symbol,
          name: data.token_name ?? `${data.symbol} Token`,
          totalSupply: data.total_supply,
          decimals: data.decimals ?? 0,
          contractAddress: data.contract_address,
          trexIdentityRegistry: data.trex_identity_registry,
          complianceModules: data.compliance_modules ?? [],
          creator: data.creator,
          createdAt: data.created_at,
        };
        this.memoryTokens.set(token.id, token);
        this.memoryTokens.set(token.symbol, token);
        return token;
      }
    } catch {
      // Offline fallback
    }

    return null;
  }

  /** Create an issuance tranche */
  async createIssuanceTranche(input: {
    tokenId: string;
    spvId?: string;
    trancheName: string;
    targetRaiseUsd: number;
    minimumRaiseUsd: number;
    tokenPriceUsd: number;
    tokensOffered: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TokenIssuanceTranche> {
    const trancheId = `tranche-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const tranche: TokenIssuanceTranche = {
      id: trancheId,
      tokenId: input.tokenId,
      spvId: input.spvId ?? null,
      trancheName: input.trancheName,
      targetRaiseUsd: input.targetRaiseUsd,
      minimumRaiseUsd: input.minimumRaiseUsd,
      tokenPriceUsd: input.tokenPriceUsd,
      tokensOffered: input.tokensOffered,
      tokensIssued: '0',
      issuanceStatus: 'ACTIVE',
      startDate: input.startDate ?? now,
      endDate: input.endDate ?? new Date(Date.now() + 30 * 86400000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    this.memoryIssuances.set(tranche.id, tranche);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('token_issuances').upsert({
        id: tranche.id,
        token_id: tranche.tokenId,
        spv_id: tranche.spvId,
        tranche_name: tranche.trancheName,
        target_raise_usd: tranche.targetRaiseUsd,
        minimum_raise_usd: tranche.minimumRaiseUsd,
        token_price_usd: tranche.tokenPriceUsd,
        tokens_offered: tranche.tokensOffered,
        tokens_issued: tranche.tokensIssued,
        issuance_status: tranche.issuanceStatus,
        start_date: tranche.startDate,
        end_date: tranche.endDate,
      });
    } catch {
      // Offline fallback
    }

    return tranche;
  }

  /** List issuance tranches for a token */
  async listIssuances(tokenId: string): Promise<TokenIssuanceTranche[]> {
    return Array.from(this.memoryIssuances.values()).filter((i) => i.tokenId === tokenId);
  }

  /**
   * Update or record an investor's cap table allocation, recalculating ownership percentages.
   */
  async updateCapTableAllocation(input: {
    tokenId: string;
    investorWallet: string;
    balanceChange?: bigint;
    absoluteBalance?: bigint;
    lockedBalance?: bigint;
    lockupUntil?: string;
    isWhitelisted?: boolean;
  }): Promise<CapTableSummary> {
    const token = await this.getToken(input.tokenId);
    if (!token) {
      throw new Error(`Token ${input.tokenId} not found in tokenization database`);
    }

    let tokenTable = this.memoryCapTables.get(token.id);
    if (!tokenTable) {
      tokenTable = new Map<string, CapTableEntry>();
      this.memoryCapTables.set(token.id, tokenTable);
    }

    const wallet = input.investorWallet.toLowerCase();
    const existing = tokenTable.get(wallet);
    const now = new Date().toISOString();

    let newBalance = 0n;
    if (input.absoluteBalance !== undefined) {
      newBalance = input.absoluteBalance;
    } else if (input.balanceChange !== undefined) {
      const cur = existing ? BigInt(existing.tokenBalance) : 0n;
      newBalance = cur + input.balanceChange;
      if (newBalance < 0n) newBalance = 0n;
    } else if (existing) {
      newBalance = BigInt(existing.tokenBalance);
    }

    const locked = input.lockedBalance !== undefined ? input.lockedBalance : existing ? BigInt(existing.lockedBalance) : 0n;

    const entry: CapTableEntry = {
      id: existing?.id ?? `cap-${token.id}-${wallet}`,
      tokenId: token.id,
      investorWallet: wallet,
      tokenBalance: newBalance.toString(),
      lockedBalance: locked.toString(),
      ownershipPercentage: 0, // Recalculated below
      votingWeight: 0,
      claimEntitlementShare: 0,
      isWhitelisted: input.isWhitelisted ?? existing?.isWhitelisted ?? true,
      lockupUntil: input.lockupUntil ?? existing?.lockupUntil ?? null,
      lastActivityAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (newBalance === 0n && locked === 0n) {
      tokenTable.delete(wallet);
    } else {
      tokenTable.set(wallet, entry);
    }

    // Recalculate ownership percentages across all entries
    return this.getCapTableSummary(token.id);
  }

  /**
   * Generates real-time Cap Table Summary and ownership breakdown.
   */
  async getCapTableSummary(tokenIdOrSymbol: string): Promise<CapTableSummary> {
    const token = await this.getToken(tokenIdOrSymbol);
    if (!token) {
      throw new Error(`Token ${tokenIdOrSymbol} not found`);
    }

    const tokenTable = this.memoryCapTables.get(token.id) ?? new Map<string, CapTableEntry>();
    const totalSupplyBn = BigInt(token.totalSupply || '1');

    let totalAllocated = 0n;
    let totalLocked = 0n;

    for (const entry of tokenTable.values()) {
      totalAllocated += BigInt(entry.tokenBalance);
      totalLocked += BigInt(entry.lockedBalance);
    }

    const divisor = totalAllocated > 0n ? totalAllocated : totalSupplyBn;
    const entries: CapTableEntry[] = [];

    let spvOwnership = 0;
    let retailOwnership = 0;
    let institutionalOwnership = 0;

    for (const entry of tokenTable.values()) {
      const bal = BigInt(entry.tokenBalance);
      const pct = Number((bal * 10000000n) / divisor) / 100000;
      entry.ownershipPercentage = pct;
      entry.votingWeight = pct;
      entry.claimEntitlementShare = pct;
      entries.push(entry);

      if (pct > 25) {
        spvOwnership += pct;
      } else if (pct > 5) {
        institutionalOwnership += pct;
      } else {
        retailOwnership += pct;
      }
    }

    entries.sort((a, b) => Number(BigInt(b.tokenBalance) - BigInt(a.tokenBalance)));

    return {
      tokenId: token.id,
      tokenSymbol: token.symbol,
      totalSupply: token.totalSupply,
      circulatingSupply: (totalAllocated - totalLocked).toString(),
      lockedSupply: totalLocked.toString(),
      totalHolders: entries.length,
      spvOwnershipPercentage: Number(spvOwnership.toFixed(5)),
      retailOwnershipPercentage: Number(retailOwnership.toFixed(5)),
      institutionalOwnershipPercentage: Number(institutionalOwnership.toFixed(5)),
      entries,
      generatedAt: new Date().toISOString(),
    };
  }
}
