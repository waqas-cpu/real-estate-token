import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  AgentApprovalRequiredError,
  IntelligenceAgentService,
} from '../services/IntelligenceAgentService.js';
import { PipelineService } from '../services/PipelineService.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();
const agent = new IntelligenceAgentService();
const pipeline = new PipelineService();

router.get('/agent/config', (_req, res) => {
  res.json({
    mode: 'AGENTIC',
    tools: [
      'get_oracle_attestations',
      'get_registry_encumbrances',
      'fetch_comparable_sales',
      'propose_fmv',
      'assess_risk_matrix',
      'screen_investor_kyc',
      'check_jurisdiction_rules',
    ],
    flow: [
      'POST /api/intelligence/agent/run/:assetId — autonomous tool loop + trace',
      'POST /api/intelligence/agent/queue/:assetId — background run',
      'POST /api/intelligence/agent/runs/:runId/approve — human gate before SECURITY',
      'GET /api/intelligence/agent/runs/:assetId — audit trace',
    ],
  });
});

router.post(
  '/agent/run/:assetId',
  optionalAuth,
  requireAuth,
  async (req, res, next) => {
    try {
      const body = z
        .object({
          jurisdiction: z.string().default('US'),
          investorWallet: z.string().optional(),
          autoApprove: z.boolean().optional(),
        })
        .parse(req.body ?? {});

      const result = await pipeline.runIntelligenceAgentOnly(
        req.params.assetId,
        req.user!.id,
        body
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/agent/queue/:assetId',
  optionalAuth,
  requireAuth,
  async (req, res, next) => {
    try {
      const body = z
        .object({
          jurisdiction: z.string().default('US'),
          investorWallet: z.string().optional(),
        })
        .parse(req.body ?? {});

      const queued = await pipeline.enqueueIntelligenceAgent(
        req.params.assetId,
        req.user!.id,
        body
      );
      res.status(202).json(queued);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/agent/runs/:assetId', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const run = await agent.getLatestRun(req.params.assetId);
    res.json({ run });
  } catch (err) {
    next(err);
  }
});

router.get('/agent/runs/:assetId/steps', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const latest = await agent.getLatestRun(req.params.assetId);
    if (!latest) {
      res.json({ steps: [] });
      return;
    }
    const { data, error } = await getSupabaseAdmin()
      .from('intelligence_agent_steps')
      .select('*')
      .eq('run_id', latest.id)
      .order('step_index', { ascending: true });

    if (error) throw error;
    res.json({ steps: data ?? [] });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/agent/runs/:runId/approve',
  optionalAuth,
  requireAuth,
  async (req, res, next) => {
    try {
      const body = z
        .object({
          reject: z.boolean().optional(),
          reason: z.string().optional(),
        })
        .parse(req.body ?? {});

      const approved = await agent.approveRun(
        req.params.runId,
        req.user!.id,
        body.reject,
        body.reason
      );

      if (approved.status === 'REJECTED') {
        res.json(approved);
        return;
      }

      const run = await getSupabaseAdmin()
        .from('intelligence_agent_runs')
        .select('asset_id, jurisdiction, investor_wallet')
        .eq('id', req.params.runId)
        .single();

      if (run.data) {
        const persisted = await pipeline.applyApprovedIntelligence(
          run.data.asset_id as string,
          req.user!.id,
          run.data.jurisdiction as string,
          (run.data.investor_wallet as string) ?? undefined
        );
        res.json({ approval: approved, persisted });
        return;
      }

      res.json({ approval: approved });
    } catch (err) {
      next(err);
    }
  }
);

export function handleAgentApprovalError(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AgentApprovalRequiredError) {
    res.status(409).json({
      code: err.code,
      error: err.message,
      runId: err.runId,
      action: `POST /api/intelligence/agent/runs/${err.runId}/approve`,
    });
    return;
  }
  next(err);
}

export default router;
