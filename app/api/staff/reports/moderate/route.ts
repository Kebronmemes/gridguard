import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const payload = await decrypt(token);
    if (!payload || (payload.role !== 'staff' && payload.role !== 'admin' && payload.role !== 'maintenance')) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
    }

    const { reportId, action } = await request.json();
    if (!reportId || !action) {
      return NextResponse.json({ error: 'Missing reportId or action' }, { status: 400 });
    }

    if (action === 'verify') {
      const { error } = await supabase
        .from('citizen_reports')
        .update({ status: 'verified', updated_at: new Date().toISOString() })
        .eq('id', reportId);
      
      if (error) throw error;
      
      // Also log to system feed
      await supabase.from('system_feed').insert({
        type: 'citizen_report',
        message: `Report #${reportId.slice(0,5)} verified by ${payload.name}`,
        area: 'Staff Hub'
      });
    } else if (action === 'dismiss') {
      const { error } = await supabase
        .from('citizen_reports')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Moderation error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
