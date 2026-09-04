/**
 * Domain Entity Interfaces and Value Objects for RWA Platform
 */
import {
  PropertyType,
  PropertyStatus,
  DocumentType,
  DocumentVerificationStatus,
  SpvStatus,
  TokenStatus,
  TokenStandard,
  InvestorType,
  InvestorStatus,
  AccreditationStatus,
  KycVerificationStatus,
  WalletVerificationStatus,
  AllocationStatus,
  SettlementStatus,
  TransactionType,
  TransactionStatus,
  UserRole,
} from './enums.js';

export interface SpvEntity {
  spv_id: string;
  legal_name: string;
  jurisdiction: string;
  registration_number: string;
  entity_type: string;
  registered_address: string;
  incorporation_date: string;
  status: SpvStatus;
  legal_document_reference?: string;
  metadata?: Record<string, unknown>;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyEntity {
  property_id: string;
  property_name: string;
  property_type: PropertyType;
  property_description?: string;
  property_address: string;
  country: string;
  region: string;
  city: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  valuation: number;
  valuation_currency: string;
  valuation_date: string;
  acquisition_price: number;
  estimated_rental_income?: number;
  occupancy_rate?: number;
  legal_status: string;
  title_status: string;
  property_status: PropertyStatus;
  document_status: string;
  spv_id?: string | null;
  version: number;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyDocumentEntity {
  document_id: string;
  property_id: string;
  document_type: DocumentType;
  document_uri: string;
  document_hash: string;
  verification_status: DocumentVerificationStatus;
  uploaded_by: string;
  verified_by?: string | null;
  created_at: string;
  verified_at?: string | null;
}

export interface InvestorEntity {
  investor_id: string;
  user_id?: string;
  investor_type: InvestorType;
  legal_name: string;
  email: string;
  country: string;
  primary_wallet_address?: string | null;
  investor_status: InvestorStatus;
  accreditation_status: AccreditationStatus;
  risk_profile: string;
  version: number;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycVerificationEntity {
  verification_id: string;
  investor_id: string;
  verification_type: string;
  provider: string;
  verification_status: KycVerificationStatus;
  risk_level: string;
  verification_reference: string;
  notes?: string;
  verified_at?: string | null;
  expiry_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletEntity {
  wallet_id: string;
  investor_id: string;
  blockchain: string;
  network: string;
  wallet_address: string;
  wallet_type: string;
  verification_status: WalletVerificationStatus;
  is_primary: boolean;
  created_at: string;
}

export interface TokenEntity {
  token_id: string;
  property_id: string;
  spv_id: string;
  token_name: string;
  token_symbol: string;
  blockchain: string;
  network_id: string;
  standard: TokenStandard;
  contract_address?: string | null;
  total_supply: string; // BigInt safe string representation
  token_decimals: number;
  tokenization_price: number;
  tokenization_currency: string;
  minimum_investment: number;
  token_status: TokenStatus;
  deployment_tx_hash?: string | null;
  deployed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TokenAllocationEntity {
  allocation_id: string;
  idempotency_key: string;
  token_id: string;
  investor_id: string;
  token_amount: string; // BigInt safe string
  allocation_price: number;
  allocation_currency: string;
  total_cost: number;
  allocation_status: AllocationStatus;
  settlement_status: SettlementStatus;
  allocation_date: string;
  transaction_reference?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionEntity {
  transaction_id: string;
  investor_id: string;
  token_id: string;
  transaction_type: TransactionType;
  amount: number;
  quantity: string;
  blockchain: string;
  network: string;
  wallet_from: string;
  wallet_to: string;
  tx_hash: string;
  block_number?: number | null;
  transaction_status: TransactionStatus;
  created_at: string;
  confirmed_at?: string | null;
}

export interface AuditLogEntity {
  audit_id: string;
  actor_id: string;
  actor_role: UserRole | string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  ip_reference?: string | null;
  correlation_id: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
