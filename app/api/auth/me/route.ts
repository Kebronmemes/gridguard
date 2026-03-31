// ============================================
// GridGuard — Auth: Current User Session
// ============================================
// Reads the HTTP-only session cookie and returns
// the current user. Used by both admin and staff portals.

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({
      user: {
        id: session.id,
        username: session.username,
        role: session.role,
        name: session.name,
      }
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
