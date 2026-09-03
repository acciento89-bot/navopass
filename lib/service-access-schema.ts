export const SERVICE_ACCESS_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS asset_service_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    email text NOT NULL,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    access_until timestamptz NOT NULL,
    created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS asset_service_invites_asset_idx ON asset_service_invites(asset_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS asset_service_invites_email_idx ON asset_service_invites(email, expires_at)`,
  `CREATE TABLE IF NOT EXISTS asset_service_grants (
    asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (asset_id,user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS asset_service_grants_user_idx ON asset_service_grants(user_id, expires_at)`,
  `CREATE INDEX IF NOT EXISTS asset_service_grants_asset_idx ON asset_service_grants(asset_id, expires_at)`,
] as const;
