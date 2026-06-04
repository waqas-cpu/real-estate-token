import { DataLayerOrchestrator } from '../../../src/lib/layers/DataLayer';
import { IntelligenceLayerOrchestrator } from '../../../src/lib/layers/IntelligenceLayer';
import { SecurityLayerOrchestrator } from '../../../src/lib/layers/SecurityLayer';
import { crossGate } from '../../../src/lib/gates/integrationGates';
import type { DigitalTwin, OracleAttestation } from '../../../src/lib/types/architecture';
import { getSupabaseAdmin } from '../supabase.js';
import {
  ExecutionService,
  type DeployNetwork,
} from './ExecutionService.js';
import {
  AgentApprovalRequiredError,
  IntelligenceAgentService,
} from './IntelligenceAgentService.js';
import type { KYCRecord, RiskScore, ValuationSignal } from '../../../src/lib/types/architecture';
import { config } from '../config.js';
import { TwinAnchorService } from './TwinAnchorService.js';
import { AccreditationService } from './regulatory/AccreditationService.js';
import { getTestnetZkVerifierAddress } from '../integrations/blockchain.js';
import {
  signL2SettlementIntent,
  resolveL2Network,
  L2_CHAIN_IDS,
} from '../../../src/lib/crypto/pqc/l2Settlement.js';

export { AgentApprovalRequiredError };

export type RegistryType = 'HM_LAND_REGISTRY' | 'TORRENS' | 'CADASTER';

export interface FullPipelineOptions {
  registryType: RegistryType;
  referenceId: string;
  createdBy: string;
  investorWallet: string;
  jurisdiction: string;
  symbol: string;
  userConfirmedEconomics: boolean;
  userConfirmedDeploy?: boolean;
  network?: DeployNetwork;
  /** Skip human approval gate for intelligence agent (smoke/tests only) */
  autoApproveIntelligence?: boolean;
}

export class PipelineService {
  private dataLayer = new DataLayerOrchestrator();
  private intelligenceLayer = new IntelligenceLayerOrchestrator();
  private intelligenceAgent = new IntelligenceAgentService();
  private securityLayer = new SecurityLayerOrchestrator();
  private executionLayer = new ExecutionService();
  private twinAnchor = new TwinAnchorService();
  private accreditation = new AccreditationService();

  async ingestAsset(
    registryType: RegistryType,
    referenceId: string,
    createdBy: string
  ) {
    const { asset, twin, attestations } = await this.dataLayer.ingestAsset(
      registryType,
      referenceId
    );

    const twinForGate = { ...twin, verified: true };

    const boundary = await crossGate({
      fromLayer: 'DATA',
      toLayer: 'INTELLIGENCE',
      data: {
        asset,
        twin: twinForGate,
        oracleAttestations: attestations,
      },
      actor: createdBy,
      timestamp: new Date(),
    });

    const supabase = getSupabaseAdmin();

    const { data: dbAsset, error: assetError } = await supabase
      .from('physical_assets')
      .insert({
        address: asset.address,
        title: asset.title,
        latitude: asset.lat,
        longitude: asset.lng,
        square_feet: asset.squareFeet,
        bedrooms: asset.bedrooms,
        bathrooms: asset.bathrooms,
        year_built: asset.yearBuilt,
        registry_source: asset.registrySource,
        content_hash: asset.contentHash,
        verified: false,
        created_by: createdBy,
      })
      .select()
      .single();

    if (assetError) throw assetError;

    const assetId = dbAsset.id as string;

    await supabase.from('digital_twins').insert({
      asset_id: assetId,
      cid: twin.cid,
      version: twin.version,
      schema: twin.schema,
      title_chain: twin.titleChain,
      encumbrances: twin.encumbrances,
      valuation_history: twin.valuationHistory,
      attestation_quorum: twin.attestationQuorum,
      updated_by: createdBy,
    });

    const anchorMeta = await this.twinAnchor.registerPendingAnchor(assetId, twin, createdBy);

    await supabase.from('oracle_attestations').insert(
      attestations.map((att) => ({
        asset_id: assetId,
        source: att.source,
        data_type: att.dataType,
        value: att.value,
        confidence: att.confidence,
        signature_ml_dsa: att.signatureML_DSA,
        expires_at: att.expiresAt.toISOString(),
        verified: true,
      }))
    );

    await supabase.from('layer_boundaries').insert({
      source_layer: boundary.sourceLayer,
      target_layer: boundary.targetLayer,
      data_hash: boundary.dataHash,
      gate_name: boundary.gateName,
      rules_applied: boundary.rulesApplied,
      all_passed: boundary.allPassed,
    });

    return {
      assetId,
      asset: dbAsset,
      twinCid: twin.cid,
      attestationCount: attestations.length,
      gate: boundary,
      twinAnchor: anchorMeta,
    };
  }

