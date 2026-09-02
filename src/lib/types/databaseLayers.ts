/**
 * RWA MULTI-DATABASE LAYERS - TYPE DEFINITIONS
 * ============================================
 * Defines types and interfaces for the 4 institutional database layers:
 * 1. Property Database (PostgreSQL + PostGIS)
 * 2. Legal / Document Database (PostgreSQL + Object Storage)
 * 3. Investor Database (PostgreSQL)
 * 4. Tokenization Database (PostgreSQL)
 */

// ----------------------------------------------------------------------------
// LAYER 1: PROPERTY DATABASE (PostgreSQL + PostGIS)
// ----------------------------------------------------------------------------

export type PropertyType = 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'MIXED_USE' | 'LAND';

export interface PropertySPV {
  id: string;
  name: string;
  entityType: 'LLC' | 'LTD' | 'CORP' | 'SPV' | 'TRUST';
  jurisdiction: string;
  registrationNumber: string;
  taxId?: string | null;
  registeredAgent?: string | null;
  formationDate?: string | null;
  operatingAgreementCid?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyRecord {
  id: string;
  address: string;
  title: string;
  latitude: number;
  longitude: number;
  parcelId: string;
  propertyType: PropertyType;
  unitsCount: number;
  spvId?: string | null;
  spv?: PropertySPV | null;
  squareFeet?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  yearBuilt?: number | null;
  zoningCode?: string | null;
  assessedValuation?: number | null;
  registrySource: 'HM_LAND_REGISTRY' | 'TORRENS' | 'CADASTER' | 'OTHER';
  contentHash: string;
  verified: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface SpatialBoundingBox {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
}

export interface SpatialQueryFilter {
  center?: GeoPoint;
  radiusKm?: number;
  boundingBox?: SpatialBoundingBox;
  propertyType?: PropertyType;
  minValuation?: number;
  maxValuation?: number;
  spvId?: string;
  limit?: number;
  offset?: number;
}

// ----------------------------------------------------------------------------
// LAYER 2: LEGAL / DOCUMENT DATABASE (PostgreSQL + Object Storage)
// ----------------------------------------------------------------------------

export type LegalDocumentType =
  | 'DEED'
  | 'TITLE_INSURANCE'
  | 'LEASE_AGREEMENT'
  | 'SPV_OPERATING_AGREEMENT'
  | 'APPRAISAL_REPORT'
  | 'CONTRACT'
  | 'KYC_DOCUMENT'
  | 'KYB_DOCUMENT'
  | 'TAX_RETURN'
  | 'SURVEY_PLAT';

export type StorageProvider = 'SUPABASE_STORAGE' | 'S3' | 'IPFS' | 'LOCAL';
export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export interface LegalDocument {
  id: string;
  assetId?: string | null;
  spvId?: string | null;
  investorWallet?: string | null;
  documentType: LegalDocumentType;
  title: string;
  description?: string | null;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageProvider: StorageProvider;
  storageBucket: string;
  storagePath: string;
  contentHash: string; // SHA-256
  signatureML_DSA?: string | null; // PQC Digital Signature
  verificationStatus: DocumentVerificationStatus;
  notarized: boolean;
  notarizedAt?: string | null;
  notaryRef?: string | null;
  effectiveDate?: string | null;
  expiresAt?: string | null;
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  assetId?: string;
  spvId?: string;
  investorWallet?: string;
  documentType: LegalDocumentType;
  title: string;
  description?: string;
  fileName: string;
  mimeType?: string;
  fileBufferOrContent: string | Buffer;
  storageProvider?: StorageProvider;
  storageBucket?: string;
  notarized?: boolean;
  notaryRef?: string;
  effectiveDate?: string;
  expiresAt?: string;
  uploadedBy?: string;
}

export interface SignedDocumentUrlResponse {
  documentId: string;
  fileName: string;
  signedUrl: string;
  expiresInSeconds: number;
  contentHash: string;
  isVerified: boolean;
}

// ----------------------------------------------------------------------------
// LAYER 3: INVESTOR DATABASE (PostgreSQL)
// ----------------------------------------------------------------------------

export type InvestorTier = 'INDIVIDUAL' | 'INSTITUTIONAL' | 'QUALIFIED_PURCHASER' | 'FAMILY_OFFICE';
export type AccreditationStatus = 'RETAIL' | 'ACCREDITED' | 'QUALIFIED_PURCHASER' | 'EXEMPT';
export type KycStatus = 'UNVERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type KybStatus = 'NOT_APPLICABLE' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type AmlRiskRating = 'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED';

export interface InvestorProfile {
  id: string;
  walletAddress: string;
  fullName: string;
  email?: string | null;
  investorType: InvestorTier;
  primaryJurisdiction: string;
  taxIdNumber?: string | null;
  taxClassification: 'W-9' | 'W-8BEN' | 'W-8BEN-E' | 'OTHER';
  accreditationStatus: AccreditationStatus;
  accreditationEvidenceRef?: string | null;
  accreditationExpiresAt?: string | null;
  kycStatus: KycStatus;
  kybStatus: KybStatus;
  amlRiskRating: AmlRiskRating;
  pepCheckPassed: boolean;
  sanctionsCheckPassed: boolean;
  totalInvestedUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestorProfileInput {
  walletAddress: string;
  fullName: string;
  email?: string;
  investorType?: InvestorTier;
  primaryJurisdiction: string;
  taxIdNumber?: string;
  taxClassification?: 'W-9' | 'W-8BEN' | 'W-8BEN-E' | 'OTHER';
  accreditationStatus?: AccreditationStatus;
  accreditationEvidenceRef?: string;
}

// ----------------------------------------------------------------------------
// LAYER 4: TOKENIZATION DATABASE (PostgreSQL)
// ----------------------------------------------------------------------------

export type IssuanceStatus = 'UPCOMING' | 'ACTIVE' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';

export interface TokenIssuanceTranche {
  id: string;
  tokenId: string;
  spvId?: string | null;
  trancheName: string;
  targetRaiseUsd: number;
  minimumRaiseUsd: number;
  tokenPriceUsd: number;
  tokensOffered: string;
  tokensIssued: string;
  issuanceStatus: IssuanceStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CapTableEntry {
  id: string;
  tokenId: string;
  investorWallet: string;
  tokenBalance: string;
  lockedBalance: string;
  ownershipPercentage: number;
  votingWeight: number;
  claimEntitlementShare: number;
  isWhitelisted: boolean;
  lockupUntil?: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapTableSummary {
  tokenId: string;
  tokenSymbol: string;
  totalSupply: string;
  circulatingSupply: string;
  lockedSupply: string;
  totalHolders: number;
  spvOwnershipPercentage: number;
  retailOwnershipPercentage: number;
  institutionalOwnershipPercentage: number;
  entries: CapTableEntry[];
  generatedAt: string;
}

// ----------------------------------------------------------------------------
// LAYER 5: BLOCKCHAIN INDEXER DATABASE (The Graph Indexer)
// ----------------------------------------------------------------------------

export interface IndexedTransfer {
  id: string;
  chainId: number;
  tokenAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: string;
  createdAt: string;
}

export interface IndexedContractEvent {
  id: string;
  chainId: number;
  contractAddress: string;
  eventName: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  parameters: Record<string, unknown>;
  blockTimestamp: string;
  createdAt: string;
}

export interface WalletBalanceSnapshot {
  id: string;
  tokenAddress: string;
  walletAddress: string;
  balance: string;
  lockedBalance: string;
  blockNumber: number;
  snapshotTimestamp: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// LAYER 6: ANALYTICS DATABASE (PostgreSQL / ClickHouse)
// ----------------------------------------------------------------------------

export interface NavSnapshot {
  id: string;
  tokenId: string;
  propertyId?: string | null;
  totalAssetValuationUsd: number;
  totalLiabilitiesUsd: number;
  netAssetValueUsd: number;
  totalTokenSupply: string;
  navPerTokenUsd: number;
  valuationMethod: string;
  recordedAt: string;
  createdAt: string;
}

export interface RentalYieldMetrics {
  id: string;
  propertyId: string;
  tokenId?: string | null;
  grossAnnualRentUsd: number;
  annualOperatingExpensesUsd: number;
  netOperatingIncomeUsd: number;
  propertyValuationUsd: number;
  grossRentalYieldPct: number;
  netRentalYieldPct: number;
  distributionApyPct: number;
  occupancyRatePct: number;
  recordedAt: string;
  createdAt: string;
}

export interface DistributionAnalytics {
  id: string;
  tokenId: string;
  periodLabel: string;
  totalDistributedUsdc: number;
  distributionRatePerToken: number;
  annualizedYieldPct: number;
  recipientCount: number;
  payoutDate: string;
  merkleRoot?: string | null;
  createdAt: string;
}

export interface LiquidityMetrics {
  id: string;
  tokenId: string;
  volume24hUsd: number;
  tradesCount24h: number;
  turnoverRatePct: number;
  bidAskSpreadPct?: number | null;
  orderBookDepthUsd?: number | null;
  recordedAt: string;
  createdAt: string;
}

export interface InvestorCohortAnalytics {
  id: string;
  tokenId?: string | null;
  totalActiveInvestors: number;
  averageCheckSizeUsd: number;
  medianCheckSizeUsd: number;
  retailInvestorCount: number;
  institutionalInvestorCount: number;
  retentionRatePct: number;
  geographicBreakdown: Record<string, number>;
  cohortMetrics: Record<string, unknown>;
  recordedAt: string;
  createdAt: string;
}

