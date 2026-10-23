/** Additive receipt table only. Existing history/events and account semantics are unchanged. */
export const SERVICE_DRAFT_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS mobile_service_draft_receipts (
    actor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    draft_id uuid NOT NULL,
    revision integer NOT NULL CHECK (revision BETWEEN 1 AND 1000000),
    digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
    event_id uuid REFERENCES asset_events(id) ON DELETE SET NULL,
    asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    accepted_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (actor_id, draft_id, revision)
  )`,
] as const;
