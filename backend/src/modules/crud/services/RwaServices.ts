/**
 * Application & Domain Services for RWA Platform
 * Enforces business logic, state machines, financial integrity, idempotency, and audit trails.
 */
import { randomUUID } from 'node:crypto';
import {
  PropertyRepository,
  PropertyDocumentRepository,
  SpvRepository,
  TokenRepository,
  InvestorRepository,
  KycRepository,
  WalletRepository,
  AllocationRepository,
  TransactionRepository,
} from '../repositories/RwaRepositories.js';
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
import {
  PropertyStatus,
  TokenStatus,
  KycVerificationStatus,
  AllocationStatus,
  SettlementStatus,
  TransactionStatus,
  DocumentVerificationStatus,
  WalletVerificationStatus,
} from '../domain/enums.js';
import {
  PropertyStateMachine,
  TokenStateMachine,
  KycStateMachine,
  AllocationStateMachine,
} from '../domain/stateMachines.js';
import {
  EntityNotFoundError,
  DuplicateEntityError,
  ImmutableRecordError,
  SupplyExceededError,
  IneligibleInvestorError,
  ValidationError,
} from '../errors/DomainError.js';
import { AuditService } from '../audit/AuditService.js';
import { DomainEventBus } from '../events/DomainEventBus.js';
import { RwaBlockchainService } from '../blockchain/RwaBlockchainService.js';

export class PropertyService {
  constructor(
    private propertyRepo: PropertyRepository,
    private documentRepo: PropertyDocumentRepository,
    private spvRepo: SpvRepository,
    private eventBus: DomainEventBus,
    private auditService: typeof AuditService
  ) {}

  public async createProperty(
    payload: Omit<PropertyEntity, 'property_id' | 'version' | 'created_at' | 'updated_at' | 'property_status' | 'document_status'>,
    actorId: string,
    actorRole: string
  ): Promise<PropertyEntity> {
    if (payload.spv_id) {
      const spv = await this.spvRepo.findById(payload.spv_id);
      if (!spv) {
        throw new EntityNotFoundError('SPV', payload.spv_id);
      }
    }

    const property: PropertyEntity = {
      ...payload,
      property_id: randomUUID(),
      property_status: PropertyStatus.DRAFT,
      document_status: 'PENDING',
      version: 1,
      is_deleted: false,
      created_by: actorId,
      updated_by: actorId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await this.propertyRepo.create(property);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Property',
      entityId: created.property_id,
      action: 'PROPERTY_CREATED',
      newValue: created as unknown as Record<string, unknown>,
    });

    await this.eventBus.publish({
      eventId: randomUUID(),
      eventName: 'PropertyCreated',
      entityType: 'Property',
      entityId: created.property_id,
      occurredAt: created.created_at,
      correlationId: randomUUID(),
      actorId,
      payload: created,
    });

