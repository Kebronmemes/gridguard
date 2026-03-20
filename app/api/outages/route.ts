import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch ALL district_history rows — let the frontend decide what's "active"
    // This is simpler and avoids complex .or() filter bugs
    const { data: allOutages, error } = await supabase
      .from('district_history')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase outages error:', error);
      return NextResponse.json({ outages: [], timestamp: new Date().toISOString() });
    }

    if (!allOutages || allOutages.length === 0) {
      return NextResponse.json({ outages: [], timestamp: new Date().toISOString() });
    }

    // Filter: show outages that are currently active or ending in the future
    const now = new Date();
    const activeOutages = allOutages.filter(o => {
      if (!o.end_time) return true; // no end time = still active
      const endTime = new Date(o.end_time);
      // Show if it's currently active OR if it's a planned outage that hasn't ended yet
      // OR if it started recently even if ended (showing history for a bit)
      return endTime > now || o.type === 'planned'; 
    });

    const mapped = activeOutages.map(o => ({
      id: o.id,
      area: o.district,
      district: o.subcity || o.district,
      coordinates: (o.lat && o.lng) ? [o.lat, o.lng] : [9.0, 38.75],
      type: o.type || 'planned',
      severity: o.severity || 'moderate',
      status: 'active',
      reason: o.cause || 'EEU Power Interruption',
      reportCount: o.affected_count || 0,
      startTime: o.start_time,
      estimatedRestoreTime: o.end_time || new Date(new Date(o.start_time).getTime() + 4 * 3600000).toISOString(),
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
