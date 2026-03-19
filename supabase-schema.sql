-- ============================================
-- GridGuard — COMPLETE Supabase Database Schema
-- ============================================
-- INSTRUCTIONS:
--   1. Go to https://supabase.com/dashboard
--   2. Select your project
--   3. Go to SQL Editor > New Query
--   4. Paste this ENTIRE file and click "Run"
--
-- ⚠️  This will DROP and recreate all tables.
--     If you have data you want to keep, back it up first.
-- ============================================

-- =====================
-- DROP existing tables
-- =====================
DROP TABLE IF EXISTS staff_locations CASCADE;
DROP TABLE IF EXISTS blog_content CASCADE;
DROP TABLE IF EXISTS subscribers CASCADE;
DROP TABLE IF EXISTS citizen_reports CASCADE;
DROP TABLE IF EXISTS system_feed CASCADE;
DROP TABLE IF EXISTS district_history CASCADE;
DROP TABLE IF EXISTS staff_users CASCADE;

-- =====================
-- 1. district_history
-- =====================
-- Stores all outage records from:
--   • EEU crawler (type='planned')
--   • Citizen auto-escalation (type='emergency')
--   • Staff manual creation
CREATE TABLE district_history (
  id            BIGSERIAL PRIMARY KEY,
  district      TEXT NOT NULL,
  subcity       TEXT,
  cause         TEXT,
  start_time    TIMESTAMPTZ DEFAULT now(),
  end_time      TIMESTAMPTZ,           -- NULL = still active
  type          TEXT DEFAULT 'planned', -- planned | emergency | maintenance
  severity      TEXT DEFAULT 'moderate',-- low | moderate | critical | grid_failure
  lat           DOUBLE PRECISION DEFAULT 9.0,
  lng           DOUBLE PRECISION DEFAULT 38.75,
  affected_count INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- 2. system_feed
-- =====================
-- Live activity log shown on the /map sidebar
CREATE TABLE system_feed (
  id        BIGSERIAL PRIMARY KEY,
  type      TEXT NOT NULL DEFAULT 'grid_update',
  message   TEXT NOT NULL,
  area      TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- 3. citizen_reports
-- =====================
-- User-submitted outage reports from the "Report Outage" button
CREATE TABLE citizen_reports (
  id          BIGSERIAL PRIMARY KEY,
  area        TEXT NOT NULL,
  description TEXT,
  severity    TEXT DEFAULT 'moderate',
  status      TEXT DEFAULT 'pending',   -- pending | verified | dismissed
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  subcity     TEXT,
  ip_hash     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- 4. subscribers
-- =====================
-- Email alert subscriptions
CREATE TABLE subscribers (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  area       TEXT,
  district   TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- 5. staff_users
-- =====================
-- Staff and admin login accounts
CREATE TABLE staff_users (
  id              BIGSERIAL PRIMARY KEY,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT DEFAULT 'field_tech', -- admin | field_tech | maintenance
  email           TEXT,
  failed_attempts INT DEFAULT 0,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- 6. staff_locations
-- =====================
-- Real-time location tracking for field staff
CREATE TABLE staff_locations (
  id         BIGSERIAL PRIMARY KEY,
  staff_id   TEXT NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- 7. blog_content
-- =====================
-- Admin-published articles, safety guides, news
CREATE TABLE blog_content (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  type       TEXT DEFAULT 'announcement',
  body       TEXT NOT NULL,
  created_by TEXT,
  published  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- 8. Default admin user
-- =====================
-- Username: admin | Password: SWA@123
INSERT INTO staff_users (username, password_hash, name, role, email)
VALUES ('admin', 'SWA@123', 'System Administrator', 'admin', 'admin@gridguard.et');

-- =====================
-- 9. Performance indexes
-- =====================
CREATE INDEX idx_dh_active     ON district_history (end_time) WHERE end_time IS NULL;
CREATE INDEX idx_dh_district   ON district_history (district);
CREATE INDEX idx_dh_start      ON district_history (start_time DESC);
CREATE INDEX idx_sf_timestamp  ON system_feed (timestamp DESC);
CREATE INDEX idx_cr_area       ON citizen_reports (area);
CREATE INDEX idx_cr_status     ON citizen_reports (status);
CREATE INDEX idx_sub_district  ON subscribers (district);
CREATE INDEX idx_blog_pub      ON blog_content (published) WHERE published = true;

-- =====================
-- 10. Disable Row Level Security
-- =====================
-- Required so the app can read/write without RLS policies
ALTER TABLE district_history  DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_feed       DISABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_reports   DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers       DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users       DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_locations   DISABLE ROW LEVEL SECURITY;
ALTER TABLE blog_content      DISABLE ROW LEVEL SECURITY;

-- ============================================
-- ✅ DONE — Your database is ready!
-- ============================================
