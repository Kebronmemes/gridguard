// ============================================
// GridGuard — Auth Login API (Supabase Integration)
// ============================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { encrypt } from '@/lib/session';
import { RATE_LIMITS, getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = RATE_LIMITS.auth(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: `Rate limited. Try again in ${rl.retryAfter} seconds.` }, { status: 429 });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Authenticate with Supabase Auth (GoTrue)
    // Note: In Supabase, 'email' is the standard identifier.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username, // Assuming 'username' field in form contains email
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Invalid credentials' }, { status: 401 });
    }

    const sbUser = authData.user;
    const role = sbUser.user_metadata?.role || 'staff';
    const name = sbUser.user_metadata?.full_name || sbUser.email || 'Staff Member';

    // Successful login — update last login (optional, could be done in a trigger)
    // Create secure HTTP-only session cookie
    const sessionToken = await encrypt({ id: sbUser.id, username: sbUser.email, role, name });
    
    const response = NextResponse.json({
      success: true,
      user: { id: sbUser.id, username: sbUser.email, role, name },
      token: sessionToken
    });
    
    // Also set as cookie for standard web usage
    response.cookies.set('gridguard_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 3600, // 8 hours
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Auth Error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
