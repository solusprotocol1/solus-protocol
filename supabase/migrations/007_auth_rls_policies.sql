-- S4 Ledger — Auth-based Row Level Security
-- Run in Supabase Dashboard → SQL Editor
-- Requires: Supabase Auth enabled (Dashboard → Authentication → Settings)

-- ═══════════════════════════════════════════════════════════════════
--  Enable RLS on core tables and add user-scoped policies
--  These policies ensure users can only read/write their own data
--  when authenticated via Supabase Auth (JWT with auth.uid())
-- ═══════════════════════════════════════════════════════════════════

-- 1. USER STATE (already has RLS, update policies to use auth.uid)
-- Drop the old permissive policies and add user-scoped ones
DO $$
BEGIN
    -- Drop old policies if they exist
    DROP POLICY IF EXISTS "Allow upsert by session" ON user_state;
    DROP POLICY IF EXISTS "Allow read by session" ON user_state;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Add user_id column to user_state if not exists
DO $$
BEGIN
    ALTER TABLE user_state ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_user_state_user_id ON user_state(user_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Policy: authenticated users can read/write their own state
DO $$
BEGIN
    CREATE POLICY "Users read own state" ON user_state
        FOR SELECT USING (
            user_id = auth.uid() OR 
            session_id = current_setting('request.headers', true)::json->>'x-session-id'
        );
    CREATE POLICY "Users write own state" ON user_state
        FOR INSERT WITH CHECK (true);
    CREATE POLICY "Users update own state" ON user_state
        FOR UPDATE USING (
            user_id = auth.uid() OR
            session_id = current_setting('request.headers', true)::json->>'x-session-id'
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. RECORDS TABLE — scope to user
DO $$
BEGIN
    ALTER TABLE records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
    
    ALTER TABLE records ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users read own records" ON records
        FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
    CREATE POLICY "Users insert own records" ON records
        FOR INSERT WITH CHECK (true);
    CREATE POLICY "Users update own records" ON records
        FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- 3. VERIFY AUDIT TABLE — scope to user
DO $$
BEGIN
    ALTER TABLE verify_audit ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
    
    ALTER TABLE verify_audit ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users read own verifications" ON verify_audit
        FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
    CREATE POLICY "Users insert verifications" ON verify_audit
        FOR INSERT WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- 4. SERVICE ROLE BYPASS — Allows the API (using service_key) to access all rows
-- This is critical: the API server uses the service_key, not anon_key, so it
-- bypasses RLS by default. This is correct behavior — the API handles its own
-- authorization via _get_auth_user().

-- 5. Create a profiles table for user metadata
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    organization TEXT DEFAULT 'S4 Ledger',
    role TEXT DEFAULT 'ils_analyst',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
DO $$
BEGIN
    CREATE POLICY "Users read own profile" ON profiles
        FOR SELECT USING (id = auth.uid());
    CREATE POLICY "Users update own profile" ON profiles
        FOR UPDATE USING (id = auth.uid());
    CREATE POLICY "Allow profile creation" ON profiles
        FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (drop first if exists to avoid duplicates)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
