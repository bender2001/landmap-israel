-- ═══════════════════════════════════════════
-- Settings key-value table
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('platform_name', '"LandMap"'),
  ('contact_email', '"info@landmap.co.il"'),
  ('notify_new_lead', 'true'),
  ('notify_weekly_summary', 'false'),
  ('lead_auto_assign', 'false'),
  ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
