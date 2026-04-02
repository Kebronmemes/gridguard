-- ============================================
-- GridGuard — Subscriber Table Fix
-- ============================================
-- Run this in your Supabase SQL Editor.
-- Adds missing columns to the 'subscribers' table.
-- ============================================

-- 1. Add 'phone' column (TEXT)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='phone') THEN
        ALTER TABLE subscribers ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 2. Add 'preferences' column (JSONB)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='preferences') THEN
        ALTER TABLE subscribers ADD COLUMN preferences JSONB DEFAULT '{"outageDetected": true, "outageResolved": true, "maintenance": true}';
    END IF;
END $$;

-- 3. Add 'name' column if it's somehow missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='name') THEN
        ALTER TABLE subscribers ADD COLUMN name TEXT;
    END IF;
END $$;

-- 4. Create push_subscriptions table for browser/mobile alerts
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         BIGSERIAL PRIMARY KEY,
    endpoint   TEXT UNIQUE NOT NULL,
    auth       TEXT NOT NULL,
    p256dh     TEXT NOT NULL,
    area       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Disable RLS for new table
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DONE! Your subscription API will now work.
-- ============================================
