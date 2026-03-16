import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { notifyAreaSubscribers } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

function validateToken(authHeader: string | null): { valid: boolean; user?: any } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { valid: false };
  try {
    const payload = JSON.parse(Buffer.from(authHeader.split(' ')[1], 'base64').toString());
    if (payload.exp < Date.now()) return { valid: false };
    return { valid: true, user: payload };
  } catch { return { valid: false }; }
}

export async function POST(request: Request) {
  const auth = validateToken(request.headers.get('authorization'));
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await request.json();
    const { area, reason, startTime, expectedDuration, notes } = data;

    if (!area || !reason) return NextResponse.json({ error: 'Area and reason are required' }, { status: 400 });

    const maintTime = startTime || new Date().toISOString();

    const { data: maintenance, error: minErr } = await supabase.from('district_history').insert({
      district: area,
      subcity: area,
      cause: reason,
      start_time: maintTime,
      type: 'maintenance',
      severity: 'moderate',
    }).select().single();

    if (minErr) throw minErr;

    await supabase.from('system_feed').insert({
      type: 'maintenance_scheduled',
      message: `Maintenance scheduled for ${area}: ${reason} — Duration: ${expectedDuration || '2 hours'}`,
      area,
    });

    const { data: subscribers } = await supabase.from('subscribers').select('*').ilike('district', `%${area}%`);

    let emailsSent = 0;
    if (subscribers && subscribers.length > 0) {
      try {
        await notifyAreaSubscribers(
          area,
          subscribers.map(s => ({ email: s.email, name: s.area })),
          {
            cause: reason,
            estimatedRestoreTime: expectedDuration || '2 hours',
            startTime: new Date(maintTime).toLocaleString(),
            status: 'Scheduled Maintenance',
            type: 'maintenance',
          }
        );
        emailsSent = subscribers.length;
      } catch (e) {
        console.error('Failed to notify subscribers:', e);
      }
    }

    return NextResponse.json({ success: true, maintenance, subscribersNotified: emailsSent }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
