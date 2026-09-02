/**
 * LAYER 3: INVESTOR DATABASE SERVICE
 * ==================================
 * What it stores: Investor profile, jurisdiction, accreditation tier, KYC/KYB status.
 * Technology: PostgreSQL
 */

import { getSupabaseAdmin } from '../../supabase.js';
import type {
  InvestorProfile,
  CreateInvestorProfileInput,
  AccreditationStatus,
  KycStatus,
  KybStatus,
  AmlRiskRating,
  InvestorTier,
} from '../../../../src/lib/types/databaseLayers.js';

export class InvestorDatabaseService {
  private memoryInvestors: Map<string, InvestorProfile> = new Map();

  constructor() {
    this.seedDefaultInvestors();
  }

  private seedDefaultInvestors() {
    const demoWallets: Array<Partial<InvestorProfile> & { walletAddress: string; fullName: string }> = [
      {
        walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        fullName: 'Institutional Alpha Fund LP',
        email: 'compliance@alphafund.io',
        investorType: 'INSTITUTIONAL',
        primaryJurisdiction: 'US',
        taxIdNumber: 'EIN-12345678',
        taxClassification: 'W-9',
        accreditationStatus: 'QUALIFIED_PURCHASER',
        kycStatus: 'APPROVED',
        kybStatus: 'APPROVED',
        amlRiskRating: 'LOW',
        pepCheckPassed: true,
        sanctionsCheckPassed: true,
        totalInvestedUsd: 500000,
      },
      {
        walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        fullName: 'Elena Rostova',
        email: 'elena.rostova@familyoffice.ch',
        investorType: 'FAMILY_OFFICE',
        primaryJurisdiction: 'CH',
        taxIdNumber: 'CHE-998877',
        taxClassification: 'W-8BEN-E',
        accreditationStatus: 'ACCREDITED',
        kycStatus: 'APPROVED',
        kybStatus: 'APPROVED',
        amlRiskRating: 'LOW',
        pepCheckPassed: true,
        sanctionsCheckPassed: true,
        totalInvestedUsd: 250000,
      },
      {
        walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        fullName: 'Marcus Vance',
        email: 'marcus.vance@retail.com',
        investorType: 'INDIVIDUAL',
        primaryJurisdiction: 'GB',
        taxClassification: 'W-8BEN',
        accreditationStatus: 'RETAIL',
        kycStatus: 'PENDING',
        kybStatus: 'NOT_APPLICABLE',
        amlRiskRating: 'LOW',
        pepCheckPassed: true,
        sanctionsCheckPassed: true,
        totalInvestedUsd: 10000,
      },
    ];

    const now = new Date().toISOString();
    for (const inv of demoWallets) {
      const profile: InvestorProfile = {
        id: `inv-${inv.walletAddress.toLowerCase()}`,
        walletAddress: inv.walletAddress.toLowerCase(),
        fullName: inv.fullName,
        email: inv.email ?? null,
        investorType: inv.investorType ?? 'INDIVIDUAL',
        primaryJurisdiction: inv.primaryJurisdiction ?? 'US',
        taxIdNumber: inv.taxIdNumber ?? null,
        taxClassification: inv.taxClassification ?? 'W-9',
        accreditationStatus: inv.accreditationStatus ?? 'RETAIL',
        accreditationEvidenceRef: 'fixture://sec-edgar/verified',
        accreditationExpiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
        kycStatus: inv.kycStatus ?? 'APPROVED',
        kybStatus: inv.kybStatus ?? 'NOT_APPLICABLE',
        amlRiskRating: inv.amlRiskRating ?? 'LOW',
        pepCheckPassed: inv.pepCheckPassed ?? true,
        sanctionsCheckPassed: inv.sanctionsCheckPassed ?? true,
        totalInvestedUsd: inv.totalInvestedUsd ?? 0,
        createdAt: now,
        updatedAt: now,
      };
      this.memoryInvestors.set(profile.walletAddress, profile);
    }
  }

