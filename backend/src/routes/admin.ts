import { Router } from 'express';
import { z } from 'zod';
import { ExecutionService } from '../services/ExecutionService.js';
import { TokenEconomicsGuardError, TokenEconomicsService } from '../services/TokenEconomicsService.js';
import { MultiSigAdminService } from '../services/MultiSigAdminService.js';
import { EmergencyService } from '../services/EmergencyService.js';
import { TransactionMonitoringService } from '../services/monitoring/TransactionMonitoringService.js';
import { ImmutableAuditService } from '../services/audit/ImmutableAuditService.js';
import { PropertySpvVerificationService } from '../services/database/PropertySpvVerificationService.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../config/platformTokenEconomics.js';
import { getSupabaseAdmin } from '../supabase.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireCompliance, requireEmergencyOperator } from '../middleware/rbac.js';

const router = Router();
const execution = new ExecutionService();
const economicsSvc = new TokenEconomicsService();
const multisigSvc = new MultiSigAdminService();
const emergencySvc = new EmergencyService();
const monitoringSvc = new TransactionMonitoringService();
const auditSvc = new ImmutableAuditService();
const propertyVerifSvc = new PropertySpvVerificationService();

// ============================================================================
// TOKEN & ASSET CORE ROUTES
// ============================================================================

router.get('/tokens', async (_req, res, next) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('security_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ tokens: data ?? [] });
  } catch (err) {
    next(err);
  }
});

router.get('/verifications', async (_req, res, next) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('physical_assets')
      .select('*')
      .eq('verified', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ pending: data ?? [] });
  } catch (err) {
    next(err);
  }
});

const tokenizeSchema = z.object({
  assetId: z.string().uuid(),
  symbol: z.string().min(2).max(12),
  totalSupply: z
    .string()
    .optional()
    .default(String(PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply)),
  decimals: z.number().int().optional().default(PLATFORM_TOKEN_ECONOMICS.tokenDecimals),
  complianceModules: z
    .array(z.string())
    .optional()
    .default(['MaxBalanceModule:10PercentPerInvestor', 'CountryRestrict', 'USDC']),
  contractAddress: z.string().optional(),
  trexIdentityRegistry: z.string().optional(),
  userConfirmedEconomics: z.literal(true),
});

/** Register token metadata — does NOT deploy contracts unless you supply contractAddress. */
router.post('/tokenize', optionalAuth, requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = tokenizeSchema.parse(req.body);
    const econ = await economicsSvc.buildEconomicsForAsset(body.assetId);
    const token = await execution.registerTokenMetadata({
      assetId: body.assetId,
      symbol: body.symbol,
      totalSupply: body.totalSupply,
      decimals: body.decimals,
      creatorId: req.user!.id,
      complianceModules: body.complianceModules,
      contractAddress: body.contractAddress,
      trexIdentityRegistry: body.trexIdentityRegistry,
      userConfirmedEconomics: body.userConfirmedEconomics,
    });
    res.status(201).json({
      token,
      economics: econ,
      deploymentNote: body.contractAddress
        ? 'Registered with your deployed contract address.'
        : 'Pending on-chain deployment — contract_address is a placeholder until you deploy and update.',
      economicsNote: `Fixed ${PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply} tokens · USDC price ${econ.tokenPriceDisplay}`,
    });
  } catch (err) {
    if (err instanceof TokenEconomicsGuardError) {
      res.status(403).json({
        code: err.code,
        error: err.message,
        hint: 'GET /api/token-economics/policy',
      });
      return;
    }
    next(err);
  }
});

// ============================================================================
// 3. MULTISIG ADMINISTRATION
// ============================================================================

router.post('/multisig/proposals', optionalAuth, requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      multisigContractAddress: z.string().min(1),
      destination: z.string().min(1),
      value: z.string().optional(),
      data: z.string().optional(),
      description: z.string().min(3),
      requiredConfirmations: z.number().int().min(1).max(10).optional(),
    });

    const body = schema.parse(req.body);
    const proposal = await multisigSvc.propose({
      ...body,
      proposer: req.user!.id,
    });
    res.status(201).json({ success: true, proposal });
  } catch (err) {
    next(err);
  }
});

router.post('/multisig/proposals/:id/confirm', optionalAuth, requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      signature: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const proposal = await multisigSvc.confirm(req.params.id, req.user!.id, body.signature);
    res.json({ success: true, proposal });
  } catch (err) {
    next(err);
  }
});

router.post('/multisig/proposals/:id/execute', optionalAuth, requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const proposal = await multisigSvc.execute(req.params.id, req.user!.id);
    res.json({ success: true, proposal });
  } catch (err) {
    next(err);
  }
});

