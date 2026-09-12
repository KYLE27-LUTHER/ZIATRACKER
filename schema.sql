CREATE TABLE IF NOT EXISTS guests (
  sync_key STRING NOT NULL,
  id STRING NOT NULL,
  name STRING NOT NULL,
  category STRING NOT NULL DEFAULT 'regular',
  plus_ones INT8 NOT NULL DEFAULT 0,
  on_final_list BOOL NOT NULL DEFAULT false,
  is_attending BOOL NOT NULL DEFAULT false,
  fee_paid BOOL NOT NULL DEFAULT false,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sync_key, id)
);

CREATE TABLE IF NOT EXISTS invitation_card_settings (
  sync_key STRING PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guests_sync_key_updated_idx ON guests (sync_key, updated_at DESC);