  /**
   * Register or update an investor profile.
   */
  async upsertInvestorProfile(input: CreateInvestorProfileInput): Promise<InvestorProfile> {
    const wallet = input.walletAddress.toLowerCase();
    const existing = this.memoryInvestors.get(wallet);
    const now = new Date().toISOString();

    const profile: InvestorProfile = {
      id: existing?.id ?? `inv-${wallet}`,
      walletAddress: wallet,
      fullName: input.fullName,
      email: input.email ?? existing?.email ?? null,
      investorType: input.investorType ?? existing?.investorType ?? 'INDIVIDUAL',
      primaryJurisdiction: input.primaryJurisdiction ?? existing?.primaryJurisdiction ?? 'US',
      taxIdNumber: input.taxIdNumber ?? existing?.taxIdNumber ?? null,
      taxClassification: input.taxClassification ?? existing?.taxClassification ?? 'W-9',
      accreditationStatus: input.accreditationStatus ?? existing?.accreditationStatus ?? 'RETAIL',
      accreditationEvidenceRef: input.accreditationEvidenceRef ?? existing?.accreditationEvidenceRef ?? null,
      accreditationExpiresAt: existing?.accreditationExpiresAt ?? new Date(Date.now() + 365 * 86400000).toISOString(),
      kycStatus: existing?.kycStatus ?? 'UNVERIFIED',
      kybStatus: existing?.kybStatus ?? (input.investorType === 'INSTITUTIONAL' ? 'PENDING' : 'NOT_APPLICABLE'),
      amlRiskRating: existing?.amlRiskRating ?? 'LOW',
      pepCheckPassed: existing?.pepCheckPassed ?? true,
      sanctionsCheckPassed: existing?.sanctionsCheckPassed ?? true,
      totalInvestedUsd: existing?.totalInvestedUsd ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.memoryInvestors.set(wallet, profile);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('investor_profiles').upsert({
        id: profile.id,
        wallet_address: profile.walletAddress,
        full_name: profile.fullName,
        email: profile.email,
        investor_type: profile.investorType,
        primary_jurisdiction: profile.primaryJurisdiction,
        tax_id_number: profile.taxIdNumber,
        tax_classification: profile.taxClassification,
        accreditation_status: profile.accreditationStatus,
        accreditation_evidence_ref: profile.accreditationEvidenceRef,
        accreditation_expires_at: profile.accreditationExpiresAt,
        kyc_status: profile.kycStatus,
        kyb_status: profile.kybStatus,
        aml_risk_rating: profile.amlRiskRating,
        pep_check_passed: profile.pepCheckPassed,
        sanctions_check_passed: profile.sanctionsCheckPassed,
        total_invested_usd: profile.totalInvestedUsd,
      });
    } catch {
      // Offline fallback
    }

    return profile;
  }

  /** Retrieve an investor profile by wallet address */
  async getInvestorByWallet(walletAddress: string): Promise<InvestorProfile | null> {
    const wallet = walletAddress.toLowerCase();
    if (this.memoryInvestors.has(wallet)) {
      return this.memoryInvestors.get(wallet)!;
    }

    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('investor_profiles')
        .select('*')
        .eq('wallet_address', wallet)
        .single();
      if (data) {
        const profile = this.mapDbToInvestor(data);
        this.memoryInvestors.set(wallet, profile);
        return profile;
      }
    } catch {
      // Offline fallback
    }

