-- ============================================
-- GridGuard — Supabase Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Project > SQL Editor > New Query > Paste & Run

-- 1. District History (outage records from EEU crawler + staff reports)
CREATE TABLE IF NOT EXISTS district_history (
  id BIGSERIAL PRIMARY KEY,
  district TEXT NOT NULL,
  subcity TEXT,
  cause TEXT,
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  type TEXT DEFAULT 'emergency',
  severity TEXT DEFAULT 'moderate',
  lat DOUBLE PRECISION DEFAULT 9.0,
  lng DOUBLE PRECISION DEFAULT 38.75,
  affected_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. System Feed (live activity log)
CREATE TABLE IF NOT EXISTS system_feed (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'grid_update',
  message TEXT NOT NULL,
  area TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- 3. Citizen Reports (user-submitted outage reports)
CREATE TABLE IF NOT EXISTS citizen_reports (
  id BIGSERIAL PRIMARY KEY,
  area TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'moderate',
  status TEXT DEFAULT 'pending',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  subcity TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Subscribers (email alert subscriptions)
CREATE TABLE IF NOT EXISTS subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  area TEXT,
  district TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Staff Users (staff/admin accounts)
CREATE TABLE IF NOT EXISTS staff_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'field_tech',
  email TEXT,
  failed_attempts INT DEFAULT 0,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Staff Locations (real-time location tracking)
CREATE TABLE IF NOT EXISTS staff_locations (
  id BIGSERIAL PRIMARY KEY,
  staff_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Blog Content (admin-published articles/news)
CREATE TABLE IF NOT EXISTS blog_content (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'announcement',
  body TEXT NOT NULL,
  created_by TEXT,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Insert default admin user (password: SWA@123)
INSERT INTO staff_users (username, password_hash, name, role, email)
VALUES ('admin', 'SWA@123', 'System Administrator', 'admin', 'admin@gridguard.et')
ON CONFLICT (username) DO NOTHING;

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_district_history_active ON district_history (end_time) WHERE end_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_district_history_district ON district_history (district);
CREATE INDEX IF NOT EXISTS idx_system_feed_timestamp ON system_feed (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_area ON citizen_reports (area);
CREATE INDEX IF NOT EXISTS idx_subscribers_district ON subscribers (district);
CREATE INDEX IF NOT EXISTS idx_blog_content_published ON blog_content (published) WHERE published = true;