  private async loadAssetContext(assetId: string) {
    const supabase = getSupabaseAdmin();
    const { data: assetRow, error: assetErr } = await supabase
      .from('physical_assets')
      .select('*')
      .eq('id', assetId)
      .single();
    if (assetErr || !assetRow) throw assetErr ?? new Error('Asset not found');

    const { data: twinRow } = await supabase
      .from('digital_twins')
      .select('*')
      .eq('asset_id', assetId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: attRows } = await supabase
      .from('oracle_attestations')
      .select('*')
      .eq('asset_id', assetId);

    return {
      twin: this.toDigitalTwin(twinRow, assetId),
      attestations: (attRows ?? []).map((row) => this.toAttestation(row, assetId)),
    };
  }

  async runIntelligenceAgentOnly(
    assetId: string,
    actorId: string,
    opts: { jurisdiction?: string; investorWallet?: string; autoApprove?: boolean }
  ) {
    const { twin, attestations } = await this.loadAssetContext(assetId);
    return this.intelligenceAgent.runForAsset({
      assetId,
      twin,
      attestations,
      actorId,
      jurisdiction: opts.jurisdiction,
      investorWallet: opts.investorWallet,
      autoApprove: opts.autoApprove ?? config.intelligenceAutoApprove,
    });
  }

  async enqueueIntelligenceAgent(
    assetId: string,
    actorId: string,
    opts: { jurisdiction?: string; investorWallet?: string }
  ) {
    const { twin, attestations } = await this.loadAssetContext(assetId);
    return this.intelligenceAgent.enqueueRun({
      assetId,
      twin,
      attestations,
      actorId,
      jurisdiction: opts.jurisdiction,
      investorWallet: opts.investorWallet,
    });
  }

  async applyApprovedIntelligence(
    assetId: string,
    actorId: string,
    jurisdiction: string,
    investorWallet?: string
  ) {
    const signals = await this.intelligenceAgent.getApprovedSignals(assetId);
    if (!signals) {
      throw new Error('No approved intelligence run for this asset');
    }
    return this.persistIntelligence(
      assetId,
      actorId,
      jurisdiction,
      signals.valuation,
      signals.riskScore,
      signals.kyc,
      investorWallet
    );
  }

  async processIntelligence(
    assetId: string,
    actorId: string,
    jurisdiction = 'US',
    investorWallet?: string,
    autoApprove?: boolean
  ) {
    const { twin, attestations } = await this.loadAssetContext(assetId);

    const agentResult = await this.intelligenceAgent.runForAsset({
      assetId,
      twin,
      attestations,
      actorId,
      jurisdiction,
      investorWallet,
      autoApprove: autoApprove ?? config.intelligenceAutoApprove,
    });

    if (
      agentResult.status === 'PENDING_APPROVAL' &&
      config.intelligenceRequireHumanApproval &&
      agentResult.runId
    ) {
      throw new AgentApprovalRequiredError(
        'Agentic intelligence complete — approve before continuing pipeline',
        agentResult.runId
      );
    }

    return this.persistIntelligence(
      assetId,
      actorId,
      jurisdiction,
      agentResult.valuation,
      agentResult.riskScore,
      'kyc' in agentResult ? agentResult.kyc : undefined,
      investorWallet,
      agentResult.runId
        ? {
            runId: agentResult.runId,
            agentSummary: agentResult.agentSummary,
            steps: agentResult.steps,
          }
        : undefined
    );
  }

