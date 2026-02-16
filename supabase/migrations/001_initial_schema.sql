-- ═══════════════════════════════════════════
-- LandMap Israel — Initial Database Schema
-- ═══════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Plots ───
CREATE TABLE plots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_number TEXT NOT NULL,
  number TEXT NOT NULL,
  city TEXT NOT NULL,
  size_sqm INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED', 'IN_PLANNING')),
  total_price INTEGER NOT NULL,
  tax_authority_value INTEGER,
  projected_value INTEGER,
  zoning_stage TEXT NOT NULL,
  ripeness TEXT,
  coordinates JSONB NOT NULL,
  documents JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  area_context TEXT,
  readiness_estimate TEXT,
  nearby_development TEXT,
  distance_to_sea INTEGER,
  distance_to_park INTEGER,
  distance_to_hospital INTEGER,
  density_units_per_dunam INTEGER,
  committees JSONB DEFAULT '{}'::jsonb,
  standard22 JSONB DEFAULT '{}'::jsonb,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Plot Documents ───
CREATE TABLE plot_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Plot Images ───
CREATE TABLE plot_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Points of Interest ───
CREATE TABLE points_of_interest (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  icon TEXT DEFAULT '📍',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Leads ───
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Chat Sessions ───
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_key TEXT NOT NULL UNIQUE,
  plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Activity Log ───
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════
CREATE INDEX idx_plots_status ON plots(status);
CREATE INDEX idx_plots_city ON plots(city);
CREATE INDEX idx_plots_published ON plots(is_published);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_plot ON leads(plot_id);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_chat_session_key ON chat_sessions(session_key);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- ═══════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_of_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Public read for published plots
CREATE POLICY "Public can read published plots" ON plots
  FOR SELECT USING (is_published = true);

-- Public read for documents of published plots
CREATE POLICY "Public can read plot documents" ON plot_documents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM plots WHERE plots.id = plot_documents.plot_id AND plots.is_published = true
  ));

-- Public read for images of published plots
CREATE POLICY "Public can read plot images" ON plot_images
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM plots WHERE plots.id = plot_images.plot_id AND plots.is_published = true
  ));

-- Public read for POIs
CREATE POLICY "Public can read POIs" ON points_of_interest
  FOR SELECT USING (true);

-- Public can insert leads
CREATE POLICY "Public can insert leads" ON leads
  FOR INSERT WITH CHECK (true);

-- Public can insert chat sessions
CREATE POLICY "Public can manage chat sessions" ON chat_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Service role has full access (bypasses RLS by default)
