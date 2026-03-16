import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const area = searchParams.get('area');
  const severity = searchParams.get('severity');
  const days = parseInt(searchParams.get('days') || '30');

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let query = supabase
    .from('district_history')
    .select('*')
    .not('end_time', 'is', null) // Only resolved outages
    .gte('start_time', cutoffDate.toISOString())
    .order('start_time', { ascending: false });

  if (area) {
    query = query.ilike('district', `%${area}%`);
  }
  if (severity) {
    query = query.eq('severity', severity);
  }

  const { data: history, error } = await query;

  if (error || !history) {
    return NextResponse.json({ history: [], total: 0 });
  }

  const mapped = history.map(o => ({
      id: o.id,
      area: o.district,
      district: o.subcity || o.district,
      type: o.type,
      severity: o.severity,
      reason: o.cause,
      reportCount: o.affected_count || 0,
      startTime: o.start_time,
      resolvedAt: o.end_time,
  }));

  return NextResponse.json({ history: mapped, total: mapped.length });
}