  private async persistIntelligence(
    assetId: string,
    actorId: string,
    jurisdiction: string,
    valuation: ValuationSignal,
    riskScore: RiskScore,
    agentKyc?: KYCRecord,
    investorWallet?: string,
    agentMeta?: { runId: string; agentSummary?: string; steps?: unknown[] }
  ) {
    const supabase = getSupabaseAdmin();

    const kycRecord = {
      accreditated: agentKyc?.accreditated ?? true,
      amlClearedAt: agentKyc?.amlClearedAt ?? new Date(),
      amlExpiresAt:
        agentKyc?.amlExpiresAt ??
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };

    const boundary = await crossGate({
      fromLayer: 'INTELLIGENCE',
      toLayer: 'SECURITY',
      data: {
        riskScore,
        valuation: { ...valuation, computedAt: valuation.computedAt ?? new Date() },
        jurisdiction,
        kycRecord,
      },
      actor: actorId,
      timestamp: new Date(),
    });

    await supabase.from('valuations').insert({
      asset_id: assetId,
      fmv: valuation.fmv,
      confidence_low: valuation.confidenceInterval[0],
      confidence_high: valuation.confidenceInterval[1],
      method: valuation.method,
      factors: valuation.factors,
      model_version: valuation.modelVersion,
      expires_at: valuation.expiresAt.toISOString(),
    });

    await supabase.from('risk_scores').insert({
      asset_id: assetId,
      credit_risk: riskScore.creditRisk,
      liquidity_risk: riskScore.liquidityRisk,
      operational_risk: riskScore.operationalRisk,
      jurisdictional_risk: riskScore.jurisdictionalRisk,
      composite: Math.round(riskScore.composite),
    });

    await supabase.from('layer_boundaries').insert({
      source_layer: boundary.sourceLayer,
      target_layer: boundary.targetLayer,
      data_hash: boundary.dataHash,
      gate_name: boundary.gateName,
      rules_applied: boundary.rulesApplied,
      all_passed: boundary.allPassed,
    });

    await supabase
      .from('physical_assets')
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq('id', assetId);

    return {
      valuation,
      riskScore,
      gate: boundary,
      intelligence: {
        mode: config.intelligenceAgentMode ? 'AGENTIC' : 'DETERMINISTIC',
        runId: agentMeta?.runId ?? null,
        agentSummary: agentMeta?.agentSummary,
        stepCount: agentMeta?.steps?.length ?? 0,
      },
    };
  }

