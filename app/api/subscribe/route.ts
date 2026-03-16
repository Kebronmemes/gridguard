import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendOutageAlert } from '@/lib/mailer';
import { RATE_LIMITS, getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = RATE_LIMITS.subscribe(ip);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });

  try {
    const data = await request.json();
    const { email, name, area, coordinates, preferences, phone } = data;

    if (!email || !area) return NextResponse.json({ error: 'Email and area are required' }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });

    const { error: insertErr } = await supabase.from('subscribers').insert({
      email,
      area,
      district: area,
      phone: phone || null,
      preferences: preferences || { outageDetected: true, outageResolved: true, maintenance: true }
    });

    if (insertErr) {
      if (insertErr.code === '23505') return NextResponse.json({ error: 'This email is already subscribed' }, { status: 409 });
      throw insertErr;
    }

    try {
      await sendOutageAlert({
        to: email,
        userName: name || 'Subscriber',
        area: area,
        cause: 'You will receive alerts for outages in your area',
        estimatedRestoreTime: 'N/A',
        startTime: new Date().toLocaleString(),
        status: 'Subscribed Successfully',
        type: 'maintenance',
      });
    } catch (e) { console.error('Welcome email failed:', e); }

    return NextResponse.json({ success: true, subscription: { email, area, phone: phone ? 'Phone signup currently unavailable' : undefined } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
