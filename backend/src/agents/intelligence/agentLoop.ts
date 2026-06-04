import { DEFAULT_AGENT_PLAN, executeAgentTool } from './tools.js';
import { synthesizeAgentSummary } from './llmClient.js';
import type { AgentRunContext, AgentRunResult, AgentStepRecord } from './types.js';
import type {
  KYCRecord,
  RiskScore,
  ValuationSignal,
} from '../../../../src/lib/types/architecture.js';
import { IntelligenceLayerOrchestrator } from '../../../../src/lib/layers/IntelligenceLayer.js';

const fallbackIntel = new IntelligenceLayerOrchestrator();

/**
 * Autonomous agent loop: plan → tool calls → synthesis (not a single deterministic formula).
 */
export async function runIntelligenceAgentLoop(
  ctx: AgentRunContext,
  options?: { plan?: typeof DEFAULT_AGENT_PLAN; requireHumanApproval?: boolean }
): Promise<Omit<AgentRunResult, 'runId'>> {
  const plan = options?.plan ?? DEFAULT_AGENT_PLAN;
  const prior: Record<string, unknown> = {};
  const steps: AgentStepRecord[] = [];

  for (let i = 0; i < plan.length; i++) {
    const tool = plan[i]!;
    const started = Date.now();
    const { output, reasoning } = await executeAgentTool(tool, ctx, prior);
    prior[tool] = output;
    steps.push({
      stepIndex: i,
      toolName: tool,
      toolInput: { assetId: ctx.assetId, jurisdiction: ctx.jurisdiction },
      toolOutput: output,
      reasoning,
      durationMs: Date.now() - started,
    });

    if (
      tool === 'screen_investor_kyc' &&
      (output as { blocked?: boolean }).blocked
    ) {
      throw new Error('AGENT_KYC_BLOCKED: Sumsub RED — compliance escalation required');
    }
  }

  const fmvOut = prior.propose_fmv as { valuation?: ValuationSignal } | undefined;
  const riskOut = prior.assess_risk_matrix as { riskScore?: RiskScore } | undefined;
  const kycOut = prior.screen_investor_kyc as { kyc?: KYCRecord } | undefined;

  let valuation = fmvOut?.valuation;
  let riskScore = riskOut?.riskScore;

  if (!valuation || !riskScore) {
    const baseline = await fallbackIntel.processAssetIntelligence(
      ctx.twin,
      ctx.attestations
    );
    valuation = valuation ?? baseline.valuation;
    riskScore = riskScore ?? baseline.riskScore;
  }

  const { summary, model } = await synthesizeAgentSummary(
    ctx.assetId,
    steps,
    valuation.fmv,
    Math.round(riskScore.composite)
  );

  const requireHumanApproval = options?.requireHumanApproval ?? true;

  return {
    status: requireHumanApproval ? 'PENDING_APPROVAL' : 'APPROVED',
    mode: 'AGENTIC',
    steps,
    valuation,
    riskScore,
    kyc: kycOut?.kyc,
    agentSummary: summary,
    requiresHumanApproval: requireHumanApproval,
    ...(model ? { llmModel: model } : {}),
  } as Omit<AgentRunResult, 'runId'> & { llmModel?: string };
}
