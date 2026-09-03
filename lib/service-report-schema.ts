export const SERVICE_REPORT_SCHEMA_STATEMENTS = [
  `ALTER TABLE asset_events ADD COLUMN IF NOT EXISTS labor_minutes integer`,
  `ALTER TABLE asset_events ADD COLUMN IF NOT EXISTS parts_used text`,
  `ALTER TABLE asset_events ADD COLUMN IF NOT EXISTS measurements text`,
  `ALTER TABLE asset_events ADD COLUMN IF NOT EXISTS findings text`,
  `ALTER TABLE asset_events ADD COLUMN IF NOT EXISTS recommendation text`,
  `ALTER TABLE asset_events ADD COLUMN IF NOT EXISTS customer_name text`,
  `ALTER TABLE asset_events ADD COLUMN IF NOT EXISTS customer_signature text`,
  `ALTER TABLE asset_events ADD COLUMN IF NOT EXISTS customer_signed_at timestamptz`,
] as const;
