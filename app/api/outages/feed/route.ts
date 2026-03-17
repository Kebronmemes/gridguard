import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: feed, error } = await supabase
      .from('system_feed')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error || !feed) {
      return NextResponse.json({ feed: [] });
    }

    // Filter out internal system logs and staff logins for the public feed
    const filteredFeed = feed.filter(item => 
      item.area !== 'System' && 
      !item.message.includes('Staff login') &&
      !item.message.includes('🔐')
    );

    return NextResponse.json({ feed: filteredFeed });
  } catch (err) {
    console.error('Feed API error:', err);
    return NextResponse.json({ feed: [] });
  }
}
