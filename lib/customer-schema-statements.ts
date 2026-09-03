export const CUSTOMER_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS service_customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    contact_name text,
    email text,
    phone text,
    street text,
    postal_code text,
    city text,
    country text NOT NULL DEFAULT 'DE',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS service_customers_user_idx ON service_customers(user_id, name)`,
  `ALTER TABLE assets ADD COLUMN IF NOT EXISTS service_customer_id uuid REFERENCES service_customers(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS assets_service_customer_idx ON assets(service_customer_id)`,
] as const;
