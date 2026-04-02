import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { subscription, area } = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Subscription endpoint is required' }, { status: 400 });
    }

    if (!area) return NextResponse.json({ error: 'Area is required' }, { status: 400 });

    // Store the push subscription in Supabase
    // Table: push_subscriptions (id, endpoint, auth, p256dh, area, created_at)
    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint: subscription.endpoint,
      auth: subscription.keys.auth,
      p256dh: subscription.keys.p256dh,
      area: area,
      created_at: new Date().toISOString()
    }, { onConflict: 'endpoint' });

    if (error) {
      console.error('[Push Subscribe API] DB error:', error);
      return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Push Subscribe API] Error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