    return null;
  }

  /** Update accreditation status */
  async updateAccreditation(
    walletAddress: string,
    status: AccreditationStatus,
    evidenceRef?: string,
    validDays: number = 365
  ): Promise<InvestorProfile> {
    const wallet = walletAddress.toLowerCase();
    let profile = await this.getInvestorByWallet(wallet);

    if (!profile) {
      profile = await this.upsertInvestorProfile({
        walletAddress: wallet,
        fullName: 'Unknown Investor',
        primaryJurisdiction: 'US',
        accreditationStatus: status,
      });
    }

    profile.accreditationStatus = status;
    if (evidenceRef) profile.accreditationEvidenceRef = evidenceRef;
    profile.accreditationExpiresAt = new Date(Date.now() + validDays * 86400000).toISOString();
    profile.updatedAt = new Date().toISOString();

    this.memoryInvestors.set(wallet, profile);

    try {
      const supabase = getSupabaseAdmin();
      await supabase
        .from('investor_profiles')
        .update({
          accreditation_status: status,
          accreditation_evidence_ref: profile.accreditationEvidenceRef,
          accreditation_expires_at: profile.accreditationExpiresAt,
          updated_at: profile.updatedAt,
        })
        .eq('wallet_address', wallet);
    } catch {
      // Offline fallback
    }

    return profile;
  }

  /** Update KYC / KYB verification status */
  async updateKycStatus(
    walletAddress: string,
    kycStatus: KycStatus,
    kybStatus?: KybStatus,
    amlRating?: AmlRiskRating
  ): Promise<InvestorProfile> {
    const wallet = walletAddress.toLowerCase();
    let profile = await this.getInvestorByWallet(wallet);

    if (!profile) {
      profile = await this.upsertInvestorProfile({
        walletAddress: wallet,
        fullName: 'Unknown Investor',
        primaryJurisdiction: 'US',
      });
    }

    profile.kycStatus = kycStatus;
    if (kybStatus) profile.kybStatus = kybStatus;
    if (amlRating) profile.amlRiskRating = amlRating;
    profile.updatedAt = new Date().toISOString();

    this.memoryInvestors.set(wallet, profile);

    try {
      const supabase = getSupabaseAdmin();
      await supabase
        .from('investor_profiles')
        .update({
          kyc_status: kycStatus,
          kyb_status: profile.kybStatus,
          aml_risk_rating: profile.amlRiskRating,
          updated_at: profile.updatedAt,
        })
        .eq('wallet_address', wallet);
    } catch {
      // Offline fallback
    }

    return profile;
  }

  /** Query investors by criteria */
  async listInvestors(filter?: {
    jurisdiction?: string;
    accreditationStatus?: AccreditationStatus;
    kycStatus?: KycStatus;
    investorType?: InvestorTier;
  }): Promise<InvestorProfile[]> {
    let investors = Array.from(this.memoryInvestors.values());

    if (filter?.jurisdiction) {
      investors = investors.filter((i) => i.primaryJurisdiction.toUpperCase() === filter.jurisdiction!.toUpperCase());
    }
    if (filter?.accreditationStatus) {
      investors = investors.filter((i) => i.accreditationStatus === filter.accreditationStatus);
    }
    if (filter?.kycStatus) {
      investors = investors.filter((i) => i.kycStatus === filter.kycStatus);
    }
    if (filter?.investorType) {
      investors = investors.filter((i) => i.investorType === filter.investorType);
    }

    return investors;
  }

  private mapDbToInvestor(data: any): InvestorProfile {
    return {
      id: data.id,
      walletAddress: data.wallet_address,
      fullName: data.full_name,
      email: data.email,
      investorType: data.investor_type ?? 'INDIVIDUAL',
      primaryJurisdiction: data.primary_jurisdiction ?? 'US',
      taxIdNumber: data.tax_id_number,
      taxClassification: data.tax_classification ?? 'W-9',
      accreditationStatus: data.accreditation_status ?? 'RETAIL',
      accreditationEvidenceRef: data.accreditation_evidence_ref,
      accreditationExpiresAt: data.accreditation_expires_at,
      kycStatus: data.kyc_status ?? 'UNVERIFIED',
      kybStatus: data.kyb_status ?? 'NOT_APPLICABLE',
      amlRiskRating: data.aml_risk_rating ?? 'LOW',
      pepCheckPassed: !!data.pep_check_passed,
      sanctionsCheckPassed: !!data.sanctions_check_passed,
      totalInvestedUsd: Number(data.total_invested_usd || 0),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
