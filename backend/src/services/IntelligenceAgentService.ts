import { runIntelligenceAgentLoop } from '../agents/intelligence/agentLoop.js';
import type { AgentRunContext } from '../agents/intelligence/types.js';
import type {
  DigitalTwin,
  KYCRecord,
  OracleAttestation,
  RiskScore,
  ValuationSignal,
} from '../../../src/lib/types/architecture.js';
import { getSupabaseAdmin } from '../supabase.js';
import { config } from '../config.js';
import { IntelligenceLayerOrchestrator } from '../../../src/lib/layers/IntelligenceLayer.js';

export class AgentApprovalRequiredError extends Error {
  readonly code = 'INTELLIGENCE_AGENT_PENDING_APPROVAL';

  constructor(
    message: string,
    public readonly runId: string
  ) {
    super(message);
    this.name = 'AgentApprovalRequiredError';
  }
}

export class IntelligenceAgentService {
  private deterministic = new IntelligenceLayerOrchestrator();

  async runForAsset(params: {
    assetId: string;
    twin: DigitalTwin;
    attestations: OracleAttestation[];
    actorId: string;
    jurisdiction?: string;
    investorWallet?: string;
    autoApprove?: boolean;
  }) {
    if (!config.intelligenceAgentMode) {
      const baseline = await this.deterministic.processAssetIntelligence(
        params.twin,
        params.attestations
      );
      return {
        mode: 'DETERMINISTIC' as const,
        ...baseline,
        runId: null,
        agentSummary: 'Deterministic intelligence (INTELLIGENCE_AGENT_MODE=false)',
        requiresHumanApproval: false,
        status: 'APPROVED' as const,
        steps: [],
      };
    }

    const ctx: AgentRunContext = {
      assetId: params.assetId,
      twin: params.twin,
      attestations: params.attestations,
      jurisdiction: params.jurisdiction ?? 'US',
      investorWallet: params.investorWallet,
      actorId: params.actorId,
    };

    const requireHumanApproval =
      !params.autoApprove && config.intelligenceRequireHumanApproval;

    const loopResult = await runIntelligenceAgentLoop(ctx, { requireHumanApproval });

    const supabase = getSupabaseAdmin();
    const { data: run, error: runErr } = await supabase
      .from('intelligence_agent_runs')
      .insert({
        asset_id: params.assetId,
        investor_wallet: params.investorWallet ?? null,
        jurisdiction: ctx.jurisdiction,
        status:
          loopResult.status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'APPROVED',
        mode: 'AGENTIC',
        proposed_valuation: loopResult.valuation,
        proposed_risk: loopResult.riskScore,
        proposed_kyc: loopResult.kyc ?? null,
        agent_summary: loopResult.agentSummary,
        llm_model: (loopResult as { llmModel?: string }).llmModel ?? null,
        created_by: params.actorId,
        approved_at:
          loopResult.status === 'APPROVED' ? new Date().toISOString() : null,
        approved_by: loopResult.status === 'APPROVED' ? params.actorId : null,
      })
      .select()
      .single();

    if (runErr) throw runErr;

    if (loopResult.steps.length > 0) {
      await supabase.from('intelligence_agent_steps').insert(
        loopResult.steps.map((s) => ({
          run_id: run.id,
          step_index: s.stepIndex,
          tool_name: s.toolName,
          tool_input: s.toolInput,
          tool_output: s.toolOutput,
          reasoning: s.reasoning,
          duration_ms: s.durationMs,
        }))
      );
    }

    return {
      runId: run.id as string,
      ...loopResult,
    };
  }

  async approveRun(runId: string, approverId: string, reject = false, reason?: string) {
    const supabase = getSupabaseAdmin();
    const { data: run, error } = await supabase
      .from('intelligence_agent_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error || !run) throw error ?? new Error('Agent run not found');

    if (run.status !== 'PENDING_APPROVAL') {
      throw new Error(`Run is ${run.status}, not pending approval`);
    }

    if (reject) {
      await supabase
        .from('intelligence_agent_runs')
        .update({
          status: 'REJECTED',
          rejection_reason: reason ?? 'Rejected by reviewer',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', runId);
      return { status: 'REJECTED' as const, runId };
    }

    await supabase
      .from('intelligence_agent_runs')
      .update({
        status: 'APPROVED',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return {
      status: 'APPROVED' as const,
      runId,
      valuation: run.proposed_valuation as ValuationSignal,
      riskScore: run.proposed_risk as RiskScore,
      kyc: run.proposed_kyc as KYCRecord | null,
      agentSummary: run.agent_summary as string,
    };
  }

  async getLatestRun(assetId: string) {
    const { data: run } = await getSupabaseAdmin()
      .from('intelligence_agent_runs')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!run) return null;

    const { data: steps } = await getSupabaseAdmin()
      .from('intelligence_agent_steps')
      .select('*')
      .eq('run_id', run.id)
      .order('step_index', { ascending: true });

    return { ...run, steps: steps ?? [] };
  }

  async getApprovedSignals(assetId: string): Promise<{
    valuation: ValuationSignal;
    riskScore: RiskScore;
    kyc?: KYCRecord;
    runId: string | null;
    agentSummary?: string;
  } | null> {
    const latest = await this.getLatestRun(assetId);
    if (!latest) return null;

    if (latest.status === 'APPROVED') {
      return {
        valuation: latest.proposed_valuation as ValuationSignal,
        riskScore: latest.proposed_risk as RiskScore,
        kyc: (latest.proposed_kyc as KYCRecord) ?? undefined,
        runId: latest.id as string,
        agentSummary: latest.agent_summary as string,
      };
    }

    if (
      latest.status === 'PENDING_APPROVAL' &&
      !config.intelligenceRequireHumanApproval
    ) {
      return {
        valuation: latest.proposed_valuation as ValuationSignal,
        riskScore: latest.proposed_risk as RiskScore,
        kyc: (latest.proposed_kyc as KYCRecord) ?? undefined,
        runId: latest.id as string,
      };
    }

    if (latest.status === 'PENDING_APPROVAL') {
      throw new AgentApprovalRequiredError(
        'Intelligence agent run awaiting human approval. POST /api/intelligence/agent/runs/:runId/approve',
        latest.id as string
      );
    }

    return null;
  }

  /** Fire-and-forget queue stub — runs agent in background */
  enqueueRun(params: Parameters<IntelligenceAgentService['runForAsset']>[0]) {
    const job = params;
    setImmediate(() => {
      this.runForAsset(job).catch((err) => {
        console.error('[IntelligenceAgent] background run failed:', err);
      });
    });
    return { queued: true, assetId: params.assetId };
  }

  async handleSumsubWebhook(payload: Record<string, unknown>) {
    const applicantId = String(
      (payload as { applicantId?: string }).applicantId ??
        (payload as { externalUserId?: string }).externalUserId ??
        ''
    );
    const review = (payload as { reviewResult?: { reviewAnswer?: string } }).reviewResult;
    const answer = review?.reviewAnswer ?? 'PENDING';
    const wallet = String((payload as { externalUserId?: string }).externalUserId ?? applicantId);

    await getSupabaseAdmin().from('sumsub_applicants').upsert(
      {
        applicant_id: applicantId || wallet,
        investor_wallet: wallet,
        review_status: String((payload as { type?: string }).type ?? 'review'),
        review_answer: answer,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'applicant_id' }
    );

    return { stored: true, applicantId, reviewAnswer: answer };
  }
}