    return created;
  }

  public async getProperty(id: string): Promise<PropertyEntity> {
    const prop = await this.propertyRepo.findById(id);
    if (!prop) {
      throw new EntityNotFoundError('Property', id);
    }
    return prop;
  }

  public async listProperties(
    params: PaginationParams,
    filters?: { status?: string; country?: string; spv_id?: string }
  ): Promise<PaginatedResult<PropertyEntity>> {
    return this.propertyRepo.list(params, filters);
  }

  public async updateProperty(
    id: string,
    updates: Partial<PropertyEntity>,
    actorId: string,
    actorRole: string
  ): Promise<PropertyEntity> {
    const existing = await this.getProperty(id);

    // Lifecycle check if status is being updated
    if (updates.property_status && updates.property_status !== existing.property_status) {
      PropertyStateMachine.assertTransition(existing.property_status, updates.property_status);
    }

    // SPV relationship validation
    if (updates.spv_id && updates.spv_id !== existing.spv_id) {
      const spv = await this.spvRepo.findById(updates.spv_id);
      if (!spv) throw new EntityNotFoundError('SPV', updates.spv_id);
    }

    const updated = await this.propertyRepo.update(id, {
      ...updates,
      updated_by: actorId,
    });

    if (!updated) {
      throw new EntityNotFoundError('Property', id);
    }

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Property',
      entityId: id,
      action: 'PROPERTY_UPDATED',
      previousValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    if (updates.property_status && updates.property_status !== existing.property_status) {
      await this.eventBus.publish({
        eventId: randomUUID(),
        eventName: `PropertyStatusChanged_${updates.property_status}`,
        entityType: 'Property',
        entityId: id,
        occurredAt: new Date().toISOString(),
        correlationId: randomUUID(),
        actorId,
        payload: { previousStatus: existing.property_status, newStatus: updates.property_status },
      });
    }

    return updated;
  }

  public async archiveProperty(id: string, actorId: string, actorRole: string): Promise<void> {
    const existing = await this.getProperty(id);

    // Soft deletion: transitions status to CLOSED/ARCHIVED
    await this.propertyRepo.softDelete(id);
    await this.propertyRepo.update(id, { property_status: PropertyStatus.CLOSED, updated_by: actorId });

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Property',
      entityId: id,
      action: 'PROPERTY_ARCHIVED',
      previousValue: existing as unknown as Record<string, unknown>,
      newValue: { is_deleted: true, property_status: PropertyStatus.CLOSED },
    });

    await this.eventBus.publish({
      eventId: randomUUID(),
      eventName: 'PropertyArchived',
      entityType: 'Property',
      entityId: id,
      occurredAt: new Date().toISOString(),
      correlationId: randomUUID(),
      actorId,
      payload: { propertyId: id },
    });
  }

  public async uploadDocument(
    propertyId: string,
    doc: Omit<PropertyDocumentEntity, 'document_id' | 'property_id' | 'verification_status' | 'created_at'>,
    actorId: string,
    actorRole: string
  ): Promise<PropertyDocumentEntity> {
    await this.getProperty(propertyId); // Ensure property exists

    const newDoc: PropertyDocumentEntity = {
      ...doc,
      document_id: randomUUID(),
      property_id: propertyId,
      verification_status: DocumentVerificationStatus.PENDING,
      uploaded_by: actorId,
      created_at: new Date().toISOString(),
    };

    const created = await this.documentRepo.create(newDoc);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'PropertyDocument',
      entityId: created.document_id,
      action: 'DOCUMENT_UPLOADED',
      newValue: created as unknown as Record<string, unknown>,
    });

    return created;
  }

  public async listDocuments(propertyId: string): Promise<PropertyDocumentEntity[]> {
    await this.getProperty(propertyId);
    return this.documentRepo.listByPropertyId(propertyId);
  }
}

export class SpvService {
  constructor(
    private spvRepo: SpvRepository,
    private auditService: typeof AuditService,
    private eventBus: DomainEventBus
  ) {}

  public async createSpv(
    payload: Omit<SpvEntity, 'spv_id' | 'created_at' | 'updated_at'>,
    actorId: string,
    actorRole: string
  ): Promise<SpvEntity> {
    const existing = await this.spvRepo.findByRegNumber(payload.registration_number);
    if (existing) {
      throw new DuplicateEntityError('SPV', 'registration_number', payload.registration_number);
    }

    const spv: SpvEntity = {
      ...payload,
      spv_id: randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await this.spvRepo.create(spv);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'SPV',
      entityId: created.spv_id,
      action: 'SPV_CREATED',
      newValue: created as unknown as Record<string, unknown>,
    });

    await this.eventBus.publish({
      eventId: randomUUID(),
      eventName: 'SPVCreated',
      entityType: 'SPV',
      entityId: created.spv_id,
      occurredAt: created.created_at,
      correlationId: randomUUID(),
      actorId,
      payload: created,
    });

