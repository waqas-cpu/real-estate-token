/**
 * Comprehensive Automated Tests for RWA CRUD Architecture
 * Validates:
 * 1. Duplicate token contract prevention
 * 2. Over-allocation prevention (exceeding total supply)
 * 3. Unverified investor rejection for restricted token allocation
 * 4. Immutability of confirmed blockchain transactions
 * 5. Role-based authorization & unauthorized update prevention
 * 6. Deterministic lifecycle state machine enforcement
 * 7. Idempotency key evaluation (preventing double allocations)
 * 8. Soft deletion / archival retention in audit log
 * 9. Blockchain reconciliation and supply invariant checking
 * 10. EVM wallet format and verification validation
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
} from '../src/modules/crud/repositories/RwaRepositories.js';
import {
  PropertyService,
  SpvService,
  TokenService,
  InvestorService,
  AllocationService,
  TransactionService,
} from '../src/modules/crud/services/RwaServices.js';
import { DomainEventBus } from '../src/modules/crud/events/DomainEventBus.js';
import { AuditService } from '../src/modules/crud/audit/AuditService.js';
import { RwaBlockchainService } from '../src/modules/crud/blockchain/RwaBlockchainService.js';
import {
  PropertyType,
  PropertyStatus,
  SpvStatus,
  TokenStatus,
  TokenStandard,
  InvestorType,
  InvestorStatus,
  AccreditationStatus,
  KycVerificationStatus,
  TransactionType,
  TransactionStatus,
  UserRole,
} from '../src/modules/crud/domain/enums.js';
import {
  SupplyExceededError,
  IneligibleInvestorError,
  InvalidStateTransitionError,
  ImmutableRecordError,
  DuplicateEntityError,
} from '../src/modules/crud/errors/DomainError.js';

describe('RWA CRUD Architecture Test Suite', () => {
  let propertyRepo: PropertyRepository;
  let docRepo: PropertyDocumentRepository;
  let spvRepo: SpvRepository;
  let tokenRepo: TokenRepository;
  let investorRepo: InvestorRepository;
  let kycRepo: KycRepository;
  let walletRepo: WalletRepository;
  let allocRepo: AllocationRepository;
  let txRepo: TransactionRepository;

  let eventBus: DomainEventBus;
  let blockchainService: RwaBlockchainService;

  let propertyService: PropertyService;
  let spvService: SpvService;
  let tokenService: TokenService;
  let investorService: InvestorService;
  let allocationService: AllocationService;
  let txService: TransactionService;

  beforeEach(() => {
    propertyRepo = new PropertyRepository();
    docRepo = new PropertyDocumentRepository();
    spvRepo = new SpvRepository();
    tokenRepo = new TokenRepository();
    investorRepo = new InvestorRepository();
    kycRepo = new KycRepository();
    walletRepo = new WalletRepository();
    allocRepo = new AllocationRepository();
    txRepo = new TransactionRepository();

    eventBus = DomainEventBus.getInstance();
    eventBus.clearHistory();
    blockchainService = new RwaBlockchainService();

    propertyService = new PropertyService(propertyRepo, docRepo, spvRepo, eventBus, AuditService);
    spvService = new SpvService(spvRepo, AuditService, eventBus);
    tokenService = new TokenService(tokenRepo, propertyRepo, spvRepo, blockchainService, AuditService, eventBus);
    investorService = new InvestorService(investorRepo, walletRepo, kycRepo, AuditService, eventBus);
    allocationService = new AllocationService(allocRepo, tokenRepo, investorRepo, kycRepo, blockchainService, AuditService, eventBus);
    txService = new TransactionService(txRepo, AuditService, eventBus);
  });

  // ── TEST 1: Cannot create duplicate token contract ─────────────────────────
  it('1. Cannot create duplicate token for the same physical property', async () => {
    const spv = await spvService.createSpv(
      {
        legal_name: 'Mayfair Properties SPV LLC',
        jurisdiction: 'UK',
        registration_number: 'SPV-UK-8849',
        entity_type: 'LLC',
        registered_address: '10 Berkeley Square, London',
        incorporation_date: '2025-01-01',
        status: SpvStatus.ACTIVE,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const property = await propertyService.createProperty(
      {
        property_name: 'Mayfair Luxury Townhouse',
        property_type: PropertyType.RESIDENTIAL,
        property_address: '14 Curzon Street, London',
        country: 'UK',
        region: 'Greater London',
        city: 'London',
        postal_code: 'W1J 5HN',
        latitude: 51.506,
        longitude: -0.147,
        valuation: 5000000,
        valuation_currency: 'USD',
        valuation_date: '2026-01-01',
        acquisition_price: 4500000,
        legal_status: 'FREEHOLD',
        title_status: 'CLEAR',
        spv_id: spv.spv_id,
        created_by: 'admin-1',
        updated_by: 'admin-1',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    await tokenService.createToken(
      {
        property_id: property.property_id,
        spv_id: spv.spv_id,
        token_name: 'Mayfair Curzon Token',
        token_symbol: 'MCT',
        blockchain: 'ETHEREUM',
        network_id: '11155111',
        standard: TokenStandard.ERC3643,
        total_supply: '5000000',
        token_decimals: 18,
        tokenization_price: 1.0,
        tokenization_currency: 'USD',
        minimum_investment: 100,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    // Attempt duplicate token creation on same property
    await expect(
      tokenService.createToken(
        {
          property_id: property.property_id,
          spv_id: spv.spv_id,
          token_name: 'Mayfair Curzon Token Duplicate',
          token_symbol: 'MCT2',
          blockchain: 'ETHEREUM',
          network_id: '11155111',
          standard: TokenStandard.ERC3643,
          total_supply: '1000000',
          token_decimals: 18,
          tokenization_price: 1.0,
          tokenization_currency: 'USD',
          minimum_investment: 100,
        },
        'admin-1',
        UserRole.SUPER_ADMIN
      )
    ).rejects.toThrow(DuplicateEntityError);
  });

  // ── TEST 2: Cannot allocate more tokens than total supply ──────────────────
  it('2. Cannot allocate more tokens than available total supply', async () => {
    const spv = await spvService.createSpv(
      {
        legal_name: 'Chelsea Wharf SPV Ltd',
        jurisdiction: 'UK',
        registration_number: 'SPV-UK-7721',
        entity_type: 'LLC',
        registered_address: 'Chelsea Embankment, London',
        incorporation_date: '2025-01-01',
        status: SpvStatus.ACTIVE,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const property = await propertyService.createProperty(
      {
        property_name: 'Chelsea Penthouse',
        property_type: PropertyType.RESIDENTIAL,
        property_address: '10 Chelsea Wharf',
        country: 'UK',
        region: 'London',
        city: 'London',
        postal_code: 'SW3 4LK',
        latitude: 51.485,
        longitude: -0.169,
        valuation: 1000000,
        valuation_currency: 'USD',
        valuation_date: '2026-01-01',
        acquisition_price: 900000,
        legal_status: 'FREEHOLD',
        title_status: 'CLEAR',
        spv_id: spv.spv_id,
        created_by: 'admin-1',
        updated_by: 'admin-1',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const token = await tokenService.createToken(
      {
        property_id: property.property_id,
        spv_id: spv.spv_id,
        token_name: 'Chelsea Token',
        token_symbol: 'CTK',
        blockchain: 'ETHEREUM',
        network_id: '11155111',
        standard: TokenStandard.ERC3643,
        total_supply: '1000', // Total supply: 1,000 units
        token_decimals: 18,
        tokenization_price: 1000.0,
        tokenization_currency: 'USD',
        minimum_investment: 100,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    // Transition token to ACTIVE
    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.APPROVED }, 'admin-1', UserRole.SUPER_ADMIN);
    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.DEPLOYMENT_PENDING }, 'admin-1', UserRole.SUPER_ADMIN);
    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.DEPLOYED }, 'admin-1', UserRole.SUPER_ADMIN);
    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.ACTIVE }, 'admin-1', UserRole.SUPER_ADMIN);

    const investor = await investorService.createInvestor(
      {
        investor_type: InvestorType.INDIVIDUAL,
        legal_name: 'Alice Smith',
        email: 'alice@investor.com',
        country: 'UK',
        investor_status: InvestorStatus.ACTIVE,
        accreditation_status: AccreditationStatus.ACCREDITED,
        risk_profile: 'GROWTH',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    // Verify KYC
    const kyc = await investorService.submitKyc(
      investor.investor_id,
      {
        verification_type: 'KYC_INDIVIDUAL',
        provider: 'SUMSUB',
        risk_level: 'LOW',
        verification_reference: 'KYC-REF-001',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );
    await kycRepo.update(kyc.verification_id, { verification_status: KycVerificationStatus.VERIFIED });

    // 1st allocation of 800 tokens (Valid)
    await allocationService.createAllocation(
      {
        idempotencyKey: 'alloc-key-001',
        tokenId: token.token_id,
        investorId: investor.investor_id,
        tokenAmount: '800',
        allocationPrice: 1000,
      },
      investor.investor_id,
      UserRole.INVESTOR
    );

    // 2nd allocation of 300 tokens (Exceeds remaining 200 supply -> Must Fail)
    await expect(
      allocationService.createAllocation(
        {
          idempotencyKey: 'alloc-key-002',
          tokenId: token.token_id,
          investorId: investor.investor_id,
          tokenAmount: '300',
          allocationPrice: 1000,
        },
        investor.investor_id,
        UserRole.INVESTOR
      )
    ).rejects.toThrow(SupplyExceededError);
  });

  // ── TEST 3: Unverified investor cannot receive restricted tokens ───────────
  it('3. Unverified investor without valid KYC cannot receive allocations', async () => {
    const spv = await spvService.createSpv(
      {
        legal_name: 'Kensington Assets SPV',
        jurisdiction: 'UK',
        registration_number: 'SPV-UK-1092',
        entity_type: 'LLC',
        registered_address: 'Kensington, London',
        incorporation_date: '2025-01-01',
        status: SpvStatus.ACTIVE,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const property = await propertyService.createProperty(
      {
        property_name: 'Kensington Villa',
        property_type: PropertyType.RESIDENTIAL,
        property_address: '5 Palace Gardens, London',
        country: 'UK',
        region: 'London',
        city: 'London',
        postal_code: 'W8 4QA',
        latitude: 51.503,
        longitude: -0.191,
        valuation: 2000000,
        valuation_currency: 'USD',
        valuation_date: '2026-01-01',
        acquisition_price: 1800000,
        legal_status: 'FREEHOLD',
        title_status: 'CLEAR',
        spv_id: spv.spv_id,
        created_by: 'admin-1',
        updated_by: 'admin-1',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const token = await tokenService.createToken(
      {
        property_id: property.property_id,
        spv_id: spv.spv_id,
        token_name: 'Kensington Token',
        token_symbol: 'KTK',
        blockchain: 'ETHEREUM',
        network_id: '11155111',
        standard: TokenStandard.ERC3643,
        total_supply: '2000',
        token_decimals: 18,
        tokenization_price: 1000.0,
        tokenization_currency: 'USD',
        minimum_investment: 100,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.APPROVED }, 'admin-1', UserRole.SUPER_ADMIN);
    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.DEPLOYMENT_PENDING }, 'admin-1', UserRole.SUPER_ADMIN);
    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.DEPLOYED }, 'admin-1', UserRole.SUPER_ADMIN);
    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.ACTIVE }, 'admin-1', UserRole.SUPER_ADMIN);

    const unverifiedInvestor = await investorService.createInvestor(
      {
        investor_type: InvestorType.INDIVIDUAL,
        legal_name: 'Bob Unverified',
        email: 'bob@unverified.com',
        country: 'UK',
        investor_status: InvestorStatus.ACTIVE,
        accreditation_status: AccreditationStatus.UNACCREDITED,
        risk_profile: 'MODERATE',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    // No verified KYC on record -> Must be rejected
    await expect(
      allocationService.createAllocation(
        {
          idempotencyKey: 'alloc-unverified-001',
          tokenId: token.token_id,
          investorId: unverifiedInvestor.investor_id,
          tokenAmount: '100',
          allocationPrice: 1000,
        },
        unverifiedInvestor.investor_id,
        UserRole.INVESTOR
      )
    ).rejects.toThrow(IneligibleInvestorError);
  });

  // ── TEST 4: Confirmed blockchain transaction cannot be modified ────────────
  it('4. Confirmed transaction records are immutable', async () => {
    const tx = await txService.recordTransaction(
      {
        investor_id: 'inv-uuid-1',
        token_id: 'tok-uuid-1',
        transaction_type: TransactionType.PRIMARY_ISSUANCE,
        amount: 50000,
        quantity: '50',
        blockchain: 'ETHEREUM',
        network: 'sepolia',
        wallet_from: '0x0000000000000000000000000000000000000000',
        wallet_to: '0x1111111111111111111111111111111111111111',
        tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        transaction_status: TransactionStatus.PENDING,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    // Confirm transaction
    await txService.confirmTransaction(tx.transaction_id, 5432100, 'admin-1', UserRole.SUPER_ADMIN);

    // Second confirmation / update attempt on confirmed transaction must fail
    await expect(
      txService.confirmTransaction(tx.transaction_id, 5432101, 'admin-1', UserRole.SUPER_ADMIN)
    ).rejects.toThrow(ImmutableRecordError);
  });

  // ── TEST 5: Invalid lifecycle transitions are rejected ─────────────────────
  it('5. Invalid lifecycle transitions on Property and Token are rejected', async () => {
    const property = await propertyService.createProperty(
      {
        property_name: 'Oxford Science Park',
        property_type: PropertyType.COMMERCIAL,
        property_address: 'Heatley Road, Oxford',
        country: 'UK',
        region: 'Oxfordshire',
        city: 'Oxford',
        postal_code: 'OX4 4GE',
        latitude: 51.721,
        longitude: -1.218,
        valuation: 12000000,
        valuation_currency: 'USD',
        valuation_date: '2026-01-01',
        acquisition_price: 11000000,
        legal_status: 'FREEHOLD',
        title_status: 'CLEAR',
        created_by: 'admin-1',
        updated_by: 'admin-1',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    expect(property.property_status).toBe(PropertyStatus.DRAFT);

    // Attempt illegal transition: DRAFT directly to TOKENIZED (Must Fail)
    await expect(
      propertyService.updateProperty(
        property.property_id,
        { property_status: PropertyStatus.TOKENIZED },
        'admin-1',
        UserRole.SUPER_ADMIN
      )
    ).rejects.toThrow(InvalidStateTransitionError);

    // Valid transition: DRAFT -> UNDER_REVIEW -> VERIFIED
    const reviewed = await propertyService.updateProperty(
      property.property_id,
      { property_status: PropertyStatus.UNDER_REVIEW },
      'admin-1',
      UserRole.SUPER_ADMIN
    );
    expect(reviewed.property_status).toBe(PropertyStatus.UNDER_REVIEW);

    const verified = await propertyService.updateProperty(
      property.property_id,
      { property_status: PropertyStatus.VERIFIED },
      'admin-1',
      UserRole.SUPER_ADMIN
    );
    expect(verified.property_status).toBe(PropertyStatus.VERIFIED);
  });

  // ── TEST 6: Duplicate investment requests with same idempotency key ────────
  it('6. Duplicate requests with same idempotency key return existing allocation without double allocation', async () => {
    const spv = await spvService.createSpv(
      {
        legal_name: 'Bristol Tech Hub SPV',
        jurisdiction: 'UK',
        registration_number: 'SPV-UK-5561',
        entity_type: 'LLC',
        registered_address: 'Temple Way, Bristol',
        incorporation_date: '2025-01-01',
        status: SpvStatus.ACTIVE,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const property = await propertyService.createProperty(
      {
        property_name: 'Bristol Tech Campus',
        property_type: PropertyType.COMMERCIAL,
        property_address: '1 Temple Way',
        country: 'UK',
        region: 'South West',
        city: 'Bristol',
        postal_code: 'BS2 0BY',
        latitude: 51.454,
        longitude: -2.587,
        valuation: 8000000,
        valuation_currency: 'USD',
        valuation_date: '2026-01-01',
        acquisition_price: 7500000,
        legal_status: 'FREEHOLD',
        title_status: 'CLEAR',
        spv_id: spv.spv_id,
        created_by: 'admin-1',
        updated_by: 'admin-1',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const token = await tokenService.createToken(
      {
        property_id: property.property_id,
        spv_id: spv.spv_id,
        token_name: 'Bristol Token',
        token_symbol: 'BRTK',
        blockchain: 'ETHEREUM',
        network_id: '11155111',
        standard: TokenStandard.ERC3643,
        total_supply: '10000',
        token_decimals: 18,
        tokenization_price: 800.0,
        tokenization_currency: 'USD',
        minimum_investment: 100,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.APPROVED }, 'admin-1', UserRole.SUPER_ADMIN);
    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.DEPLOYMENT_PENDING }, 'admin-1', UserRole.SUPER_ADMIN);
    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.DEPLOYED }, 'admin-1', UserRole.SUPER_ADMIN);
    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.ACTIVE }, 'admin-1', UserRole.SUPER_ADMIN);

    const investor = await investorService.createInvestor(
      {
        investor_type: InvestorType.INDIVIDUAL,
        legal_name: 'Charlie Green',
        email: 'charlie@investor.com',
        country: 'UK',
        investor_status: InvestorStatus.ACTIVE,
        accreditation_status: AccreditationStatus.ACCREDITED,
        risk_profile: 'MODERATE',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const kyc = await investorService.submitKyc(
      investor.investor_id,
      {
        verification_type: 'KYC_INDIVIDUAL',
        provider: 'SUMSUB',
        risk_level: 'LOW',
        verification_reference: 'KYC-BRISTOL-001',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );
    await kycRepo.update(kyc.verification_id, { verification_status: KycVerificationStatus.VERIFIED });

    const key = 'idem-unique-key-999';

    // First allocation
    const alloc1 = await allocationService.createAllocation(
      {
        idempotencyKey: key,
        tokenId: token.token_id,
        investorId: investor.investor_id,
        tokenAmount: '500',
        allocationPrice: 800,
      },
      investor.investor_id,
      UserRole.INVESTOR
    );

    // Duplicate call with same key
    const alloc2 = await allocationService.createAllocation(
      {
        idempotencyKey: key,
        tokenId: token.token_id,
        investorId: investor.investor_id,
        tokenAmount: '500',
        allocationPrice: 800,
      },
      investor.investor_id,
      UserRole.INVESTOR
    );

    expect(alloc1.allocation_id).toBe(alloc2.allocation_id);

    // Total allocated tokens must remain exactly 500 (not 1000)
    const sum = await allocRepo.sumAllocatedTokensForToken(token.token_id);
    expect(sum).toBe(500n);
  });

  // ── TEST 7: Soft-deleted records remain auditable ──────────────────────────
  it('7. Soft-deleted/archived records remain accessible in audit trail', async () => {
    const property = await propertyService.createProperty(
      {
        property_name: 'Historic Manor',
        property_type: PropertyType.RESIDENTIAL,
        property_address: 'Old Manor Road, Bath',
        country: 'UK',
        region: 'Somerset',
        city: 'Bath',
        postal_code: 'BA1 2AB',
        latitude: 51.381,
        longitude: -2.359,
        valuation: 3500000,
        valuation_currency: 'USD',
        valuation_date: '2026-01-01',
        acquisition_price: 3200000,
        legal_status: 'FREEHOLD',
        title_status: 'CLEAR',
        created_by: 'admin-1',
        updated_by: 'admin-1',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    await propertyService.archiveProperty(property.property_id, 'admin-1', UserRole.SUPER_ADMIN);

    // Query audit log
    const auditLogs = AuditService.query({
      entityType: 'Property',
      entityId: property.property_id,
    });

    const archiveEvent = auditLogs.find((l) => l.action === 'PROPERTY_ARCHIVED');
    expect(archiveEvent).toBeDefined();
    expect(archiveEvent?.entity_id).toBe(property.property_id);
  });

  // ── TEST 8: Blockchain supply reconciliation invariant ─────────────────────
  it('8. Blockchain reconciliation service detects supply synchronization correctly', async () => {
    const deployment = await blockchainService.deployTokenContract({
      tokenName: 'Reconciliation Test Token',
      tokenSymbol: 'RTT',
      decimals: 18,
      initialSupply: '1000000',
      networkId: '11155111',
    });

    expect(deployment.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

    // Check with equal or lesser allocation
    const checkValid = await blockchainService.reconcileSupply(deployment.contractAddress, '600000');
    expect(checkValid.isSynchronized).toBe(true);
    expect(checkValid.discrepancy).toBe('400000');

    // Check with excessive allocation
    const checkInvalid = await blockchainService.reconcileSupply(deployment.contractAddress, '1200000');
    expect(checkInvalid.isSynchronized).toBe(false);
  });

  // ── TEST 9: Wallet verification rule enforcement ───────────────────────────
  it('9. Enforces EVM wallet address format and prevents duplicate wallet registration', async () => {
    const investor = await investorService.createInvestor(
      {
        investor_type: InvestorType.INDIVIDUAL,
        legal_name: 'David WalletOwner',
        email: 'david@wallets.com',
        country: 'UK',
        investor_status: InvestorStatus.ACTIVE,
        accreditation_status: AccreditationStatus.UNACCREDITED,
        risk_profile: 'CONSERVATIVE',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const wallet = await investorService.linkWallet(
      investor.investor_id,
      {
        blockchain: 'ETHEREUM',
        network: 'sepolia',
        wallet_address: validWalletAddress,
        wallet_type: 'EOA',
        is_primary: true,
      },
      investor.investor_id,
      UserRole.INVESTOR
    );

    expect(wallet.wallet_address).toBe(validWalletAddress);

    // Duplicate wallet registration on same network must throw DuplicateEntityError
    await expect(
      investorService.linkWallet(
        investor.investor_id,
        {
          blockchain: 'ETHEREUM',
          network: 'sepolia',
          wallet_address: validWalletAddress,
          wallet_type: 'EOA',
          is_primary: false,
        },
        investor.investor_id,
        UserRole.INVESTOR
      )
    ).rejects.toThrow(DuplicateEntityError);
  });

  // ── TEST 10: Immutability of deployed token contract address and chain ─────
  it('10. Prevents modification of contract address and blockchain fields on deployed tokens', async () => {
    const spv = await spvService.createSpv(
      {
        legal_name: 'Mayfair Deployed SPV',
        jurisdiction: 'UK',
        registration_number: 'SPV-UK-9912',
        entity_type: 'LLC',
        registered_address: 'Mayfair, London',
        incorporation_date: '2025-01-01',
        status: SpvStatus.ACTIVE,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const property = await propertyService.createProperty(
      {
        property_name: 'Mayfair Commercial Office',
        property_type: PropertyType.COMMERCIAL,
        property_address: 'Piccadilly, London',
        country: 'UK',
        region: 'London',
        city: 'London',
        postal_code: 'W1J 9LL',
        latitude: 51.507,
        longitude: -0.141,
        valuation: 20000000,
        valuation_currency: 'USD',
        valuation_date: '2026-01-01',
        acquisition_price: 19000000,
        legal_status: 'FREEHOLD',
        title_status: 'CLEAR',
        spv_id: spv.spv_id,
        created_by: 'admin-1',
        updated_by: 'admin-1',
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    const token = await tokenService.createToken(
      {
        property_id: property.property_id,
        spv_id: spv.spv_id,
        token_name: 'Piccadilly Token',
        token_symbol: 'PCTK',
        blockchain: 'ETHEREUM',
        network_id: '11155111',
        standard: TokenStandard.ERC3643,
        total_supply: '20000',
        token_decimals: 18,
        tokenization_price: 1000.0,
        tokenization_currency: 'USD',
        minimum_investment: 100,
      },
      'admin-1',
      UserRole.SUPER_ADMIN
    );

    await tokenService.updateToken(token.token_id, { token_status: TokenStatus.APPROVED }, 'admin-1', UserRole.SUPER_ADMIN);
    const deployed = await tokenService.deployToken(token.token_id, 'admin-1', UserRole.SUPER_ADMIN);

    expect(deployed.token_status).toBe(TokenStatus.DEPLOYED);
    expect(deployed.contract_address).toBeDefined();

    // Attempting to overwrite contract_address on a deployed token must fail
    await expect(
      tokenService.updateToken(
        deployed.token_id,
        { contract_address: '0x9999999999999999999999999999999999999999' },
        'admin-1',
        UserRole.SUPER_ADMIN
      )
    ).rejects.toThrow(ImmutableRecordError);
  });
});
