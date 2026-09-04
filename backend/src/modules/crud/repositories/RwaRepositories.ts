/**
 * Repository Layer for RWA CRUD Platform
 * Provides clean data access abstractions, soft-delete filtering, pagination, and sorting.
 */
import {
  PropertyEntity,
  PropertyDocumentEntity,
  SpvEntity,
  TokenEntity,
  TokenAllocationEntity,
  InvestorEntity,
  KycVerificationEntity,
  WalletEntity,
  TransactionEntity,
  PaginationParams,
  PaginatedResult,
} from '../domain/types.js';

export class PropertyRepository {
  private static store: Map<string, PropertyEntity> = new Map();

  public async create(entity: PropertyEntity): Promise<PropertyEntity> {
    PropertyRepository.store.set(entity.property_id, { ...entity });
    return { ...entity };
  }

  public async findById(id: string, includeDeleted = false): Promise<PropertyEntity | null> {
    const item = PropertyRepository.store.get(id);
    if (!item) return null;
    if (!includeDeleted && item.is_deleted) return null;
    return { ...item };
  }

  public async update(id: string, updates: Partial<PropertyEntity>): Promise<PropertyEntity | null> {
    const existing = await this.findById(id, true);
    if (!existing) return null;

    const updated: PropertyEntity = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    };
    PropertyRepository.store.set(id, updated);
    return { ...updated };
  }

  public async softDelete(id: string): Promise<boolean> {
    const item = await this.findById(id);
    if (!item) return false;
    item.is_deleted = true;
    item.deleted_at = new Date().toISOString();
    PropertyRepository.store.set(id, item);
    return true;
  }

  public async list(
    params: PaginationParams,
    filters?: { status?: string; country?: string; spv_id?: string }
  ): Promise<PaginatedResult<PropertyEntity>> {
    let items = Array.from(PropertyRepository.store.values()).filter((p) => !p.is_deleted);

    if (filters?.status) items = items.filter((p) => p.property_status === filters.status);
    if (filters?.country) items = items.filter((p) => p.country.toLowerCase() === filters.country!.toLowerCase());
    if (filters?.spv_id) items = items.filter((p) => p.spv_id === filters.spv_id);

    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (p) => p.property_name.toLowerCase().includes(q) || p.property_address.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return {
      data: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export class PropertyDocumentRepository {
  private static store: Map<string, PropertyDocumentEntity> = new Map();

  public async create(entity: PropertyDocumentEntity): Promise<PropertyDocumentEntity> {
    PropertyDocumentRepository.store.set(entity.document_id, { ...entity });
    return { ...entity };
  }

  public async findById(id: string): Promise<PropertyDocumentEntity | null> {
    const doc = PropertyDocumentRepository.store.get(id);
    return doc ? { ...doc } : null;
  }

  public async listByPropertyId(propertyId: string): Promise<PropertyDocumentEntity[]> {
    return Array.from(PropertyDocumentRepository.store.values())
      .filter((d) => d.property_id === propertyId)
      .map((d) => ({ ...d }));
  }

  public async updateVerification(
    id: string,
    status: any,
    verifiedBy: string
  ): Promise<PropertyDocumentEntity | null> {
    const doc = await this.findById(id);
    if (!doc) return null;
    doc.verification_status = status;
    doc.verified_by = verifiedBy;
    doc.verified_at = new Date().toISOString();
    PropertyDocumentRepository.store.set(id, doc);
    return { ...doc };
  }
}

export class SpvRepository {
  private static store: Map<string, SpvEntity> = new Map();

  public async create(entity: SpvEntity): Promise<SpvEntity> {
    SpvRepository.store.set(entity.spv_id, { ...entity });
    return { ...entity };
  }

  public async findById(id: string): Promise<SpvEntity | null> {
    const spv = SpvRepository.store.get(id);
    if (!spv || spv.is_deleted) return null;
    return { ...spv };
  }

  public async findByRegNumber(regNo: string): Promise<SpvEntity | null> {
    const spv = Array.from(SpvRepository.store.values()).find(
      (s) => s.registration_number === regNo && !s.is_deleted
    );
    return spv ? { ...spv } : null;
  }

  public async update(id: string, updates: Partial<SpvEntity>): Promise<SpvEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    SpvRepository.store.set(id, updated);
    return { ...updated };
  }
}

export class TokenRepository {
  private static store: Map<string, TokenEntity> = new Map();

  public async create(entity: TokenEntity): Promise<TokenEntity> {
    TokenRepository.store.set(entity.token_id, { ...entity });
    return { ...entity };
  }

  public async findById(id: string): Promise<TokenEntity | null> {
    const token = TokenRepository.store.get(id);
    return token ? { ...token } : null;
  }

  public async findByContractAddress(address: string, networkId: string): Promise<TokenEntity | null> {
    const token = Array.from(TokenRepository.store.values()).find(
      (t) => t.contract_address?.toLowerCase() === address.toLowerCase() && t.network_id === networkId
    );
    return token ? { ...token } : null;
  }

  public async findByPropertyId(propertyId: string): Promise<TokenEntity | null> {
    const token = Array.from(TokenRepository.store.values()).find((t) => t.property_id === propertyId);
    return token ? { ...token } : null;
  }

  public async update(id: string, updates: Partial<TokenEntity>): Promise<TokenEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    TokenRepository.store.set(id, updated);
    return { ...updated };
  }

  public async list(params: PaginationParams): Promise<PaginatedResult<TokenEntity>> {
    const all = Array.from(TokenRepository.store.values());
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const start = (page - 1) * limit;

    return {
      data: all.slice(start, start + limit),
      pagination: {
        page,
        limit,
        total: all.length,
        totalPages: Math.ceil(all.length / limit),
      },
    };
  }
}

