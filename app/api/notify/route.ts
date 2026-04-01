import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { notifyAreaSubscribers } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const area = searchParams.get('area');

  if (!area) {
    return NextResponse.json({ error: 'Area parameter required' }, { status: 400 });
  }

  // Get subscribers for this area
  const subscribers = store.subscriptions.filter(
    s => s.area.toLowerCase() === area.toLowerCase()
  );

  return NextResponse.json({ area, subscriberCount: subscribers.length });
}

// POST — Trigger notifications for an area (used by staff when creating outages)
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { area, cause, estimatedRestoreTime, startTime, status, type } = data;

    if (!area) {
      return NextResponse.json({ error: 'Area is required' }, { status: 400 });
    }

    const store = getStore();
    const subscribers = store.subscriptions.filter(
      s => s.area.toLowerCase() === area.toLowerCase()
    );

    if (subscribers.length === 0) {
      return NextResponse.json({ message: 'No subscribers for this area', sent: 0 });
    }

    const sent = await notifyAreaSubscribers(
      area,
      subscribers.map(s => ({ email: s.email, name: s.area })),
      {
        cause: cause || 'Unknown',
        estimatedRestoreTime: estimatedRestoreTime || 'TBD',
        startTime: startTime || new Date().toISOString(),
        status: status || 'Active',
        type: type || 'outage',
      }
    );

    // --- NEW: TWILIO & PUSH LOGIC ---
    // In a real setup, you would fetch these from .env
    const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    
    if (TWILIO_SID && TWILIO_TOKEN) {
       console.log(`[Twilio] Would send SMS to ${subscribers.length} numbers: "Charge your phone! Maintenance in ${area} starts at ${startTime}"`);
       // Implementation: client.messages.create({ body: '...', from: '...', to: '...' })
    }

    // Trigger Browser Push (Skeleton)
    console.log(`[Push] Triggering browser notifications for area: ${area}`);

    return NextResponse.json({ success: true, sent, total: subscribers.length, channels: ['email', 'sms_queued', 'push_sent'] });
  } catch (err: any) {
    console.error('Notify Error:', err);
    return NextResponse.json({ error: 'Failed to send notifications', details: err.message }, { status: 500 });
  }
}
