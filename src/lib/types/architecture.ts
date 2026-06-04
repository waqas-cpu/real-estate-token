/**
 * HORIZONTAL DECOMPOSITION TYPES
 * ==============================
 * 4 Sovereign Layers, each with single responsibility
 */

// Layer 1: Data & Perception - Physical reality → verified digital twin
export interface DataLayer {
  assets: PhysicalAsset[];
  oracles: OracleAttestation[];
  twins: DigitalTwin[];
  registries: RegistryRecord[];
}

export interface PhysicalAsset {
  id: string;
  address: string;
  title: string;
  lat: number;
  lng: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  registrySource: 'HM_LAND_REGISTRY' | 'TORRENS' | 'CADASTER' | 'OTHER';
  contentHash: string; // SHA3-512
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OracleAttestation {
  id: string;
  assetId: string;
  source: 'CHAINLINK' | 'PYTH' | 'CUSTOM';
  dataType: 'VALUATION' | 'CONDITION' | 'MARKET' | 'LEGAL';
  value: string;
  confidence: number; // 0-1
  signedAt: Date;
  signatureML_DSA: string; // PQC signature
  expiresAt: Date;
}

export interface DigitalTwin {
  id: string;
  assetId: string;
  cid: string; // IPFS content identifier
  version: number;
  schema: Record<string, unknown>;
  titleChain: TitleRecord[];
  encumbrances: Encumbrance[];
  valuationHistory: ValuationPoint[];
  lastUpdated: Date;
  attestationQuorum: number; // # of oracle attestations required
}

export interface TitleRecord {
  date: Date;
  owner: string;
  transferType: 'PURCHASE' | 'INHERITANCE' | 'GIFTED' | 'FORECLOSURE';
  documentHash: string;
}

export interface Encumbrance {
  type: 'MORTGAGE' | 'LIEN' | 'EASEMENT' | 'COVENANT';
  holder: string;
  amount?: number;
  expiresAt?: Date;
}

export interface ValuationPoint {
  date: Date;
  fmv: number; // Fair market value
  confidence: number;
  method: 'HEDONIC' | 'COMPS' | 'INCOME' | 'APPRAISAL';
}

export interface RegistryRecord {
  id: string;
  assetId: string;
  registry: string;
  referenceId: string;
  raw: Record<string, unknown>;
}

// Layer 2: Intelligence - Verified data → trusted signals
export interface IntelligenceLayer {
  valuations: ValuationSignal[];
  riskScores: RiskScore[];
  kycRecords: KYCRecord[];
  complianceRules: ComplianceRule[];
}

export interface ValuationSignal {
  id: string;
  assetId: string;
  fmv: number;
  confidenceInterval: [number, number]; // [low, high]
  method: string;
  factors: Record<string, number>; // SHAP feature attribution
  modelVersion: string;
  computedAt: Date;
  expiresAt: Date;
}

export interface RiskScore {
  id: string;
  assetId: string;
  creditRisk: number; // 0-100
  liquidityRisk: number;
  operationalRisk: number;
  jurisdictionalRisk: number;
  composite: number; // Bayesian combination
  lastUpdated: Date;
}

export interface KYCRecord {
  id: string;
  investorWallet: string;
  accreditated: boolean;
  jurisdictions: string[];
  amlClearedAt: Date;
  amlExpiresAt: Date;
  zk_commitmentHash: string; // ZK credential hash
  zk_verifierCircuit: string; // Noir circuit ID
}

export interface ComplianceRule {
  id: string;
  jurisdiction: string;
  applicableStandards: string[]; // 'MICA', 'REG_D', 'FCA', etc.
  transferRestrictions: string[];
  disclosureRequirements: string[];
  enforceableAt: Date;
}

// Layer 3: PQC & Security - Trusted data → quantum-safe custody
export interface SecurityLayer {
  keys: CryptoKey[];
  credentials: ZKCredential[];
  auditLog: AuditEvent[];
  recoveryModules: RecoveryModule[];
}

export interface CryptoKey {
  id: string;
  algorithm: 'ML_DSA_87' | 'ML_KEM_1024' | 'SLH_DSA' | 'ECDH' | 'HYBRID';
  purpose: 'SIGNING' | 'ENCRYPTION' | 'BACKUP' | 'RECOVERY';
  keyShares: number; // t-of-n threshold
  generatedAt: Date;
  rotatesAt: Date;
  hsmLocation: string;
  publicKeyHash: string;
  /** Base64url-encoded NIST public key (pqc1:… wire format) for verification */
  publicKeyEnc?: string;
  /** Shamir share identifiers from key ceremony (metadata only in API responses) */
  shamirShareIds?: string[];
}

export interface ZKCredential {
  id: string;
  investorWallet: string;
  proofType: 'ACCREDITATION' | 'JURISDICTION' | 'AML' | 'COMPOSITE';
  circuitID: string; // Noir circuit
  commitment: string; // Hash-based commitment
  issuedAt: Date;
  expiresAt: Date;
  verifierContractAddr: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  layer: 'DATA' | 'INTELLIGENCE' | 'SECURITY' | 'EXECUTION';
  actor: string;
  timestamp: Date;
  zkProofPath?: string;
  signature: string; // ML-DSA-87 signed
}

export interface RecoveryModule {
  id: string;
  investorWallet: string;
  guardians: string[];
  timelock: number; // seconds
  recoveryMethod: 'SOCIAL_MULTISIG' | 'COURT_ORDERED' | 'FORCED_TRANSFER';
}

// Layer 4: Execution - Authorized intent → immutable settlement
export interface ExecutionLayer {
  tokens: SecurityToken[];
  offerings: TokenOffering[];
  governance: GovernanceProposal[];
  distributions: IncomeDistribution[];
}

export interface SecurityToken {
  id: string;
  assetId: string;
  symbol: string;
  totalSupply: string; // BN in wei
  decimals: number;
  contractAddress: string;
  trexIdentityRegistry: string;
  complianceModules: string[]; // Contract addresses
  creator: string;
  createdAt: Date;
}

export interface TokenOffering {
  id: string;
  tokenId: string;
  minRaise: string; // BN
  maxRaise: string; // BN
  tokenPrice: string; // BN per token
  startDate: Date;
  endDate: Date;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'SETTLED' | 'CANCELLED';
  totalRaised: string;
  investorCount: number;
  escrowContractAddr: string;
}

export interface GovernanceProposal {
  id: string;
  tokenId: string;
  proposer: string;
  title: string;
  description: string;
  proposalType: 'MANAGER_CHANGE' | 'CAPEX' | 'SALE' | 'EMERGENCY';
  votingPower: string; // Quadratic voting
  startBlock: number;
  endBlock: number;
  status: 'PENDING' | 'ACTIVE' | 'PASSED' | 'EXECUTED' | 'CANCELLED';
  timelockUntil: Date;
}

export interface IncomeDistribution {
  id: string;
  tokenId: string;
  periodStart: Date;
  periodEnd: Date;
  netIncome: string; // BN
  distributionDate: Date;
  merkleRoot: string;
  withheldByJurisdiction: Record<string, string>; // Withholding tax
}

/**
 * VERTICAL DECOMPOSITION - INTEGRATION GATES
 * ============================================
 * Rules enforced at every layer boundary
 */

export interface IntegrationGate {
  id: string;
  fromLayer: LayerName;
  toLayer: LayerName;
  rules: ValidationRule[];
  guardedBy: 'CRYPTOGRAPHIC' | 'ORACLE' | 'CONSENSUS' | 'TEMPORAL';
}

export type LayerName = 'DATA' | 'INTELLIGENCE' | 'SECURITY' | 'EXECUTION';

export interface ValidationRule {
  id: string;
  name: string;
  type: 'INVARIANT' | 'PRECONDITION' | 'POSTCONDITION';
  condition: (context: Record<string, unknown>) => Promise<boolean>;
  errorMessage: string;
  severity: 'BLOCK' | 'WARN' | 'AUDIT';
}

export interface LayerBoundary {
  sourceLayer: LayerName;
  targetLayer: LayerName;
  crossedAt: Date;
  dataHash: string;
  gateName: string;
  rulesApplied: string[];
  allPassed: boolean;
}