    return created;
  }

  public async getSpv(id: string): Promise<SpvEntity> {
    const spv = await this.spvRepo.findById(id);
    if (!spv) throw new EntityNotFoundError('SPV', id);
    return spv;
  }

  public async updateSpv(
    id: string,
    updates: Partial<SpvEntity>,
    actorId: string,
    actorRole: string
  ): Promise<SpvEntity> {
    const existing = await this.getSpv(id);
    const updated = await this.spvRepo.update(id, updates);
    if (!updated) throw new EntityNotFoundError('SPV', id);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'SPV',
      entityId: id,
      action: 'SPV_UPDATED',
      previousValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }
}

export class TokenService {
  constructor(
    private tokenRepo: TokenRepository,
    private propertyRepo: PropertyRepository,
    private spvRepo: SpvRepository,
    private blockchainService: RwaBlockchainService,
    private auditService: typeof AuditService,
    private eventBus: DomainEventBus
  ) {}

  public async createToken(
    payload: Omit<TokenEntity, 'token_id' | 'token_status' | 'created_at' | 'updated_at'>,
    actorId: string,
    actorRole: string
  ): Promise<TokenEntity> {
    const property = await this.propertyRepo.findById(payload.property_id);
    if (!property) throw new EntityNotFoundError('Property', payload.property_id);

    const spv = await this.spvRepo.findById(payload.spv_id);
    if (!spv) throw new EntityNotFoundError('SPV', payload.spv_id);

    const existingForProp = await this.tokenRepo.findByPropertyId(payload.property_id);
    if (existingForProp) {
      throw new DuplicateEntityError('Token', 'property_id', payload.property_id);
    }

    const token: TokenEntity = {
      ...payload,
      token_id: randomUUID(),
      token_status: TokenStatus.DRAFT,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await this.tokenRepo.create(token);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Token',
      entityId: created.token_id,
      action: 'TOKEN_CREATED',
      newValue: created as unknown as Record<string, unknown>,
    });

    await this.eventBus.publish({
      eventId: randomUUID(),
      eventName: 'TokenCreated',
      entityType: 'Token',
      entityId: created.token_id,
      occurredAt: created.created_at,
      correlationId: randomUUID(),
      actorId,
      payload: created,
    });

    return created;
  }

  public async getToken(id: string): Promise<TokenEntity> {
    const token = await this.tokenRepo.findById(id);
    if (!token) throw new EntityNotFoundError('Token', id);
    return token;
  }

  public async listTokens(params: PaginationParams): Promise<PaginatedResult<TokenEntity>> {
    return this.tokenRepo.list(params);
  }

  public async updateToken(
    id: string,
    updates: Partial<TokenEntity>,
    actorId: string,
    actorRole: string
  ): Promise<TokenEntity> {
    const existing = await this.getToken(id);

    // IMMUTABILITY GUARD: Once token is DEPLOYED or ACTIVE, core blockchain fields are locked
    const isDeployed = [
      TokenStatus.DEPLOYED,
      TokenStatus.ACTIVE,
      TokenStatus.PAUSED,
      TokenStatus.RETIRED,
    ].includes(existing.token_status);

    if (isDeployed) {
      if (updates.contract_address && updates.contract_address !== existing.contract_address) {
        throw new ImmutableRecordError('Token', 'contract_address cannot be modified once deployed.');
      }
      if (updates.blockchain && updates.blockchain !== existing.blockchain) {
        throw new ImmutableRecordError('Token', 'blockchain cannot be modified once deployed.');
      }
      if (updates.network_id && updates.network_id !== existing.network_id) {
        throw new ImmutableRecordError('Token', 'network_id cannot be modified once deployed.');
      }
      if (updates.total_supply && updates.total_supply !== existing.total_supply) {
        throw new ImmutableRecordError('Token', 'total_supply cannot be directly updated on deployed tokens.');
      }
    }

    if (updates.token_status && updates.token_status !== existing.token_status) {
      TokenStateMachine.assertTransition(existing.token_status, updates.token_status);
    }

    const updated = await this.tokenRepo.update(id, updates);
    if (!updated) throw new EntityNotFoundError('Token', id);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Token',
      entityId: id,
      action: 'TOKEN_UPDATED',
      previousValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Deploys the smart contract to blockchain via RwaBlockchainService
   */
  public async deployToken(id: string, actorId: string, actorRole: string): Promise<TokenEntity> {
    const token = await this.getToken(id);

    if (token.token_status !== TokenStatus.APPROVED && token.token_status !== TokenStatus.DEPLOYMENT_PENDING) {
      TokenStateMachine.assertTransition(token.token_status, TokenStatus.DEPLOYED);
    }

    const deployResult = await this.blockchainService.deployTokenContract({
      tokenName: token.token_name,
      tokenSymbol: token.token_symbol,
      decimals: token.token_decimals,
      initialSupply: token.total_supply,
      networkId: token.network_id,
    });

    const updated = await this.tokenRepo.update(id, {
      contract_address: deployResult.contractAddress,
      deployment_tx_hash: deployResult.txHash,
      deployed_at: deployResult.deployedAt,
      token_status: TokenStatus.DEPLOYED,
    });

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Token',
      entityId: id,
      action: 'TOKEN_DEPLOYED',
      newValue: updated as unknown as Record<string, unknown>,
    });

    await this.eventBus.publish({
      eventId: randomUUID(),
      eventName: 'TokenDeployed',
      entityType: 'Token',
      entityId: id,
      occurredAt: deployResult.deployedAt,
      correlationId: randomUUID(),
      actorId,
      payload: deployResult,
    });

    return updated!;
  }
}

