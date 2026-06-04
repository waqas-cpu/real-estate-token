import type {
  DigitalTwin,
  KYCRecord,
  OracleAttestation,
  RiskScore,
  ValuationSignal,
} from '../../../../src/lib/types/architecture.js';

export type AgentToolName =
  | 'get_oracle_attestations'
  | 'get_registry_encumbrances'
  | 'fetch_comparable_sales'
  | 'propose_fmv'
  | 'assess_risk_matrix'
  | 'screen_investor_kyc'
  | 'check_jurisdiction_rules';

export interface AgentRunContext {
  assetId: string;
  twin: DigitalTwin;
  attestations: OracleAttestation[];
  jurisdiction: string;
  investorWallet?: string;
  actorId: string;
}

export interface AgentStepRecord {
  stepIndex: number;
  toolName: AgentToolName;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown>;
  reasoning: string;
  durationMs: number;
}

export interface AgentRunResult {
  runId: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'FAILED';
  mode: 'AGENTIC';
  steps: AgentStepRecord[];
  valuation: ValuationSignal;
  riskScore: RiskScore;
  kyc?: KYCRecord;
  agentSummary: string;
  requiresHumanApproval: boolean;
}