export class InvestorRepository {
  private static store: Map<string, InvestorEntity> = new Map();

  public async create(entity: InvestorEntity): Promise<InvestorEntity> {
    InvestorRepository.store.set(entity.investor_id, { ...entity });
    return { ...entity };
  }

  public async findById(id: string): Promise<InvestorEntity | null> {
    const inv = InvestorRepository.store.get(id);
    if (!inv || inv.is_deleted) return null;
    return { ...inv };
  }

  public async findByEmail(email: string): Promise<InvestorEntity | null> {
    const inv = Array.from(InvestorRepository.store.values()).find(
      (i) => i.email.toLowerCase() === email.toLowerCase() && !i.is_deleted
    );
    return inv ? { ...inv } : null;
  }

  public async update(id: string, updates: Partial<InvestorEntity>): Promise<InvestorEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    };
    InvestorRepository.store.set(id, updated);
    return { ...updated };
  }
}

export class KycRepository {
  private static store: Map<string, KycVerificationEntity> = new Map();

  public async create(entity: KycVerificationEntity): Promise<KycVerificationEntity> {
    KycRepository.store.set(entity.verification_id, { ...entity });
    return { ...entity };
  }

  public async findById(id: string): Promise<KycVerificationEntity | null> {
    const kyc = KycRepository.store.get(id);
    return kyc ? { ...kyc } : null;
  }

  public async findByInvestorId(investorId: string): Promise<KycVerificationEntity[]> {
    return Array.from(KycRepository.store.values())
      .filter((k) => k.investor_id === investorId)
      .map((k) => ({ ...k }));
  }

  public async update(id: string, updates: Partial<KycVerificationEntity>): Promise<KycVerificationEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    KycRepository.store.set(id, updated);
    return { ...updated };
  }
}

export class WalletRepository {
  private static store: Map<string, WalletEntity> = new Map();

  public async create(entity: WalletEntity): Promise<WalletEntity> {
    WalletRepository.store.set(entity.wallet_id, { ...entity });
    return { ...entity };
  }

  public async findById(id: string): Promise<WalletEntity | null> {
    const w = WalletRepository.store.get(id);
    return w ? { ...w } : null;
  }

  public async findByAddress(network: string, address: string): Promise<WalletEntity | null> {
    const w = Array.from(WalletRepository.store.values()).find(
      (item) => item.network === network && item.wallet_address.toLowerCase() === address.toLowerCase()
    );
    return w ? { ...w } : null;
  }

  public async listByInvestorId(investorId: string): Promise<WalletEntity[]> {
    return Array.from(WalletRepository.store.values())
      .filter((w) => w.investor_id === investorId)
      .map((w) => ({ ...w }));
  }

  public async update(id: string, updates: Partial<WalletEntity>): Promise<WalletEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    WalletRepository.store.set(id, updated);
    return { ...updated };
  }
}

export class AllocationRepository {
  private static store: Map<string, TokenAllocationEntity> = new Map();

  public async create(entity: TokenAllocationEntity): Promise<TokenAllocationEntity> {
    AllocationRepository.store.set(entity.allocation_id, { ...entity });
    return { ...entity };
  }

  public async findById(id: string): Promise<TokenAllocationEntity | null> {
    const a = AllocationRepository.store.get(id);
    return a ? { ...a } : null;
  }

  public async findByIdempotencyKey(key: string): Promise<TokenAllocationEntity | null> {
    const a = Array.from(AllocationRepository.store.values()).find((item) => item.idempotency_key === key);
    return a ? { ...a } : null;
  }

  public async sumAllocatedTokensForToken(tokenId: string): Promise<bigint> {
    let sum = 0n;
    for (const alloc of AllocationRepository.store.values()) {
      if (alloc.token_id === tokenId && alloc.allocation_status !== 'CANCELLED') {
        sum += BigInt(alloc.token_amount);
      }
    }
    return sum;
  }

  public async listByInvestorId(investorId: string): Promise<TokenAllocationEntity[]> {
    return Array.from(AllocationRepository.store.values())
      .filter((a) => a.investor_id === investorId)
      .map((a) => ({ ...a }));
  }
}

export class TransactionRepository {
  private static store: Map<string, TransactionEntity> = new Map();

  public async create(entity: TransactionEntity): Promise<TransactionEntity> {
    TransactionRepository.store.set(entity.transaction_id, { ...entity });
    return { ...entity };
  }

  public async findById(id: string): Promise<TransactionEntity | null> {
    const t = TransactionRepository.store.get(id);
    return t ? { ...t } : null;
  }

  public async findByTxHash(txHash: string): Promise<TransactionEntity | null> {
    const t = Array.from(TransactionRepository.store.values()).find(
      (item) => item.tx_hash.toLowerCase() === txHash.toLowerCase()
    );
    return t ? { ...t } : null;
  }

  public async update(id: string, updates: Partial<TransactionEntity>): Promise<TransactionEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    TransactionRepository.store.set(id, updated);
    return { ...updated };
  }
}
