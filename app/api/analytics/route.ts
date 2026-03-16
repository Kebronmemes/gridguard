import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  try {
    const { data: active, error: ae } = await supabase
      .from('district_history')
      .select('id, district, affected_count')
      .is('end_time', null);

    const { data: resolvedToday, error: re } = await supabase
      .from('district_history')
      .select('id')
      .not('end_time', 'is', null)
      .gte('end_time', todayStart);

    const { data: allResolved, error: are } = await supabase
      .from('district_history')
      .select('start_time, end_time')
      .not('end_time', 'is', null);

    if (ae || re || are) throw new Error('Analytics query failed');

    const activeOutagesCount = active?.length || 0;
    const resolvedTodayCount = resolvedToday?.length || 0;

    let totalMinutes = 0;
    allResolved?.forEach(o => {
      const duration = new Date(o.end_time).getTime() - new Date(o.start_time).getTime();
      totalMinutes += duration / 60000;
    });

    const averageRestorationMinutes = allResolved?.length ? totalMinutes / allResolved.length : 120;

    // A simple grid reliability formula based on active outages
    const gridReliability = Math.max(0, 100 - (activeOutagesCount * 0.5));

    const mostAffected = active?.reduce((acc: any, curr) => {
      if (!acc[curr.district]) acc[curr.district] = 0;
      acc[curr.district] += curr.affected_count || 1;
      return acc;
    }, {}) || {};

    const formattedAffected = Object.entries(mostAffected)
      .map(([area, total]) => ({ area, totalMinutes: total as number }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 5);

    return NextResponse.json({
      activeOutages: activeOutagesCount,
      resolvedToday: resolvedTodayCount,
      gridReliability,
      averageRestorationMinutes,
      mostAffectedAreas: formattedAffected,
    });
  } catch (err) {
    return NextResponse.json({ activeOutages: 0, resolvedToday: 0, gridReliability: 100, averageRestorationMinutes: 0, mostAffectedAreas: [] });
  }
}
