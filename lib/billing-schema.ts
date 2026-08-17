export const BILLING_SCHEMA_STATEMENTS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_price_id text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_event_created bigint NOT NULL DEFAULT 0`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_unique_idx ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_subscription_unique_idx ON users(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS stripe_events (
    id text PRIMARY KEY,
    type text NOT NULL,
    created bigint NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS stripe_events_processed_idx ON stripe_events(processed_at DESC)`,
] as const;