export class InvestorService {
  constructor(
    private investorRepo: InvestorRepository,
    private walletRepo: WalletRepository,
    private kycRepo: KycRepository,
    private auditService: typeof AuditService,
    private eventBus: DomainEventBus
  ) {}

  public async createInvestor(
    payload: Omit<InvestorEntity, 'investor_id' | 'version' | 'created_at' | 'updated_at'>,
    actorId: string,
    actorRole: string
  ): Promise<InvestorEntity> {
    const existing = await this.investorRepo.findByEmail(payload.email);
    if (existing) {
      throw new DuplicateEntityError('Investor', 'email', payload.email);
    }

    const investor: InvestorEntity = {
      ...payload,
      investor_id: randomUUID(),
      version: 1,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await this.investorRepo.create(investor);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Investor',
      entityId: created.investor_id,
      action: 'INVESTOR_CREATED',
      newValue: created as unknown as Record<string, unknown>,
    });

    await this.eventBus.publish({
      eventId: randomUUID(),
      eventName: 'InvestorCreated',
      entityType: 'Investor',
      entityId: created.investor_id,
      occurredAt: created.created_at,
      correlationId: randomUUID(),
      actorId,
      payload: created,
    });

    return created;
  }

  public async getInvestor(id: string): Promise<InvestorEntity> {
    const inv = await this.investorRepo.findById(id);
    if (!inv) throw new EntityNotFoundError('Investor', id);
    return inv;
  }

  public async updateInvestor(
    id: string,
    updates: Partial<InvestorEntity>,
    actorId: string,
    actorRole: string
  ): Promise<InvestorEntity> {
    const existing = await this.getInvestor(id);
    const updated = await this.investorRepo.update(id, updates);
    if (!updated) throw new EntityNotFoundError('Investor', id);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Investor',
      entityId: id,
      action: 'INVESTOR_UPDATED',
      previousValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  public async linkWallet(
    investorId: string,
    payload: Omit<WalletEntity, 'wallet_id' | 'investor_id' | 'created_at' | 'verification_status'>,
    actorId: string,
    actorRole: string
  ): Promise<WalletEntity> {
    await this.getInvestor(investorId);

    const existing = await this.walletRepo.findByAddress(payload.network, payload.wallet_address);
    if (existing) {
      throw new DuplicateEntityError('Wallet', 'wallet_address', payload.wallet_address);
    }

    const wallet: WalletEntity = {
      ...payload,
      wallet_id: randomUUID(),
      investor_id: investorId,
      verification_status: WalletVerificationStatus.UNVERIFIED,
      created_at: new Date().toISOString(),
    };

    const created = await this.walletRepo.create(wallet);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Wallet',
      entityId: created.wallet_id,
      action: 'WALLET_LINKED',
      newValue: created as unknown as Record<string, unknown>,
    });

    return created;
  }

  public async listWallets(investorId: string): Promise<WalletEntity[]> {
    await this.getInvestor(investorId);
    return this.walletRepo.listByInvestorId(investorId);
  }

  public async submitKyc(
    investorId: string,
    payload: Omit<KycVerificationEntity, 'verification_id' | 'investor_id' | 'verification_status' | 'created_at' | 'updated_at'>,
    actorId: string,
    actorRole: string
  ): Promise<KycVerificationEntity> {
    await this.getInvestor(investorId);

    const kyc: KycVerificationEntity = {
      ...payload,
      verification_id: randomUUID(),
      investor_id: investorId,
      verification_status: KycVerificationStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await this.kycRepo.create(kyc);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'KycVerification',
      entityId: created.verification_id,
      action: 'KYC_SUBMITTED',
      newValue: created as unknown as Record<string, unknown>,
    });

    return created;
  }

  public async getKycList(investorId: string): Promise<KycVerificationEntity[]> {
    await this.getInvestor(investorId);
    return this.kycRepo.findByInvestorId(investorId);
  }
}

