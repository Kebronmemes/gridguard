import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized Supabase client.
// This prevents the build from crashing when env vars are not available
// during Next.js static page collection on Vercel.
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    _supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      }
    });
  }
  return _supabase;
}

// Export a proxy that lazily initializes on first property access.
// This means importing `supabase` will NOT crash at module parse time.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
