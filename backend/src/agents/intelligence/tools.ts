import { IntelligenceLayerOrchestrator } from '../../../../src/lib/layers/IntelligenceLayer.js';
import type { AgentRunContext, AgentToolName } from './types.js';
import type {
  KYCRecord,
  RiskScore,
  ValuationSignal,
} from '../../../../src/lib/types/architecture.js';
import { config } from '../../config.js';
import { getSupabaseAdmin } from '../../supabase.js';
import { fetchComparableSales } from '../../../../src/lib/integrations/mlsComps.js';

const legacyIntel = new IntelligenceLayerOrchestrator();

export interface ToolResult {
  output: Record<string, unknown>;
  reasoning: string;
}

export async function executeAgentTool(
  tool: AgentToolName,
  ctx: AgentRunContext,
  prior: Record<string, unknown>
): Promise<ToolResult> {
  switch (tool) {
    case 'get_oracle_attestations':
      return {
        output: {
          count: ctx.attestations.length,
          valid: ctx.attestations.filter(
            (a) => a.confidence >= 0.75 && a.expiresAt > new Date()
          ),
          sources: [...new Set(ctx.attestations.map((a) => a.source))],
        },
        reasoning:
          'Collected oracle quorum signals for FMV and market context before revision.',
      };

    case 'get_registry_encumbrances': {
      const enc = ctx.twin.encumbrances ?? [];
      const titleLen = ctx.twin.titleChain?.length ?? 0;
      return {
        output: { encumbrances: enc, titleChainLength: titleLen, schema: ctx.twin.schema },
        reasoning:
          'Loaded land-registry encumbrances and title chain depth for credit/operational risk.',
      };
    }

    case 'fetch_comparable_sales': {
      const schema = ctx.twin.schema as Record<string, unknown>;
      const physical = (schema.physical as Record<string, number>) ?? {};
      const location = (schema.location as { lat?: number; lng?: number }) ?? {};
      const result = await fetchComparableSales({
        lat: location.lat ?? 51.5,
        lng: location.lng ?? -0.12,
        squareFeet: physical.squareFeet ?? 1500,
        assetId: ctx.assetId,
      });
      return {
        output: {
          comps: result.comps,
          medianCompPrice: result.medianCompPrice,
          method: result.method,
          dataSource: result.dataSource,
        },
        reasoning: `Comparable sales via ${result.dataSource} (${result.method}).`,
      };
    }

    case 'propose_fmv': {
      const comps = prior.fetch_comparable_sales as { medianCompPrice?: number } | undefined;
      const baseline = await legacyIntel.processAssetIntelligence(ctx.twin, ctx.attestations);
      let fmv = baseline.valuation.fmv;
      if (comps?.medianCompPrice) {
        fmv = Math.round((fmv + comps.medianCompPrice) / 2);
      }
      const margin = fmv * 0.08;
      const valuation: ValuationSignal = {
        ...baseline.valuation,
        fmv,
        confidenceInterval: [fmv - margin, fmv + margin],
        method: 'AGENTIC_HEDONIC_COMPS_ORACLE',
        modelVersion: 'agent-1.0.0',
        computedAt: new Date(),
      };
      return {
        output: { valuation },
        reasoning: `Revised FMV to ${fmv} USD blending hedonic baseline, comps median, and ${ctx.attestations.length} oracle feeds.`,
      };
    }

    case 'assess_risk_matrix': {
      const encCount = ((prior.get_registry_encumbrances as { encumbrances?: unknown[] })?.encumbrances ??
        []) as unknown[];
      const baseline = await legacyIntel.processAssetIntelligence(ctx.twin, ctx.attestations);
      const risk = { ...baseline.riskScore };
      if (encCount.length > 2) {
        risk.creditRisk = Math.max(40, risk.creditRisk - 15);
        risk.operationalRisk = Math.max(40, risk.operationalRisk - 10);
      }
      risk.composite = Math.round(
        risk.creditRisk * 0.35 +
          risk.liquidityRisk * 0.25 +
          risk.operationalRisk * 0.2 +
          risk.jurisdictionalRisk * 0.2
      );
      return {
        output: { riskScore: risk },
        reasoning: `Agent adjusted risk for ${encCount.length} encumbrances and jurisdiction ${ctx.jurisdiction}.`,
      };
    }

    case 'screen_investor_kyc': {
      if (!ctx.investorWallet) {
        return {
          output: { skipped: true },
          reasoning: 'No investor wallet in context — KYC deferred to SECURITY step.',
        };
      }
      let sumsub: Record<string, unknown> | null = null;
      if (config.supabaseUrl && config.supabaseServiceKey) {
        const { data } = await getSupabaseAdmin()
          .from('sumsub_applicants')
          .select('*')
          .eq('investor_wallet', ctx.investorWallet)
          .maybeSingle();
        sumsub = data;
      }

      if (sumsub?.review_answer === 'GREEN') {
        const { kyc } = await legacyIntel.processInvestor(ctx.investorWallet, ctx.jurisdiction);
        return {
          output: { kyc, sumsubStatus: 'GREEN', provider: 'SUMSUB' },
          reasoning: 'Sumsub GREEN — investor cleared for accredited transfer rules.',
        };
      }

      if (sumsub?.review_answer === 'RED') {
        return {
          output: { kyc: null, sumsubStatus: 'RED', blocked: true },
          reasoning: 'Sumsub RED — agent escalates to compliance review.',
        };
      }

      const { kyc } = await legacyIntel.processInvestor(ctx.investorWallet, ctx.jurisdiction);
      return {
        output: {
          kyc,
          sumsubStatus: sumsub?.review_status ?? 'pending',
          provider: sumsub ? 'SUMSUB' : 'STUB',
        },
        reasoning:
          sumsub
            ? 'Awaiting Sumsub webhook final status — using provisional KYC stub.'
            : 'No Sumsub applicant — stub KYC until webhook or manual review.',
      };
    }

    case 'check_jurisdiction_rules': {
      const { rules } = await legacyIntel.processInvestor(
        ctx.investorWallet ?? '0x0000000000000000000000000000000000000000',
        ctx.jurisdiction
      );
      return {
        output: { rules },
        reasoning: `Mapped compliance rules for jurisdiction ${ctx.jurisdiction}.`,
      };
    }

    default:
      return { output: {}, reasoning: 'Unknown tool' };
  }
}

export const DEFAULT_AGENT_PLAN: AgentToolName[] = [
  'get_oracle_attestations',
  'get_registry_encumbrances',
  'fetch_comparable_sales',
  'propose_fmv',
  'assess_risk_matrix',
  'screen_investor_kyc',
  'check_jurisdiction_rules',
];
