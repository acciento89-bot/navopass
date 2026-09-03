export const STICKER_ORDER_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS qr_sticker_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    quantity integer NOT NULL CHECK (quantity IN (5,10,25)),
    size_mm integer NOT NULL CHECK (size_mm IN (30,40)),
    material text NOT NULL DEFAULT 'OUTDOOR_MATTE' CHECK (material IN ('OUTDOOR_MATTE','OUTDOOR_GLOSS')),
    recipient_name text NOT NULL,
    company text,
    street text NOT NULL,
    postal_code text NOT NULL,
    city text NOT NULL,
    country text NOT NULL DEFAULT 'DE',
    note text,
    status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','CONFIRMED','IN_PRODUCTION','SHIPPED','CANCELLED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS qr_sticker_orders_user_idx ON qr_sticker_orders(user_id,created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS qr_sticker_orders_asset_idx ON qr_sticker_orders(asset_id,created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS qr_sticker_orders_status_idx ON qr_sticker_orders(status,created_at DESC)`,
] as const;
