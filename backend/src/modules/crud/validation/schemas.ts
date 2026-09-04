/**
 * Zod Input Validation Schemas for RWA CRUD Architecture
 */
import { z } from 'zod';
import {
  PropertyType,
  PropertyStatus,
  DocumentType,
  SpvStatus,
  TokenStandard,
  TokenStatus,
  InvestorType,
  InvestorStatus,
  AccreditationStatus,
  TransactionType,
  TransactionStatus,
} from '../domain/enums.js';

export const createPropertySchema = z.object({
  property_name: z.string().min(3).max(255),
  property_type: z.nativeEnum(PropertyType),
  property_description: z.string().optional(),
  property_address: z.string().min(5),
  country: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  postal_code: z.string().min(2).max(50),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  valuation: z.number().positive(),
  valuation_currency: z.string().default('USD'),
  valuation_date: z.string(),
  acquisition_price: z.number().positive(),
  estimated_rental_income: z.number().nonnegative().optional(),
  occupancy_rate: z.number().min(0).max(100).optional(),
  legal_status: z.string().default('FREEHOLD'),
  title_status: z.string().default('CLEAR'),
  spv_id: z.string().uuid().optional(),
});

export const updatePropertySchema = z.object({
  property_name: z.string().min(3).max(255).optional(),
  property_type: z.nativeEnum(PropertyType).optional(),
  property_description: z.string().optional(),
  property_address: z.string().min(5).optional(),
  country: z.string().min(2).max(100).optional(),
  region: z.string().min(2).max(100).optional(),
  city: z.string().min(2).max(100).optional(),
  postal_code: z.string().min(2).max(50).optional(),
  valuation: z.number().positive().optional(),
  estimated_rental_income: z.number().nonnegative().optional(),
  occupancy_rate: z.number().min(0).max(100).optional(),
  legal_status: z.string().optional(),
  title_status: z.string().optional(),
  property_status: z.nativeEnum(PropertyStatus).optional(),
  spv_id: z.string().uuid().optional(),
});

export const createDocumentSchema = z.object({
  document_type: z.nativeEnum(DocumentType),
  document_uri: z.string().url().or(z.string().startsWith('ipfs://')),
  document_hash: z.string().min(32).max(128),
});

export const createSpvSchema = z.object({
  legal_name: z.string().min(3).max(255),
  jurisdiction: z.string().min(2).max(100),
  registration_number: z.string().min(3).max(100),
  entity_type: z.string().default('LLC'),
  registered_address: z.string().min(5),
  incorporation_date: z.string(),
  status: z.nativeEnum(SpvStatus).default(SpvStatus.ACTIVE),
  legal_document_reference: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateSpvSchema = z.object({
  legal_name: z.string().min(3).max(255).optional(),
  registered_address: z.string().min(5).optional(),
  status: z.nativeEnum(SpvStatus).optional(),
  legal_document_reference: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createTokenSchema = z.object({
  property_id: z.string().uuid(),
  spv_id: z.string().uuid(),
  token_name: z.string().min(3).max(255),
  token_symbol: z.string().min(2).max(20),
  blockchain: z.string().default('ETHEREUM'),
  network_id: z.string().default('11155111'),
  standard: z.nativeEnum(TokenStandard).default(TokenStandard.ERC3643),
  total_supply: z.string().regex(/^\d+$/, 'total_supply must be positive integer string'),
  token_decimals: z.number().int().min(0).max(18).default(18),
  tokenization_price: z.number().positive(),
  tokenization_currency: z.string().default('USD'),
  minimum_investment: z.number().positive().default(100),
});

export const updateTokenSchema = z.object({
  token_name: z.string().min(3).max(255).optional(),
  token_symbol: z.string().min(2).max(20).optional(),
  minimum_investment: z.number().positive().optional(),
  token_status: z.nativeEnum(TokenStatus).optional(),
  contract_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  blockchain: z.string().optional(),
  network_id: z.string().optional(),
  total_supply: z.string().regex(/^\d+$/).optional(),
});

export const createInvestorSchema = z.object({
  investor_type: z.nativeEnum(InvestorType),
  legal_name: z.string().min(2).max(255),
  email: z.string().email(),
  country: z.string().min(2).max(100),
  primary_wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  investor_status: z.nativeEnum(InvestorStatus).default(InvestorStatus.ACTIVE),
  accreditation_status: z.nativeEnum(AccreditationStatus).default(AccreditationStatus.UNACCREDITED),
  risk_profile: z.string().default('MODERATE'),
});

export const updateInvestorSchema = z.object({
  legal_name: z.string().min(2).max(255).optional(),
  investor_status: z.nativeEnum(InvestorStatus).optional(),
  accreditation_status: z.nativeEnum(AccreditationStatus).optional(),
  risk_profile: z.string().optional(),
  primary_wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export const createWalletSchema = z.object({
  blockchain: z.string().default('ETHEREUM'),
  network: z.string().default('sepolia'),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM 0x hex wallet address format'),
  wallet_type: z.enum(['EOA', 'MULTISIG', 'SMART_CONTRACT', 'CUSTODIAL']).default('EOA'),
  is_primary: z.boolean().default(false),
});

export const createKycSchema = z.object({
  verification_type: z.string().default('KYC_INDIVIDUAL'),
  provider: z.string().default('SUMSUB'),
  risk_level: z.string().default('LOW'),
  verification_reference: z.string().min(5),
  notes: z.string().optional(),
  verified_at: z.string().optional(),
  expiry_at: z.string().optional(),
});

export const createAllocationSchema = z.object({
  idempotency_key: z.string().min(8),
  token_id: z.string().uuid(),
  investor_id: z.string().uuid(),
  token_amount: z.string().regex(/^\d+$/, 'token_amount must be a positive integer string'),
  allocation_price: z.number().positive(),
  allocation_currency: z.string().default('USD'),
});

export const createTransactionSchema = z.object({
  investor_id: z.string().uuid(),
  token_id: z.string().uuid(),
  transaction_type: z.nativeEnum(TransactionType),
  amount: z.number().nonnegative(),
  quantity: z.string().regex(/^\d+$/),
  blockchain: z.string().default('ETHEREUM'),
  network: z.string().default('sepolia'),
  wallet_from: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  wallet_to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid 32-byte transaction hash'),
  block_number: z.number().int().positive().optional(),
  transaction_status: z.nativeEnum(TransactionStatus).default(TransactionStatus.PENDING),
});