export class AllocationService {
  constructor(
    private allocationRepo: AllocationRepository,
    private tokenRepo: TokenRepository,
    private investorRepo: InvestorRepository,
    private kycRepo: KycRepository,
    private blockchainService: RwaBlockchainService,
    private auditService: typeof AuditService,
    private eventBus: DomainEventBus
  ) {}

  /**
   * Allocates tokens to investor with strict double-allocation and supply enforcement
   */
  public async createAllocation(
    payload: {
      idempotencyKey: string;
      tokenId: string;
      investorId: string;
      tokenAmount: string;
      allocationPrice: number;
      currency?: string;
    },
    actorId: string,
    actorRole: string
  ): Promise<TokenAllocationEntity> {
    // 1. IDEMPOTENCY CHECK
    const existing = await this.allocationRepo.findByIdempotencyKey(payload.idempotencyKey);
    if (existing) {
      return existing; // Return existing allocation safely without re-processing
    }

    // 2. TOKEN VALIDATION
    const token = await this.tokenRepo.findById(payload.tokenId);
    if (!token) throw new EntityNotFoundError('Token', payload.tokenId);

    if (token.token_status !== TokenStatus.ACTIVE && token.token_status !== TokenStatus.DEPLOYED) {
      throw new ValidationError(`Token is not active for allocation (status: ${token.token_status}).`);
    }

    // 3. INVESTOR & COMPLIANCE VALIDATION
    const investor = await this.investorRepo.findById(payload.investorId);
    if (!investor) throw new EntityNotFoundError('Investor', payload.investorId);

    if (investor.investor_status !== 'ACTIVE') {
      throw new IneligibleInvestorError(`Investor status is ${investor.investor_status}.`);
    }

    const kycRecords = await this.kycRepo.findByInvestorId(payload.investorId);
    const hasVerifiedKyc = kycRecords.some(
      (k) => k.verification_status === KycVerificationStatus.VERIFIED
    );

    if (!hasVerifiedKyc) {
      throw new IneligibleInvestorError('Investor does not have verified KYC credentials.');
    }

    // 4. FINANCIAL INTEGRITY & AVAILABLE SUPPLY CHECK (BigInt Safe Math)
    const requestedAmount = BigInt(payload.tokenAmount);
    if (requestedAmount <= 0n) {
      throw new ValidationError('Requested token allocation amount must be greater than zero.');
    }

    const totalSupply = BigInt(token.total_supply);
    const alreadyAllocated = await this.allocationRepo.sumAllocatedTokensForToken(payload.tokenId);
    const availableSupply = totalSupply - alreadyAllocated;

    if (requestedAmount > availableSupply) {
      throw new SupplyExceededError(requestedAmount.toString(), availableSupply.toString());
    }

    // 5. DECIMAL SAFE TOTAL COST CALCULATION
    const price = payload.allocationPrice;
    const totalCost = Number(requestedAmount) * price;

    const allocation: TokenAllocationEntity = {
      allocation_id: randomUUID(),
      idempotency_key: payload.idempotencyKey,
      token_id: payload.tokenId,
      investor_id: payload.investorId,
      token_amount: payload.tokenAmount,
      allocation_price: price,
      allocation_currency: payload.currency || 'USD',
      total_cost: totalCost,
      allocation_status: AllocationStatus.RESERVED,
      settlement_status: SettlementStatus.PENDING,
      allocation_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await this.allocationRepo.create(allocation);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'TokenAllocation',
      entityId: created.allocation_id,
      action: 'TOKEN_ALLOCATED',
      newValue: created as unknown as Record<string, unknown>,
    });