router.get('/multisig/proposals', optionalAuth, requireAuth, async (_req, res, next) => {
  try {
    const proposals = await multisigSvc.listProposals();
    res.json({ proposals });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 4. EMERGENCY PAUSE / FREEZE
// ============================================================================

router.post('/emergency/pause', optionalAuth, requireAuth, requireEmergencyOperator, async (req, res, next) => {
  try {
    const schema = z.object({
      offeringAddress: z.string().min(1),
      reason: z.string().min(3),
    });
    const body = schema.parse(req.body);
    const result = await emergencySvc.pauseOffering(body.offeringAddress, body.reason, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/emergency/unpause', optionalAuth, requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      offeringAddress: z.string().min(1),
    });
    const body = schema.parse(req.body);
    const result = await emergencySvc.unpauseOffering(body.offeringAddress, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/emergency/freeze-wallet', optionalAuth, requireAuth, requireEmergencyOperator, async (req, res, next) => {
  try {
    const schema = z.object({
      tokenAddress: z.string().min(1),
      walletAddress: z.string().min(1),
      reason: z.string().min(3),
    });
    const body = schema.parse(req.body);
    const result = await emergencySvc.freezeWallet(body.tokenAddress, body.walletAddress, body.reason, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/emergency/unfreeze-wallet', optionalAuth, requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      tokenAddress: z.string().min(1),
      walletAddress: z.string().min(1),
    });
    const body = schema.parse(req.body);
    const result = await emergencySvc.unfreezeWallet(body.tokenAddress, body.walletAddress, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/emergency/status', optionalAuth, async (_req, res) => {
  res.json(emergencySvc.getStatus());
});

// ============================================================================
// 6. PROPERTY / SPV VERIFICATION
// ============================================================================

router.get('/property-verification/:propertyId', optionalAuth, async (req, res, next) => {
  try {
    const dossier = await propertyVerifSvc.getVerificationDossier(req.params.propertyId);
    res.json({ dossier });
  } catch (err) {
    next(err);
  }
});

router.post('/property-verification/:propertyId/verify-stage', optionalAuth, requireAuth, requireCompliance, async (req, res, next) => {
  try {
    const schema = z.object({
      stageNumber: z.number().int().min(1).max(5),
      notes: z.string().min(2),
    });
    const body = schema.parse(req.body);
    const dossier = await propertyVerifSvc.verifyStage(
      req.params.propertyId,
      body.stageNumber,
      body.notes,
      req.user!.id
    );
    res.json({ success: true, dossier });
  } catch (err) {
    next(err);
  }
});

router.post('/property-verification/:propertyId/auto-verify', optionalAuth, requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      spvName: z.string().default('Kensington Real Estate SPV LLC'),
    });
    const body = schema.parse(req.body);
    const dossier = await propertyVerifSvc.runFullAutomatedVerification(
      req.params.propertyId,
      body.spvName,
      req.user!.id
    );
    res.json({ success: true, dossier });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 9. TRANSACTION MONITORING (AML / CFT)
// ============================================================================

router.post('/monitoring/evaluate', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      txHash: z.string().min(1),
      walletAddress: z.string().min(1),
      amountUsd: z.number().positive(),
      destinationAddress: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const evaluation = monitoringSvc.evaluateTransaction(body);
    res.json(evaluation);
  } catch (err) {
    next(err);
  }
});

router.get('/monitoring/alerts', optionalAuth, requireAuth, requireCompliance, async (_req, res) => {
  res.json({ alerts: monitoringSvc.listAlerts() });
});

router.post('/monitoring/alerts/:id/resolve', optionalAuth, requireAuth, requireCompliance, async (req, res, next) => {
  try {
    const schema = z.object({
      resolution: z.enum(['DISMISSED', 'FROZEN_CONFIRMED']),
    });
    const body = schema.parse(req.body);
    const resolved = monitoringSvc.resolveAlert(req.params.id, body.resolution, req.user!.id);
    res.json({ success: true, alert: resolved });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 10. IMMUTABLE AUDIT TRAIL
// ============================================================================

router.get('/audit/verify-chain', optionalAuth, requireAuth, requireCompliance, async (_req, res) => {
  const result = auditSvc.verifyChainIntegrity();
  res.json(result);
});

router.post('/audit/record', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      layer: z.enum(['DATA', 'INTELLIGENCE', 'SECURITY', 'EXECUTION']),
      eventType: z.string().min(2),
      details: z.record(z.any()),
    });
    const body = schema.parse(req.body);
    const entry = await auditSvc.recordEvent(body.layer, req.user!.id, body.eventType, body.details);
    res.status(201).json({ success: true, entry });
  } catch (err) {
    next(err);
  }
});

router.get('/audit/trail', optionalAuth, requireAuth, requireCompliance, async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  res.json({ trail: auditSvc.getRecentEvents(limit) });
});

export default router;
