-- ============================================
-- GridGuard — FINAL Database Fix
-- ============================================
-- Run this ONE TIME in Supabase SQL Editor.
-- Adds missing columns so the sync pipeline works.
-- ============================================

-- 1. Add missing 'area' column to district_history
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='district_history' AND column_name='area') THEN
        ALTER TABLE district_history ADD COLUMN area TEXT;
    END IF;
END $$;

-- 2. Add missing 'reason' column to district_history
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='district_history' AND column_name='reason') THEN
        ALTER TABLE district_history ADD COLUMN reason TEXT;
    END IF;
END $$;

-- 3. Backfill: copy 'cause' into 'reason' for any existing rows
UPDATE district_history SET reason = cause WHERE reason IS NULL AND cause IS NOT NULL;

-- 4. Backfill: copy 'district' into 'area' for any existing rows  
UPDATE district_history SET area = district WHERE area IS NULL AND district IS NOT NULL;

-- 5. Ensure RLS is disabled on all tables
ALTER TABLE district_history  DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_feed       DISABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_reports   DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers       DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users       DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_locations   DISABLE ROW LEVEL SECURITY;
ALTER TABLE blog_content      DISABLE ROW LEVEL SECURITY;
ALTER TABLE districts         DISABLE ROW LEVEL SECURITY;
ALTER TABLE predictions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs     DISABLE ROW LEVEL SECURITY;

-- 6. Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_dh_area   ON district_history (area);
CREATE INDEX IF NOT EXISTS idx_dh_reason ON district_history (reason);

-- ============================================
-- DONE! Now re-trigger the GitHub workflow.
-- ============================================
