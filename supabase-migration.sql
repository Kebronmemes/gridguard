-- ============================================
-- GridGuard — SQL Migration: Fix Missing Columns
-- ============================================
-- Run this in your Supabase SQL Editor if you get "column not found" errors.

-- 1. Add missing 'status' column to 'citizen_reports'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='citizen_reports' AND column_name='status') THEN
        ALTER TABLE citizen_reports ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 2. Add missing security/login columns to 'staff_users'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_users' AND column_name='failed_attempts') THEN
        ALTER TABLE staff_users ADD COLUMN failed_attempts INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_users' AND column_name='last_login') THEN
        ALTER TABLE staff_users ADD COLUMN last_login TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Ensure RLS is disabled for these tables (so public can report)
ALTER TABLE citizen_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_feed DISABLE ROW LEVEL SECURITY;
ALTER TABLE district_history DISABLE ROW LEVEL SECURITY;

-- 4. Refresh PostgREST cache (Optional but helpful)
-- Note: You might need to click "Reload PostgREST" in Supabase Dashboard > API Settings if error persists.
