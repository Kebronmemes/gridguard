import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: activeOutages, error } = await supabase
      .from('district_history')
      .select('*')
      .or(`end_time.is.null,end_time.eq."",end_time.gte.${new Date().toISOString()}`);

    if (error || !activeOutages) {
      console.error('Supabase active outages error:', error);
      return NextResponse.json({ outages: [], timestamp: new Date().toISOString() });
    }

    const mapped = activeOutages.map(o => ({
        id: o.id,
        area: o.district,
        district: o.subcity || o.district,
        coordinates: o.lat && o.lng ? [o.lat, o.lng] : [9.0, 38.75],
        type: o.type,
        severity: o.severity,
        status: 'active',
        reason: o.cause,
        reportCount: o.affected_count || 0,
        startTime: o.start_time,
        estimatedRestoreTime: new Date(new Date(o.start_time).getTime() + 4 * 3600000).toISOString(),
        createdBy: 'system',
        verifiedByStaff: true,
    }));

    return NextResponse.json({
      outages: mapped,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Outages API error:', err);
    return NextResponse.json({ outages: [], timestamp: new Date().toISOString() });
  }
}
