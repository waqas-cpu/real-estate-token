/*
  # Execution layer extensions (off-chain primary market + governance votes)
  Per ARCHITECTURE.md token issuance flow steps 7-9
*/

CREATE TABLE IF NOT EXISTS offering_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID NOT NULL REFERENCES token_offerings(id) ON DELETE CASCADE,
  investor_wallet TEXT NOT NULL,
  amount_wei TEXT NOT NULL CHECK (amount_wei ~ '^[0-9]+$'),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONFIRMED', 'ALLOCATED', 'REFUNDED', 'CANCELLED')),
  allocated_tokens TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (offering_id, investor_wallet)
);

CREATE TABLE IF NOT EXISTS governance_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES governance_proposals(id) ON DELETE CASCADE,
  voter_wallet TEXT NOT NULL,
  support BOOLEAN NOT NULL,
  voting_power TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (proposal_id, voter_wallet)
);

CREATE INDEX idx_offering_subscriptions_offering ON offering_subscriptions(offering_id);
CREATE INDEX idx_governance_votes_proposal ON governance_votes(proposal_id);

ALTER TABLE offering_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscriptions readable by authenticated"
  ON offering_subscriptions FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Votes readable by authenticated"
  ON governance_votes FOR SELECT TO authenticated USING (TRUE);
