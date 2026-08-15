CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS next_service_date date;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS service_interval_months integer NOT NULL DEFAULT 12;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS assets_owner_id_idx ON assets(owner_id);
CREATE INDEX IF NOT EXISTS assets_public_id_idx ON assets(public_id);
CREATE INDEX IF NOT EXISTS assets_owner_archived_idx ON assets(owner_id, archived_at);
CREATE INDEX IF NOT EXISTS assets_next_service_idx ON assets(owner_id, next_service_date);

CREATE TABLE IF NOT EXISTS asset_events (
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
);
CREATE INDEX IF NOT EXISTS asset_events_asset_id_idx ON asset_events(asset_id);

CREATE TABLE IF NOT EXISTS asset_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  kind text NOT NULL DEFAULT 'Dokument',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_documents_asset_id_idx ON asset_documents(asset_id);
