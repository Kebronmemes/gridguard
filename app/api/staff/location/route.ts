// Staff location tracking API
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function validateToken(authHeader: string | null): Promise<{ valid: boolean; user?: any }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { valid: false };
  const token = authHeader.split(' ')[1];
  const payload = await decrypt(token);
  if (!payload) return { valid: false };
  return { valid: true, user: payload };
}

export async function POST(request: Request) {
  const auth = await validateToken(request.headers.get('authorization'));
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { lat, lng } = await request.json();
    if (typeof lat !== 'number' || typeof lng !== 'number') return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });

    await supabase.from('staff_locations').upsert({
      staff_id: auth.user.id || auth.user.name,
      lat,
      lng,
      updated_at: new Date().toISOString()
    }, { onConflict: 'staff_id' });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const auth = await validateToken(request.headers.get('authorization'));
  if (!auth.valid || auth.user?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 401 });

  const { data } = await supabase.from('staff_locations').select('*');
  const locations: Record<string, any> = {};
  data?.forEach(row => locations[row.staff_id] = { lat: row.lat, lng: row.lng, updatedAt: row.updated_at });

  return NextResponse.json({ locations });
}
