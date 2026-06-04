import { Router } from 'express';
import { z } from 'zod';
import { PipelineService } from '../services/PipelineService.js';
import {
  TokenEconomicsService,
  TokenEconomicsGuardError,
} from '../services/TokenEconomicsService.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const pipeline = new PipelineService();
const economicsSvc = new TokenEconomicsService();

const ingestSchema = z.object({
  registryType: z.enum(['HM_LAND_REGISTRY', 'TORRENS', 'CADASTER']),
  referenceId: z.string().min(1),
});

const fullPipelineSchema = z.object({
  registryType: z.enum(['HM_LAND_REGISTRY', 'TORRENS', 'CADASTER']),
  referenceId: z.string().min(1),
  investorWallet: z.string().min(1),
  jurisdiction: z.string().default('US'),
  symbol: z.string().min(2).max(12),
  userConfirmedEconomics: z.literal(true),
  userConfirmedDeploy: z.literal(true).optional(),
  network: z.enum(['localhost', 'sepolia', 'mainnet']).optional(),
});

const executionOnlySchema = z.object({
  symbol: z.string().min(2).max(12),
  investorWallet: z.string().min(1),
  userConfirmedEconomics: z.literal(true),
  userConfirmedDeploy: z.literal(true).optional(),
  network: z.enum(['localhost', 'sepolia', 'mainnet']).optional(),
});

router.get('/pipeline/flow', (_req, res) => {
  res.json({
    layers: [
      { layer: 'DATA', endpoint: 'POST /api/assets/ingest', gateOut: 'GATE_DATA_INTEL' },
      {
        layer: 'INTELLIGENCE',
        endpoint: 'POST /api/assets/:assetId/intelligence',
        agentic: 'POST /api/intelligence/agent/run/:assetId',
        gateOut: 'GATE_INTEL_SECURITY',
        humanApproval: 'POST /api/intelligence/agent/runs/:runId/approve',
      },
      {
        layer: 'SECURITY',
        note: 'Runs inside full pipeline via processSecurityForInvestor',
        gateOut: 'GATE_SECURITY_EXEC',
      },
      {
        layer: 'EXECUTION',
        endpoint: 'POST /api/assets/:assetId/execution or POST /api/assets/pipeline',
        gateOut: 'GATE_EXEC_DATA',
        onChain: 'ERC-3643 T-REX — auto-links contracts/deployments/sepolia.json',
      },
    ],
    fullPipeline: 'POST /api/assets/pipeline',
    economicsPolicy: economicsSvc.getPlatformPolicy(),
    deployPolicy: {
      requiresEnv: 'ALLOW_SMART_CONTRACT_DEPLOY=true',
      optionalBody: 'userConfirmedDeploy: true',
    },
  });
});

router.post('/pipeline', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = fullPipelineSchema.parse(req.body);
    const result = await pipeline.runFullPipeline({
      registryType: body.registryType,
      referenceId: body.referenceId,
      createdBy: req.user!.id,
      investorWallet: body.investorWallet,
      jurisdiction: body.jurisdiction,
      symbol: body.symbol,
      userConfirmedEconomics: body.userConfirmedEconomics,
      userConfirmedDeploy: body.userConfirmedDeploy,
      network: body.network,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof TokenEconomicsGuardError) {
      res.status(403).json({ code: err.code, error: err.message });
      return;
    }
    next(err);
  }
});

router.post('/ingest', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = ingestSchema.parse(req.body);
    const result = await pipeline.ingestAsset(
      body.registryType,
      body.referenceId,
      req.user!.id
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:assetId/intelligence',
  optionalAuth,
  requireAuth,
  async (req, res, next) => {
    try {
      const jurisdiction =
        typeof req.body?.jurisdiction === 'string' ? req.body.jurisdiction : 'US';
      const result = await pipeline.processIntelligence(
        req.params.assetId,
        req.user!.id,
        jurisdiction
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:assetId/execution',
  optionalAuth,
  requireAuth,
  async (req, res, next) => {
    try {
      const body = executionOnlySchema.parse(req.body);
      const result = await pipeline.processExecution(req.params.assetId, req.user!.id, {
        symbol: body.symbol,
        investorWallet: body.investorWallet,
        userConfirmedEconomics: body.userConfirmedEconomics,
        userConfirmedDeploy: body.userConfirmedDeploy,
        network: body.network,
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof TokenEconomicsGuardError) {
        res.status(403).json({ code: err.code, error: err.message });
        return;
      }
      next(err);
    }
  }
);

export default router;
