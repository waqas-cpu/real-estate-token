-- Agentic intelligence layer — runs, tool traces, human approval

CREATE TABLE IF NOT EXISTS intelligence_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES physical_assets(id) ON DELETE CASCADE,
  investor_wallet TEXT,
  jurisdiction TEXT DEFAULT 'US',
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (
    status IN ('RUNNING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FAILED')
  ),
  mode TEXT NOT NULL DEFAULT 'AGENTIC' CHECK (mode IN ('AGENTIC', 'DETERMINISTIC')),
  proposed_valuation JSONB,
  proposed_risk JSONB,
  proposed_kyc JSONB,
  agent_summary TEXT,
  llm_model TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intelligence_agent_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES intelligence_agent_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  tool_input JSONB,
  tool_output JSONB,
  reasoning TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sumsub_applicants (
  applicant_id TEXT PRIMARY KEY,
  investor_wallet TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'init',
  review_answer TEXT,
  payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_intel_agent_runs_asset ON intelligence_agent_runs(asset_id);
CREATE INDEX idx_intel_agent_runs_status ON intelligence_agent_runs(status);
CREATE INDEX idx_intel_agent_steps_run ON intelligence_agent_steps(run_id);

ALTER TABLE intelligence_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_agent_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sumsub_applicants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent runs readable by authenticated"
  ON intelligence_agent_runs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Agent steps readable by authenticated"
  ON intelligence_agent_steps FOR SELECT TO authenticated USING (true);
