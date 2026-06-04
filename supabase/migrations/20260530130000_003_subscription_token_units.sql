/*
  # USDC subscriptions with token counts (platform economics)
*/

ALTER TABLE offering_subscriptions
  ADD COLUMN IF NOT EXISTS tokens_amount INTEGER CHECK (tokens_amount > 0),
  ADD COLUMN IF NOT EXISTS usdc_amount_micro TEXT,
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);

CREATE INDEX IF NOT EXISTS idx_offering_subscriptions_wallet
  ON offering_subscriptions(investor_wallet);