  async processSecurityForInvestor(
    investorWallet: string,
    jurisdiction: string,
    actorId: string
  ) {
    const supabase = getSupabaseAdmin();
    const { kyc, rules } = await this.intelligenceLayer.processInvestor(
      investorWallet,
      jurisdiction
    );

    const keys = await this.securityLayer.processSecuritySetup();
    const acc = await this.accreditation.checkAccreditation(
      investorWallet,
      jurisdiction
    );
    if (!acc.accredited && config.networkProfile.name === 'mainnet') {
      throw new Error('Investor failed accreditation registry check');
    }

    let credential = await this.securityLayer.zkEngine.issueZKCredential(kyc, 'COMPOSITE');
    const zkVerifier = getTestnetZkVerifierAddress();
    if (zkVerifier) {
      credential = { ...credential, verifierContractAddr: zkVerifier };
    }

    const auditEvent = await this.securityLayer.auditManager.recordAuditEvent(
      'KYC_AND_KEYS_READY',
      actorId,
      'SECURITY',
      { investorWallet, jurisdiction },
      this.securityLayer.keyManager
    );

    const boundary = await crossGate({
      fromLayer: 'SECURITY',
      toLayer: 'EXECUTION',
      data: {
        signingKeys: [keys.signingKey],
        zkCredential: credential,
        auditEvents: [auditEvent],
        recoveryModule: { status: 'CLOSED' },
      },
      actor: actorId,
      timestamp: new Date(),
    });

    await supabase.from('kyc_records').upsert(
      {
        investor_wallet: kyc.investorWallet,
        accreditated: kyc.accreditated,
        jurisdictions: kyc.jurisdictions,
        aml_cleared_at: kyc.amlClearedAt.toISOString(),
        aml_expires_at: kyc.amlExpiresAt.toISOString(),
        zk_commitment_hash: kyc.zk_commitmentHash,
        zk_verifier_circuit: kyc.zk_verifierCircuit,
      },
      { onConflict: 'investor_wallet' }
    );

    for (const rule of rules) {
      await supabase.from('compliance_rules').upsert(
        {
          jurisdiction: rule.jurisdiction,
          applicable_standards: rule.applicableStandards,
          transfer_restrictions: rule.transferRestrictions,
          disclosure_requirements: rule.disclosureRequirements,
        },
        { onConflict: 'jurisdiction' }
      );
    }

    await supabase.from('crypto_keys').insert([
      {
        algorithm: keys.signingKey.algorithm,
        purpose: keys.signingKey.purpose,
        key_shares: keys.signingKey.keyShares,
        rotates_at: keys.signingKey.rotatesAt.toISOString(),
        hsm_location: keys.signingKey.hsmLocation,
        public_key_hash: keys.signingKey.publicKeyHash,
      },
      {
        algorithm: keys.encapsulationKey.algorithm,
        purpose: keys.encapsulationKey.purpose,
        key_shares: keys.encapsulationKey.keyShares,
        rotates_at: keys.encapsulationKey.rotatesAt.toISOString(),
        hsm_location: keys.encapsulationKey.hsmLocation,
        public_key_hash: keys.encapsulationKey.publicKeyHash,
      },
    ]);

    await supabase.from('zk_credentials').insert({
      investor_wallet: credential.investorWallet,
      proof_type: credential.proofType,
      circuit_id: credential.circuitID,
      commitment: credential.commitment,
      expires_at: credential.expiresAt.toISOString(),
      verifier_contract_addr: credential.verifierContractAddr,
      verified: false,
    });

    await supabase.from('audit_events').insert({
      event_type: auditEvent.eventType,
      layer: auditEvent.layer,
      actor: actorId,
      details: { investorWallet, jurisdiction },
      signature_ml_dsa: auditEvent.signature,
    });

    await supabase.from('layer_boundaries').insert({
      source_layer: boundary.sourceLayer,
      target_layer: boundary.targetLayer,
      data_hash: boundary.dataHash,
      gate_name: boundary.gateName,
      rules_applied: boundary.rulesApplied,
      all_passed: boundary.allPassed,
    });

    return { kyc, credential, keys, gate: boundary };
  }

  /** Layer 5 — on-chain registry + EXECUTION→DATA feedback (after SECURITY→EXECUTION gate). */
  async processExecution(
    assetId: string,
    actorId: string,
    opts: {
      symbol: string;
      investorWallet: string;
      userConfirmedEconomics: boolean;
      userConfirmedDeploy?: boolean;
      network?: DeployNetwork;
    }
  ) {
    const signingPair = this.securityLayer.keyManager.getSigningKeyPair();
    const publicKeyEnc = this.securityLayer.keyManager.getSigningPublicKeyEnc();
    let l2Settlement: {
      network: string;
      chainId: number;
      intentHash: string;
      signatureML_DSA: string;
      publicKeyEnc: string;
    } | undefined;

    if (signingPair && publicKeyEnc) {
      const network = resolveL2Network(opts.network);
      const signed = signL2SettlementIntent(
        {
          version: 1,
          network,
          chainId: L2_CHAIN_IDS[network],
          assetId,
          symbol: opts.symbol,
          investorWallet: opts.investorWallet,
          action: 'REGISTER_TOKEN',
          contractAddress: null,
          nonce: `${assetId}-${Date.now()}`,
          issuedAt: new Date().toISOString(),
        },
        signingPair
      );
      l2Settlement = {
        network,
        chainId: L2_CHAIN_IDS[network],
        intentHash: signed.intentHash,
        signatureML_DSA: signed.signatureML_DSA,
        publicKeyEnc,
      };
    }

    return this.executionLayer.completeExecutionFromPipeline({
      assetId,
      symbol: opts.symbol,
      creatorId: actorId,
      investorWallet: opts.investorWallet,
      userConfirmedEconomics: opts.userConfirmedEconomics,
      userConfirmedDeploy: opts.userConfirmedDeploy,
      network: opts.network,
      l2Settlement,
    });
  }