    await this.eventBus.publish({
      eventId: randomUUID(),
      eventName: 'TokenAllocated',
      entityType: 'TokenAllocation',
      entityId: created.allocation_id,
      occurredAt: created.created_at,
      correlationId: payload.idempotencyKey,
      actorId,
      payload: created,
    });

    return created;
  }

  public async getAllocation(id: string): Promise<TokenAllocationEntity> {
    const a = await this.allocationRepo.findById(id);
    if (!a) throw new EntityNotFoundError('TokenAllocation', id);
    return a;
  }
}

export class TransactionService {
  constructor(
    private txRepo: TransactionRepository,
    private auditService: typeof AuditService,
    private eventBus: DomainEventBus
  ) {}

  public async recordTransaction(
    payload: Omit<TransactionEntity, 'transaction_id' | 'created_at'>,
    actorId: string,
    actorRole: string
  ): Promise<TransactionEntity> {
    const existing = await this.txRepo.findByTxHash(payload.tx_hash);
    if (existing) {
      return existing;
    }

    const tx: TransactionEntity = {
      ...payload,
      transaction_id: randomUUID(),
      created_at: new Date().toISOString(),
    };

    const created = await this.txRepo.create(tx);

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Transaction',
      entityId: created.transaction_id,
      action: 'TRANSACTION_RECORDED',
      newValue: created as unknown as Record<string, unknown>,
    });

    return created;
  }

  public async getTransaction(id: string): Promise<TransactionEntity> {
    const tx = await this.txRepo.findById(id);
    if (!tx) throw new EntityNotFoundError('Transaction', id);
    return tx;
  }

  public async confirmTransaction(
    id: string,
    blockNumber: number,
    actorId: string,
    actorRole: string
  ): Promise<TransactionEntity> {
    const tx = await this.getTransaction(id);

    if (tx.transaction_status === TransactionStatus.CONFIRMED) {
      throw new ImmutableRecordError('Transaction', 'Confirmed transactions cannot be updated.');
    }

    const updated = await this.txRepo.update(id, {
      transaction_status: TransactionStatus.CONFIRMED,
      block_number: blockNumber,
      confirmed_at: new Date().toISOString(),
    });

    await this.auditService.record({
      actorId,
      actorRole,
      entityType: 'Transaction',
      entityId: id,
      action: 'TRANSACTION_CONFIRMED',
      newValue: updated as unknown as Record<string, unknown>,
    });

    await this.eventBus.publish({
      eventId: randomUUID(),
      eventName: 'TransferConfirmed',
      entityType: 'Transaction',
      entityId: id,
      occurredAt: new Date().toISOString(),
      correlationId: randomUUID(),
      actorId,
      payload: updated,
    });

    return updated!;
  }
}
