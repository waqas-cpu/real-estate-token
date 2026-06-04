import { Router } from 'express';
import { config } from '../config.js';
import { getDeploymentChecklist } from '../config/deploymentChecklist.js';
import { getSupabaseAdmin } from '../supabase.js';
import { assertSupabaseConfig } from '../config.js';

const router = Router();

/** Liveness — always 200 if process is up (K8s livenessProbe) */
router.get('/live', (_req, res) => {
  res.json({ alive: true });
});

router.get('/', (_req, res) => {
  res.json({
    service: 'rwa-real-estate-backend',
    version: '1.0.0',
    environment: config.nodeEnv,
    layers: ['DATA', 'INTELLIGENCE', 'SECURITY', 'EXECUTION'],
    smartContractDeploy: config.allowSmartContractDeploy
      ? 'env-enabled-still-manual'
      : 'blocked',
    productionGuides: [
      'ARCHITECTURE.md Part 5',
      'IMPLEMENTATION_GUIDE.md Phases 1-8',
      'DEPLOYMENT_READY.md',
    ],
  });
});

/** Kubernetes / load-balancer readiness (Phase 8 monitoring) */
router.get('/ready', async (_req, res) => {
  const checks: Record<string, boolean | string> = {
    server: true,
    supabase: false,
    smartContractGuard: !config.allowSmartContractDeploy,
  };

  try {
    assertSupabaseConfig();
    const { error } = await getSupabaseAdmin()
      .from('physical_assets')
      .select('id')
      .limit(1);
    checks.supabase = !error;
    if (error) checks.supabaseError = error.message;
  } catch (e) {
    checks.supabaseError = e instanceof Error ? e.message : 'not configured';
  }

  const ready = checks.server === true && checks.supabase === true;
  res.status(ready ? 200 : 503).json({ ready, checks });
});

/** ARCHITECTURE.md 8-phase deployment checklist with live status */
router.get('/deployment-checklist', (_req, res) => {
  const items = getDeploymentChecklist();
  const summary = {
    done: items.filter((i) => i.status === 'done').length,
    partial: items.filter((i) => i.status === 'partial').length,
    blocked: items.filter((i) => i.status === 'blocked').length,
    manual: items.filter((i) => i.status === 'manual').length,
    total: items.length,
  };
  res.json({
    source: 'ARCHITECTURE.md Part 5',
    implementationGuide: 'IMPLEMENTATION_GUIDE.md',
    summary,
    phases: [1, 2, 3, 4, 5, 6, 7, 8].map((phase) => ({
      phase,
      items: items.filter((i) => i.phase === phase),
    })),
  });
});

export default router;
