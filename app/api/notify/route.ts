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

    return NextResponse.json({ success: true, sent, total: subscribers.length });
  } catch {
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}
