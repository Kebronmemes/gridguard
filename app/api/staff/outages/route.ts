import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/session';
import { notifyAreaSubscribers } from '@/lib/mailer';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const data = await request.json();

    const { data: outage, error } = await supabase.from('district_history').insert({
      district: data.area || 'Unknown',
      subcity: data.district || 'Unknown',
      lat: data.coordinates?.[0] || 9.0,
      lng: data.coordinates?.[1] || 38.75,
      type: data.type || 'emergency',
      severity: data.severity || 'moderate',
      cause: data.reason || 'Reported by staff',
      start_time: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    await supabase.from('system_feed').insert({
      type: 'outage_reported',
      message: `Staff reported outage in ${outage.district} — ${outage.cause}`,
      area: outage.district,
    });

    const { data: subs } = await supabase.from('subscribers').select('*').ilike('district', `%${outage.district}%`);
    if (subs && subs.length > 0) {
      notifyAreaSubscribers(
        outage.district,
        subs.map(s => ({ email: s.email, name: s.area })),
        { cause: outage.cause, estimatedRestoreTime: 'TBD', startTime: new Date(outage.start_time).toLocaleString(), status: 'Active Outage', type: 'outage' }
      ).catch(console.error);
    }

    return NextResponse.json({ success: true, outage, subscribersNotified: subs?.length || 0 }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await validateToken(request.headers.get('authorization'));
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, status, reason } = await request.json();
    
    // Check if it exists
    const { data: o } = await supabase.from('district_history').select('*').eq('id', id).single();
    if (!o) return NextResponse.json({ error: 'Outage not found' }, { status: 404 });

    if (status === 'resolved') {
      const { data: out } = await supabase.from('district_history').update({
        end_time: new Date().toISOString()
      }).eq('id', id).select().single();

      await supabase.from('system_feed').insert({
        type: 'outage_resolved',
        message: `Power restored in ${o.district} by ${auth.user.name}`,
        area: o.district,
      });

      const { data: resolveSubs } = await supabase.from('subscribers').select('*').ilike('district', `%${o.district}%`);
      if (resolveSubs && resolveSubs.length > 0) {
        notifyAreaSubscribers(
          o.district,
          resolveSubs.map(s => ({ email: s.email, name: s.district })),
          { cause: o.cause, estimatedRestoreTime: 'N/A – Restored', startTime: new Date(o.start_time).toLocaleString(), status: 'Resolved', type: 'resolved' }
        ).catch(console.error);
      }
      return NextResponse.json({ success: true, outage: out });
    } else {
      const { data: out } = await supabase.from('district_history').update({
        cause: reason || o.cause
      }).eq('id', id).select().single();

      await supabase.from('system_feed').insert({
        type: 'grid_update',
        message: `Status updated for ${o.district} by ${auth.user.name}`,
        area: o.district,
      });
      return NextResponse.json({ success: true, outage: out });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}
