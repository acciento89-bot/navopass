export const SERVICE_WORKFLOW_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS service_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id uuid,
    asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    title text NOT NULL,
    scheduled_for timestamptz,
    notes text,
    status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','DONE','CANCELLED')),
    completed_event_id uuid REFERENCES asset_events(id) ON DELETE SET NULL,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS service_jobs_user_status_idx ON service_jobs(user_id,status,scheduled_for)`,
  `CREATE INDEX IF NOT EXISTS service_jobs_asset_idx ON service_jobs(asset_id,created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS service_jobs_customer_idx ON service_jobs(customer_id,created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS service_report_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES asset_events(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_email text NOT NULL,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    opened_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS service_report_shares_event_idx ON service_report_shares(event_id,created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS service_report_shares_expiry_idx ON service_report_shares(expires_at)`,
] as const;
