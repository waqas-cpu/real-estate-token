import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyDatabaseService } from '../src/services/database/PropertyDatabaseService.js';
import { LegalDocumentDatabaseService } from '../src/services/database/LegalDocumentDatabaseService.js';
import { InvestorDatabaseService } from '../src/services/database/InvestorDatabaseService.js';
import { TokenizationDatabaseService } from '../src/services/database/TokenizationDatabaseService.js';
import { DatabaseLayerManager } from '../src/services/database/DatabaseLayerManager.js';

describe('Multi-Database Architecture Integration Tests', () => {
  // ==========================================================================
  // LAYER 1: PROPERTY DATABASE (PostgreSQL + PostGIS)
  // ==========================================================================
  describe('Layer 1: Property Database (PostgreSQL + PostGIS)', () => {
    let propertyService: PropertyDatabaseService;

    beforeEach(() => {
      propertyService = new PropertyDatabaseService();
    });

    it('creates an SPV entity and links it to real estate properties', async () => {
      const spv = await propertyService.createSPV({
        name: 'Mayfair Luxury Holdings SPV LTD',
        entityType: 'LTD',
        jurisdiction: 'United Kingdom',
        registrationNumber: 'UK-09887766',
        taxId: 'GB-123456789',
        registeredAgent: 'London Corporate Secretarial',
      });

      expect(spv.id).toBeDefined();
      expect(spv.name).toBe('Mayfair Luxury Holdings SPV LTD');
      expect(spv.jurisdiction).toBe('United Kingdom');

      // Create property with parcel ID, units, property type, and SPV reference
      const property = await propertyService.saveProperty({
        address: '14 Berkeley Square, Mayfair, London W1J 6BL',
        title: 'Mayfair Executive Offices',
        latitude: 51.509865,
        longitude: -0.146522,
        parcelId: 'LON-MAYF-2026-99A',
        propertyType: 'COMMERCIAL',
        unitsCount: 12,
        spvId: spv.id,
        assessedValuation: 15000000,
        squareFeet: 25000,
        zoningCode: 'COMM-CLASS-E',
      });

      expect(property.id).toBeDefined();
      expect(property.parcelId).toBe('LON-MAYF-2026-99A');
      expect(property.propertyType).toBe('COMMERCIAL');
      expect(property.unitsCount).toBe(12);
      expect(property.spv?.name).toBe('Mayfair Luxury Holdings SPV LTD');
    });

    it('performs spatial radius queries (PostGIS / Haversine)', async () => {
      // Add London property
      await propertyService.saveProperty({
        address: 'London Eye, Riverside Building, London',
        title: 'South Bank Complex',
        latitude: 51.5033,
        longitude: -0.1195,
        parcelId: 'LON-SB-01',
        propertyType: 'MIXED_USE',
        unitsCount: 40,
        assessedValuation: 20000000,
      });

      // Add Manchester property (~260 km away)
      await propertyService.saveProperty({
        address: '1 Deansgate, Manchester',
        title: 'Manchester Tower',
        latitude: 53.4831,
        longitude: -2.2446,
        parcelId: 'MAN-DEAN-01',
        propertyType: 'RESIDENTIAL',
        unitsCount: 80,
        assessedValuation: 8000000,
      });

      // Search within 20km of Central London (51.5074, -0.1278)
      const nearbyLondon = await propertyService.findPropertiesNearby(51.5074, -0.1278, 20);
      expect(nearbyLondon.some((p) => p.parcelId === 'LON-SB-01')).toBe(true);
      expect(nearbyLondon.some((p) => p.parcelId === 'MAN-DEAN-01')).toBe(false);

      // Search within 350km of Central London (should include Manchester)
      const nearbyUk = await propertyService.findPropertiesNearby(51.5074, -0.1278, 350);
      expect(nearbyUk.some((p) => p.parcelId === 'MAN-DEAN-01')).toBe(true);
    });

    it('performs spatial bounding box queries', async () => {
      await propertyService.saveProperty({
        address: '42 Wall Street, New York, NY',
        title: 'Wall Street Tower',
        latitude: 40.7069,
        longitude: -74.009,
        parcelId: 'NYC-MAN-42',
        propertyType: 'COMMERCIAL',
        unitsCount: 50,
      });

      const manhattanBox = {
        minLatitude: 40.7,
        maxLatitude: 40.8,
        minLongitude: -74.05,
        maxLongitude: -73.9,
      };

      const found = await propertyService.findPropertiesInBoundingBox(manhattanBox);
      expect(found.some((p) => p.parcelId === 'NYC-MAN-42')).toBe(true);
    });
  });

  // ==========================================================================
  // LAYER 2: LEGAL / DOCUMENT DATABASE (PostgreSQL + Object Storage)
  // ==========================================================================
  describe('Layer 2: Legal / Document Database (PostgreSQL + Object Storage)', () => {
    let documentService: LegalDocumentDatabaseService;

    beforeEach(() => {
      documentService = new LegalDocumentDatabaseService();
    });

    it('registers deeds, title docs, leases, and contracts with SHA-256 and PQC signatures', async () => {
      const sampleDeedContent = 'WARRANTY DEED: Transfer of Parcel LON-MAYF-2026-99A to SPV LLC on 2026-06-01';

      const doc = await documentService.uploadAndRegisterDocument({
        assetId: 'prop-mayfair-01',
        spvId: 'spv-mayfair-01',
        documentType: 'DEED',
        title: 'Master Warranty Deed',
        fileName: 'warranty_deed_mayfair.pdf',
        fileBufferOrContent: sampleDeedContent,
        notarized: true,
        notaryRef: 'NOTARY-UK-77189',
      });

      expect(doc.id).toBeDefined();
      expect(doc.documentType).toBe('DEED');
      expect(doc.contentHash).toBeDefined();
      expect(doc.contentHash.length).toBe(64); // SHA-256 hex string length
      expect(doc.signatureML_DSA).toBeDefined(); // PQC signature
      expect(doc.verificationStatus).toBe('VERIFIED');
      expect(doc.notarized).toBe(true);

      // Verify signed URL generation
      const signedUrlData = await documentService.getSignedDocumentUrl(doc.id, 1800);
      expect(signedUrlData).not.toBeNull();
      expect(signedUrlData?.signedUrl).toContain('rwa-legal-documents');
      expect(signedUrlData?.isVerified).toBe(true);

      // Verify tamper detection
      const verification = await documentService.verifyDocumentIntegrity(doc.id);
      expect(verification.isValid).toBe(true);
      expect(verification.hashMatches).toBe(true);
    });

    it('attaches KYC/KYB references to investor wallet', async () => {
      const kycSampleDoc = 'KYB_ARTICLES_OF_INCORPORATION: Alpha Fund LP, SEC Registered';
      const doc = await documentService.uploadAndRegisterDocument({
        investorWallet: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        documentType: 'KYB_DOCUMENT',
        title: 'Articles of Incorporation',
        fileName: 'alpha_fund_kyb.pdf',
        fileBufferOrContent: kycSampleDoc,
      });

      expect(doc.documentType).toBe('KYB_DOCUMENT');
      expect(doc.investorWallet).toBe('0x70997970c51812dc3a010c7d01b50e0d17dc79c8');

      const retrieved = await documentService.listDocuments({
        investorWallet: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      });
      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved[0].documentType).toBe('KYB_DOCUMENT');
    });
  });

  // ==========================================================================
  // LAYER 3: INVESTOR DATABASE (PostgreSQL)
  // ==========================================================================
  describe('Layer 3: Investor Database (PostgreSQL)', () => {
    let investorService: InvestorDatabaseService;

    beforeEach(() => {
      investorService = new InvestorDatabaseService();
    });

    it('manages investor profiles, jurisdiction, and tax classifications', async () => {
      const wallet = '0x1111111111111111111111111111111111111111';
      const profile = await investorService.upsertInvestorProfile({
        walletAddress: wallet,
        fullName: 'Geneva Wealth Management AG',
        email: 'tokens@geneva-wm.ch',
        investorType: 'INSTITUTIONAL',
        primaryJurisdiction: 'CH',
        taxIdNumber: 'CH-TAX-897',
        taxClassification: 'W-8BEN-E',
        accreditationStatus: 'QUALIFIED_PURCHASER',
      });

      expect(profile.walletAddress).toBe(wallet.toLowerCase());
      expect(profile.primaryJurisdiction).toBe('CH');
      expect(profile.investorType).toBe('INSTITUTIONAL');
      expect(profile.accreditationStatus).toBe('QUALIFIED_PURCHASER');
    });

    it('updates accreditation lifecycle and KYC/KYB status', async () => {
      const wallet = '0x2222222222222222222222222222222222222222';
      await investorService.upsertInvestorProfile({
        walletAddress: wallet,
        fullName: 'Sarah Jenkins',
        primaryJurisdiction: 'US',
      });

      // Update accreditation with SEC evidence
      const accredited = await investorService.updateAccreditation(
        wallet,
        'ACCREDITED',
        'sec://form-d/verified-506c'
      );
      expect(accredited.accreditationStatus).toBe('ACCREDITED');
      expect(accredited.accreditationEvidenceRef).toBe('sec://form-d/verified-506c');

      // Update KYC/KYB & AML rating
      const verified = await investorService.updateKycStatus(wallet, 'APPROVED', 'NOT_APPLICABLE', 'LOW');
      expect(verified.kycStatus).toBe('APPROVED');
      expect(verified.amlRiskRating).toBe('LOW');
    });
  });

  // ==========================================================================
  // LAYER 4: TOKENIZATION DATABASE (PostgreSQL)
  // ==========================================================================
  describe('Layer 4: Tokenization Database (PostgreSQL)', () => {
    let tokenizationService: TokenizationDatabaseService;

    beforeEach(() => {
      tokenizationService = new TokenizationDatabaseService();
    });

    it('tracks token metadata, SPV issuance tranches, and initial supply', async () => {
      const token = await tokenizationService.registerToken({
        assetId: 'prop-mayfair-01',
        spvId: 'spv-mayfair-01',
        symbol: 'MAYF',
        name: 'Mayfair Luxury Offices Token',
        totalSupply: '100000',
        decimals: 0,
        contractAddress: '0xMAYFAIR000000000000000000000000000000001',
        creator: '0xAdminDeployer',
      });

      expect(token.symbol).toBe('MAYF');
      expect(token.totalSupply).toBe('100000');

      // Create primary offering issuance tranche
      const tranche = await tokenizationService.createIssuanceTranche({
        tokenId: token.id,
        trancheName: 'Series A Institutional Tranche',
        targetRaiseUsd: 10000000,
        minimumRaiseUsd: 5000000,
        tokenPriceUsd: 100,
        tokensOffered: '100000',
      });

      expect(tranche.id).toBeDefined();
      expect(tranche.targetRaiseUsd).toBe(10000000);
      expect(tranche.issuanceStatus).toBe('ACTIVE');
    });

    it('maintains a real-time cap table with accurate ownership percentages', async () => {
      const token = await tokenizationService.registerToken({
        assetId: 'prop-test-02',
        symbol: 'TESTCAP',
        name: 'Cap Table Test Token',
        totalSupply: '10000',
        contractAddress: '0xTestCapContract',
        creator: '0xAdmin',
      });

      const holderA = '0xaaaa000000000000000000000000000000000001';
      const holderB = '0xbbbb000000000000000000000000000000000002';
      const holderC = '0xcccc000000000000000000000000000000000003';

      // Allocate 6,000 tokens to A (60%), 3,000 to B (30%), 1,000 to C (10%)
      await tokenizationService.updateCapTableAllocation({
        tokenId: token.id,
        investorWallet: holderA,
        absoluteBalance: 6000n,
        lockedBalance: 1000n,
      });

      await tokenizationService.updateCapTableAllocation({
        tokenId: token.id,
        investorWallet: holderB,
        absoluteBalance: 3000n,
      });

      const capTable = await tokenizationService.updateCapTableAllocation({
        tokenId: token.id,
        investorWallet: holderC,
        absoluteBalance: 1000n,
      });

      expect(capTable.totalHolders).toBe(3);
      expect(capTable.circulatingSupply).toBe('9000'); // 10000 total - 1000 locked
      expect(capTable.lockedSupply).toBe('1000');

      const entryA = capTable.entries.find((e) => e.investorWallet === holderA);
      const entryB = capTable.entries.find((e) => e.investorWallet === holderB);
      const entryC = capTable.entries.find((e) => e.investorWallet === holderC);

      expect(entryA?.ownershipPercentage).toBe(60);
      expect(entryB?.ownershipPercentage).toBe(30);
      expect(entryC?.ownershipPercentage).toBe(10);

      // Ownership percentages sum to 100%
      const totalPct = capTable.entries.reduce((acc, curr) => acc + curr.ownershipPercentage, 0);
      expect(Math.round(totalPct)).toBe(100);
    });
  });

  // ==========================================================================
  // LAYER 5: BLOCKCHAIN INDEXER (The Graph Indexer)
  // ==========================================================================
  describe('Layer 5: Blockchain Indexer (The Graph Indexer)', () => {
    it('indexes token transfers, contract events, and wallet balance snapshots', async () => {
      const manager = DatabaseLayerManager.getInstance();
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const sender = '0xSender111111111111111111111111111111111111';
      const recipient = '0xRecipient22222222222222222222222222222222';

      // Record transfer
      const transfer = await manager.indexer.recordTransfer({
        chainId: 11155111,
        tokenAddress,
        fromAddress: sender,
        toAddress: recipient,
        amount: '1500',
        transactionHash: '0xtx_transfer_test_hash_001',
        blockNumber: 6300000,
      });

      expect(transfer.id).toBeDefined();
      expect(transfer.amount).toBe('1500');

      // Update balances
      await manager.indexer.updateWalletBalance(tokenAddress, sender, '8500', '0', 6300000);
      await manager.indexer.updateWalletBalance(tokenAddress, recipient, '1500', '0', 6300000);

      const senderBalance = await manager.indexer.getWalletBalance(tokenAddress, sender);
      const recipientBalance = await manager.indexer.getWalletBalance(tokenAddress, recipient);

      expect(senderBalance?.balance).toBe('8500');
      expect(recipientBalance?.balance).toBe('1500');

      // Record contract event
      const evt = await manager.indexer.recordContractEvent({
        chainId: 11155111,
        contractAddress: tokenAddress,
        eventName: 'TokensLocked',
        blockNumber: 6300005,
        transactionHash: '0xtx_event_lock_hash_002',
        parameters: { user: recipient, lockedAmount: 500 },
      });

      expect(evt.eventName).toBe('TokensLocked');

      // Test Graph GraphQL interface simulation
      const gqlResult = await manager.indexer.executeSubgraphGraphQL('{ tokenTransfers { id value } }');
      expect(gqlResult.data.tokenTransfers.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // LAYER 6: ANALYTICS DATABASE (PostgreSQL / ClickHouse)
  // ==========================================================================
  describe('Layer 6: Analytics Database (PostgreSQL / ClickHouse)', () => {
    it('computes and stores NAV progression, rental yield, and distributions', async () => {
      const manager = DatabaseLayerManager.getInstance();
      const tokenId = 'token-analytics-test-001';
      const propertyId = 'prop-analytics-test-001';

      // 1. NAV Snapshot: $5,000,000 asset, $1,000,000 liabilities, 50,000 supply => NAV $80/token
      const nav = await manager.analytics.recordNavSnapshot({
        tokenId,
        propertyId,
        totalAssetValuationUsd: 5000000,
        totalLiabilitiesUsd: 1000000,
        totalTokenSupply: '50000',
        valuationMethod: 'THIRD_PARTY_AUDITED_APPRAISAL',
      });

      expect(nav.netAssetValueUsd).toBe(4000000);
      expect(nav.navPerTokenUsd).toBe(80.0);

      // 2. Rental Yield: $400k gross rent, $50k opex, $4M valuation => 10% gross, 8.75% net
      const rentalYield = await manager.analytics.recordRentalYield({
        propertyId,
        tokenId,
        grossAnnualRentUsd: 400000,
        annualOperatingExpensesUsd: 50000,
        propertyValuationUsd: 4000000,
        occupancyRatePct: 97.5,
      });

      expect(rentalYield.grossRentalYieldPct).toBe(10.0);
      expect(rentalYield.netRentalYieldPct).toBe(8.75);
      expect(rentalYield.netOperatingIncomeUsd).toBe(350000);

      // 3. Distribution Analytics: $30,000 distributed to 45 holders
      const dist = await manager.analytics.recordDistributionMetric({
        tokenId,
        periodLabel: '2026-M06',
        totalDistributedUsdc: 30000,
        distributionRatePerToken: 0.6,
        annualizedYieldPct: 9.0,
        recipientCount: 45,
      });

      expect(dist.totalDistributedUsdc).toBe(30000);
      expect(dist.distributionRatePerToken).toBe(0.6);

      // 4. Liquidity metrics
      const liq = await manager.analytics.recordLiquidityMetrics({
        tokenId,
        volume24hUsd: 65000,
        tradesCount24h: 18,
        turnoverRatePct: 1.625,
      });

      expect(liq.volume24hUsd).toBe(65000);
      expect(liq.tradesCount24h).toBe(18);
    });
  });

  // ==========================================================================
  // UNIFIED DATABASE LAYER MANAGER (ALL 6 LAYERS)
  // ==========================================================================
  describe('Unified DatabaseLayerManager (All 6 Layers)', () => {
    it('produces cross-layer health check and diagnostic summary across all 6 database systems', async () => {
      const manager = DatabaseLayerManager.getInstance();
      const summary = await manager.getDatabaseLayersSummary();

      expect(summary.status).toBe('HEALTHY');
      expect(summary.layers.propertyDatabase.technology).toBe('PostgreSQL + PostGIS');
      expect(summary.layers.legalDocumentDatabase.technology).toBe('PostgreSQL + Object Storage');
      expect(summary.layers.investorDatabase.technology).toBe('PostgreSQL');
      expect(summary.layers.tokenizationDatabase.technology).toBe('PostgreSQL');
      expect(summary.layers.blockchainIndexer.technology).toBe('The Graph indexer');
      expect(summary.layers.analyticsDatabase.technology).toBe('PostgreSQL / ClickHouse');
    });
  });
});

