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

    // Find user in Supabase
    const { data: user, error } = await supabase
      .from('staff_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // In a real app, use bcrypt to compare password_hash.
    // For this implementation, we are performing a direct string match.
    if (user.password_hash !== password) {
      const newAttempts = (user.failed_attempts || 0) + 1;
      await supabase
        .from('staff_users')
        .update({ failed_attempts: newAttempts })
        .eq('id', user.id);

      if (newAttempts >= MAX_ATTEMPTS) {
        return NextResponse.json({
          error: `Too many failed attempts. Account locked.`,
          locked: true,
        }, { status: 429 });
      }

      return NextResponse.json({
        error: 'Invalid credentials',
        attemptsRemaining: MAX_ATTEMPTS - newAttempts,
      }, { status: 401 });
    }

    if ((user.failed_attempts || 0) >= MAX_ATTEMPTS) {
        return NextResponse.json({
          error: `Account is locked.`,
          locked: true,
        }, { status: 429 });
    }

    // Successful login — reset attempts and update last login
    await supabase
      .from('staff_users')
      .update({ failed_attempts: 0, last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Create secure HTTP-only session cookie
    const sessionToken = await encrypt({ id: user.id, username: user.username, role: user.role, name: user.name });
    
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role, name: user.name },
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

    // Log login event
    await supabase.from('system_feed').insert({
      type: 'grid_update',
      message: `🔐 Staff login: ${user.name} (${user.role})`,
      area: 'System',
    });

    return response;
  } catch (err) {
    console.error('Auth Error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
