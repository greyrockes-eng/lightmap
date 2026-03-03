-- ============================================
-- LIGHTMAP DATABASE SCHEMA
-- Run this in Supabase SQL Editor (supabase.com/dashboard → SQL Editor)
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LIGHTS TABLE — Core content
-- ============================================
CREATE TABLE public.lights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message TEXT NOT NULL CHECK (char_length(message) <= 280),
  category TEXT NOT NULL CHECK (category IN ('kindness', 'encouragement', 'peace', 'relief')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  city TEXT,
  country TEXT NOT NULL,
  country_code TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_approved BOOLEAN DEFAULT true,
  boost_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for real-time feed queries
CREATE INDEX idx_lights_created_at ON public.lights (created_at DESC);
CREATE INDEX idx_lights_category ON public.lights (category);
CREATE INDEX idx_lights_approved ON public.lights (is_approved) WHERE is_approved = true;

-- ============================================
-- ARCS TABLE — Encouragement connections
-- ============================================
CREATE TABLE public.arcs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message TEXT NOT NULL CHECK (char_length(message) <= 280),
  from_lat DOUBLE PRECISION NOT NULL,
  from_lng DOUBLE PRECISION NOT NULL,
  from_city TEXT,
  from_country TEXT NOT NULL,
  to_lat DOUBLE PRECISION NOT NULL,
  to_lng DOUBLE PRECISION NOT NULL,
  to_city TEXT,
  to_country TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_arcs_created_at ON public.arcs (created_at DESC);

-- ============================================
-- DAILY STATS TABLE — Aggregated metrics
-- ============================================
CREATE TABLE public.daily_stats (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  total_lights INTEGER DEFAULT 0,
  total_arcs INTEGER DEFAULT 0,
  total_countries INTEGER DEFAULT 0,
  brightness_pct DOUBLE PRECISION DEFAULT 0.0
);

-- ============================================
-- FLAGGED CONTENT TABLE — Community moderation
-- ============================================
CREATE TABLE public.flags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  light_id UUID REFERENCES public.lights(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES public.arcs(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (light_id IS NOT NULL OR arc_id IS NOT NULL)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.lights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

-- LIGHTS: Anyone can read approved lights
CREATE POLICY "Anyone can read approved lights"
  ON public.lights FOR SELECT
  USING (is_approved = true);

-- LIGHTS: Anyone can insert (anonymous posting allowed for MVP)
CREATE POLICY "Anyone can add a light"
  ON public.lights FOR INSERT
  WITH CHECK (true);

-- LIGHTS: Users can update their own lights
CREATE POLICY "Users can update own lights"
  ON public.lights FOR UPDATE
  USING (auth.uid() = user_id);

-- ARCS: Anyone can read
CREATE POLICY "Anyone can read arcs"
  ON public.arcs FOR SELECT
  USING (true);

-- ARCS: Anyone can insert
CREATE POLICY "Anyone can send encouragement"
  ON public.arcs FOR INSERT
  WITH CHECK (true);

-- DAILY STATS: Anyone can read
CREATE POLICY "Anyone can read stats"
  ON public.daily_stats FOR SELECT
  USING (true);

-- FLAGS: Anyone can report
CREATE POLICY "Anyone can flag content"
  ON public.flags FOR INSERT
  WITH CHECK (true);

-- ============================================
-- REALTIME — Enable for live updates
-- ============================================

-- This makes lights and arcs broadcast to all connected clients in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.lights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.arcs;

-- ============================================
-- FUNCTION: Update daily stats (run on a schedule or trigger)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_daily_stats()
RETURNS void AS $$
BEGIN
  INSERT INTO public.daily_stats (date, total_lights, total_arcs, total_countries, brightness_pct)
  VALUES (
    CURRENT_DATE,
    (SELECT COUNT(*) FROM public.lights WHERE is_approved = true AND created_at::date = CURRENT_DATE),
    (SELECT COUNT(*) FROM public.arcs WHERE created_at::date = CURRENT_DATE),
    (SELECT COUNT(DISTINCT country) FROM public.lights WHERE is_approved = true AND created_at::date = CURRENT_DATE),
    LEAST(100.0, (SELECT COUNT(DISTINCT country) FROM public.lights WHERE is_approved = true) / 195.0 * 100)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_lights = EXCLUDED.total_lights,
    total_arcs = EXCLUDED.total_arcs,
    total_countries = EXCLUDED.total_countries,
    brightness_pct = EXCLUDED.brightness_pct;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AUTO-HIDE: When a light gets 3+ flags, hide it
-- ============================================
CREATE OR REPLACE FUNCTION public.check_flags()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.light_id IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM public.flags WHERE light_id = NEW.light_id) >= 3 THEN
      UPDATE public.lights SET is_approved = false WHERE id = NEW.light_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_flags
  AFTER INSERT ON public.flags
  FOR EACH ROW
  EXECUTE FUNCTION public.check_flags();
