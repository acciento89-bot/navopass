export const SCHEMA_STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_days integer NOT NULL DEFAULT 30`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    kind text NOT NULL DEFAULT 'PERSONAL' CHECK (kind IN ('PERSONAL','HOUSEHOLD','TEAM')),
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS workspaces_personal_owner_idx ON workspaces(owner_id) WHERE kind='PERSONAL'`,
  `CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces(owner_id)`,
  `CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('OWNER','ADMIN','EDITOR','VIEWER')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id,user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members(user_id)`,
  `CREATE TABLE IF NOT EXISTS workspace_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('ADMIN','EDITOR','VIEWER')),
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS workspace_invites_email_idx ON workspace_invites(email,accepted_at,expires_at)`,
  `CREATE INDEX IF NOT EXISTS workspace_invites_workspace_idx ON workspace_invites(workspace_id)`,
  `CREATE TABLE IF NOT EXISTS assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
    public_id text NOT NULL UNIQUE,
    name text NOT NULL,
    category text NOT NULL DEFAULT 'Sonstiges',
    manufacturer text,
    model text,
    serial_number text,
    purchase_date date,
    warranty_until date,
    next_service_date date,
    service_interval_months integer NOT NULL DEFAULT 12,
    location text,
    notes text,
    visibility text NOT NULL DEFAULT 'LINK' CHECK (visibility IN ('PRIVATE','LINK','PUBLIC')),
    favorite boolean NOT NULL DEFAULT false,
    archived_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS next_service_date date`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS service_interval_months integer NOT NULL DEFAULT 12`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS archived_at timestamptz`,
  `INSERT INTO workspaces (name,kind,owner_id)
    SELECT 'Persönlich','PERSONAL',u.id FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM workspaces w WHERE w.owner_id=u.id AND w.kind='PERSONAL'
    )
    ON CONFLICT DO NOTHING`,
  `INSERT INTO workspace_members (workspace_id,user_id,role)
    SELECT w.id,w.owner_id,'OWNER' FROM workspaces w
    ON CONFLICT (workspace_id,user_id) DO UPDATE SET role='OWNER'`,
  `UPDATE assets a SET workspace_id=w.id
    FROM workspaces w
    WHERE a.workspace_id IS NULL AND w.kind='PERSONAL' AND w.owner_id=a.owner_id`,
  `UPDATE assets a SET owner_id=w.owner_id FROM workspaces w WHERE a.workspace_id=w.id AND a.owner_id<>w.owner_id`,
  `CREATE INDEX IF NOT EXISTS assets_owner_id_idx ON assets(owner_id)`,
  `CREATE INDEX IF NOT EXISTS assets_workspace_idx ON assets(workspace_id)`,
  `CREATE INDEX IF NOT EXISTS assets_public_id_idx ON assets(public_id)`,
  `CREATE INDEX IF NOT EXISTS assets_owner_archived_idx ON assets(owner_id, archived_at)`,
  `CREATE INDEX IF NOT EXISTS assets_next_service_idx ON assets(owner_id, next_service_date)`,
  `CREATE TABLE IF NOT EXISTS asset_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    title text NOT NULL,
    event_type text NOT NULL DEFAULT 'NOTE',
    event_date date NOT NULL DEFAULT current_date,
    description text,
    provider text,
    cost_cents integer,
    is_public boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS asset_events_asset_id_idx ON asset_events(asset_id)`,
  `CREATE TABLE IF NOT EXISTS asset_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    title text NOT NULL,
    url text NOT NULL,
    kind text NOT NULL DEFAULT 'Dokument',
    is_public boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS asset_documents_asset_id_idx ON asset_documents(asset_id)`,
] as const;
