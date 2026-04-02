-- ============================================
-- GridGuard — Full Data Reset
-- ============================================
-- Run this in your Supabase SQL Editor.
-- This will CLEAR all current outage history and feed data.
-- ============================================

-- 1. Truncate 'district_history' (All outage records)
TRUNCATE TABLE district_history RESTART IDENTITY CASCADE;

-- 2. Truncate 'system_feed' (Map sidebar events)
TRUNCATE TABLE system_feed RESTART IDENTITY CASCADE;

-- 3. Truncate 'citizen_reports' (User-reported outages)
TRUNCATE TABLE citizen_reports RESTART IDENTITY CASCADE;

-- 4. Truncate 'activity_logs' (Audit trail)
TRUNCATE TABLE activity_logs RESTART IDENTITY CASCADE;

-- ============================================
-- DONE! Your map should now be completely empty.
-- Proceed to run 'node fresh-sync.mjs' to repopulate.
-- ============================================
