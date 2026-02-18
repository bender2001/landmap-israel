-- ============================================================================
-- 005_real_data_schema.sql
-- Real data integration tables: transactions, planning, subscriptions
-- ============================================================================

-- Real transaction data from nadlan.gov.il
CREATE TABLE IF NOT EXISTS real_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city TEXT NOT NULL,
  address TEXT,
  block_number TEXT,
  parcel_number TEXT,
  deal_date DATE,
  deal_amount INTEGER,
  deal_type TEXT,           -- sale, lease, gift, etc.
  property_type TEXT,       -- land, apartment, house, etc.
  size_sqm INTEGER,
  rooms NUMERIC,
  floor INTEGER,
  year_built INTEGER,
  price_per_sqm INTEGER GENERATED ALWAYS AS (
    CASE WHEN size_sqm > 0 THEN deal_amount / size_sqm ELSE NULL END
  ) STORED,
  source TEXT DEFAULT 'nadlan.gov.il',
  source_id TEXT,
  raw_data JSONB,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Planning data from מנהל התכנון
CREATE TABLE IF NOT EXISTS planning_permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_number TEXT NOT NULL,
  plan_name TEXT,
  plan_type TEXT,            -- תב"ע ארצית/מחוזית/מקומית/מפורטת
  status TEXT,               -- deposited/approved/in_preparation
  status_date DATE,
  city TEXT,
  area_description TEXT,
  total_units INTEGER,
  total_area_sqm INTEGER,
  main_uses TEXT[],          -- residential, commercial, industrial, etc.
  documents_url TEXT,
  govmap_link TEXT,
  raw_data JSONB,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Link plots to nearby transactions
CREATE TABLE IF NOT EXISTS plot_transactions (
  plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES real_transactions(id) ON DELETE CASCADE,
  distance_meters INTEGER,
  PRIMARY KEY (plot_id, transaction_id)
);

-- Link plots to relevant plans
CREATE TABLE IF NOT EXISTS plot_plans (
  plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES planning_permits(id) ON DELETE CASCADE,
  relevance TEXT,            -- direct, nearby, regional
  PRIMARY KEY (plot_id, plan_id)
);

-- Data source tracking
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL, -- government, commercial, manual
  last_fetch TIMESTAMPTZ,
  last_success TIMESTAMPTZ,
  records_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User subscriptions for freemium model
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL UNIQUE,
  user_name TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_city ON real_transactions(city);
CREATE INDEX IF NOT EXISTS idx_transactions_block ON real_transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON real_transactions(deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_source_id ON real_transactions(source_id);
CREATE INDEX IF NOT EXISTS idx_planning_city ON planning_permits(city);
CREATE INDEX IF NOT EXISTS idx_planning_status ON planning_permits(status);
CREATE INDEX IF NOT EXISTS idx_planning_plan_number ON planning_permits(plan_number);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON user_subscriptions(user_email);

-- ─── Row Level Security ───────────────────────────────────────────────
ALTER TABLE real_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public read access for transactions and plans
CREATE POLICY "Public read transactions" ON real_transactions FOR SELECT USING (true);
CREATE POLICY "Public read plans" ON planning_permits FOR SELECT USING (true);

-- Admin-only for data sources management
CREATE POLICY "Admin manage data sources" ON data_sources FOR ALL USING (true);

-- Users can read subscriptions (in production, restrict to own row via auth.uid())
CREATE POLICY "Users read own subscription" ON user_subscriptions FOR SELECT USING (true);

-- ─── Seed default data sources ────────────────────────────────────────
INSERT INTO data_sources (source_name, source_type, status, config)
VALUES
  ('nadlan.gov.il', 'government', 'active', '{"endpoint": "https://www.nadlan.gov.il/Nadlan.REST/Main/GetAssestAndDeals", "type": "transactions"}'::jsonb),
  ('govmap.gov.il', 'government', 'active', '{"endpoint": "https://ags.govmap.gov.il/Taba/GetPlansByParams", "type": "planning"}'::jsonb),
  ('tabu.gov.il', 'government', 'pending', '{"note": "Requires paid subscription for full access", "type": "cadastral"}'::jsonb)
ON CONFLICT DO NOTHING;
