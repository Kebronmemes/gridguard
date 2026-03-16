-- GridGuard Supabase Initialization Schema
-- Run this script in the Supabase SQL Editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Staff Users Table
CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'maintenance')),
  email TEXT,
  failed_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Note: In production you should properly hash passwords. For this implementation, 
-- we will seed an admin account with the requested password.
INSERT INTO staff_users (username, password_hash, name, role, email) 
VALUES ('admin', 'SWA@123', 'System Admin', 'admin', 'admin@gridguard.et');

-- 2. Staff Locations Table
CREATE TABLE staff_locations (
  staff_id UUID PRIMARY KEY REFERENCES staff_users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. City/District Outage History & Classification
CREATE TABLE district_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district TEXT NOT NULL,
  subcity TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'critical', 'grid_failure')),
  type TEXT NOT NULL,
  cause TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ, -- If null, outage is active
  duration_minutes INTEGER,
  affected_count INTEGER DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast history querying by district
CREATE INDEX idx_district_history_district ON district_history(district);

-- 4. User Subscriptions (For Email Alerts)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  phone TEXT,
  location TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Citizen Reports
CREATE TABLE citizen_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'dismissed'))
);

-- 6. Content / Blog Engine
CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('blog', 'news', 'safety_guide', 'alert')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL, -- Name of the staff author
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. System Feed (Activity Log)
CREATE TABLE system_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  area TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Set Row Level Security (RLS) policies
-- (Assuming we will use Service Role Key for backend mutations safely hidden in Vercel Serverless Functions, 
-- we can keep RLS enabled but allow service_role to bypass it).
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_feed ENABLE ROW LEVEL SECURITY;

-- Create policy for Service Role to do everything (Serverless Backend)
CREATE POLICY "Service Role Full Access" ON staff_users USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access" ON staff_locations USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access" ON district_history USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access" ON subscriptions USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access" ON citizen_reports USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access" ON content_posts USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access" ON system_feed USING (true) WITH CHECK (true);