  /**
   * Full stack: DATA → INTELLIGENCE → SECURITY → EXECUTION (+ EXECUTION→DATA).
   */
  async runFullPipeline(options: FullPipelineOptions) {
    const ingest = await this.ingestAsset(
      options.registryType,
      options.referenceId,
      options.createdBy
    );
    const intelligence = await this.processIntelligence(
      ingest.assetId,
      options.createdBy,
      options.jurisdiction,
      options.investorWallet,
      options.autoApproveIntelligence
    );
    const security = await this.processSecurityForInvestor(
      options.investorWallet,
      options.jurisdiction,
      options.createdBy
    );
    const execution = await this.processExecution(ingest.assetId, options.createdBy, {
      symbol: options.symbol,
      investorWallet: options.investorWallet,
      userConfirmedEconomics: options.userConfirmedEconomics,
      userConfirmedDeploy: options.userConfirmedDeploy,
      network: options.network,
    });

    return {
      assetId: ingest.assetId,
      layers: {
        data: ingest,
        intelligence,
        security,
        execution,
      },
      gatesCrossed: [
        ingest.gate.gateName,
        intelligence.gate.gateName,
        security.gate.gateName,
        execution.feedbackGate.gateName,
      ],
      onChainLinked: execution.onChain.linked,
    };
  }

  /** @deprecated Use runFullPipeline for all 4 layers including EXECUTION */
  async runFullOffChainPipeline(
    registryType: RegistryType,
    referenceId: string,
    createdBy: string,
    investorWallet: string,
    jurisdiction: string
  ) {
    const ingest = await this.ingestAsset(registryType, referenceId, createdBy);
    const intelligence = await this.processIntelligence(
      ingest.assetId,
      createdBy,
      jurisdiction
    );
    const security = await this.processSecurityForInvestor(
      investorWallet,
      jurisdiction,
      createdBy
    );
    return {
      assetId: ingest.assetId,
      ingest,
      intelligence,
      security,
      execution: {
        status: 'SKIPPED',
        message:
          'Use POST /api/assets/pipeline with symbol + userConfirmedEconomics: true for Layer 5 EXECUTION',
      },
    };
  }

  private toDigitalTwin(row: Record<string, unknown> | null, assetId: string): DigitalTwin {
    if (!row) {
      throw new Error('Digital twin not found for asset');
    }
    return {
      id: String(row.id),
      assetId,
      cid: String(row.cid),
      version: Number(row.version ?? 1),
      schema: (row.schema as Record<string, unknown>) ?? {},
      titleChain: [],
      encumbrances: [],
      valuationHistory: [],
      lastUpdated: new Date(),
      attestationQuorum: Number(row.attestation_quorum ?? 2),
    };
  }

  private toAttestation(row: Record<string, unknown>, assetId: string): OracleAttestation {
    return {
      id: String(row.id),
      assetId,
      source: row.source as OracleAttestation['source'],
      dataType: row.data_type as OracleAttestation['dataType'],
      value: String(row.value),
      confidence: Number(row.confidence),
      signedAt: new Date(String(row.signed_at ?? row.created_at)),
      signatureML_DSA: String(row.signature_ml_dsa),
      expiresAt: new Date(String(row.expires_at)),
    };
  }
}
