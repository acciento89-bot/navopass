export const SECURITY_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS action_rate_limits (
    scope text NOT NULL,
    key_hash text NOT NULL,
    window_started_at timestamptz NOT NULL DEFAULT now(),
    hits integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (scope,key_hash)
  )`,
  `CREATE INDEX IF NOT EXISTS action_rate_limits_updated_idx ON action_rate_limits(updated_at)`,
] as const;
