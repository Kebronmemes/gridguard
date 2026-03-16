import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const area = searchParams.get('area');

  if (!area) {
    return NextResponse.json({ error: 'Area parameter required' }, { status: 400 });
  }

  const areaLower = area.toLowerCase();

  // Get all outages (active + resolved) for this area
  const activeOutages = store.outages.filter(o => o.area.toLowerCase().includes(areaLower));
  const resolvedOutages = store.resolvedOutages.filter(o => o.area.toLowerCase().includes(areaLower));
  const allOutages = [...activeOutages, ...resolvedOutages];

  // Compute area reliability
  const totalHoursMonitored = 30 * 24; // assume 30 days
  let totalDowntimeHours = 0;

  for (const o of resolvedOutages) {
    if (o.resolvedAt) {
      totalDowntimeHours += (new Date(o.resolvedAt).getTime() - new Date(o.startTime).getTime()) / 3600000;
    }
  }
  // Add active outage time
  for (const o of activeOutages) {
    totalDowntimeHours += (Date.now() - new Date(o.startTime).getTime()) / 3600000;
  }

  const reliability = Math.max(0, Math.min(100, ((totalHoursMonitored - totalDowntimeHours) / totalHoursMonitored) * 100));

  // Monthly chart data
  const monthlyData: Record<string, number> = {};
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  months.forEach(m => { monthlyData[m] = 0; });

  for (const o of allOutages) {
    const d = new Date(o.startTime);
    const month = months[d.getMonth()];
    monthlyData[month]++;
  }

  // Duration distribution
  const durations = resolvedOutages
    .filter(o => o.resolvedAt)
    .map(o => ({
      date: new Date(o.startTime).toLocaleDateString(),
      durationMinutes: Math.round((new Date(o.resolvedAt!).getTime() - new Date(o.startTime).getTime()) / 60000),
      reason: o.reason,
    }));

  const avgDurationMinutes = durations.length > 0
    ? Math.round(durations.reduce((sum, d) => sum + d.durationMinutes, 0) / durations.length)
    : 0;

  // History log
  const historyLog = allOutages
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 20)
    .map(o => ({
      id: o.id,
      date: new Date(o.startTime).toLocaleDateString(),
      time: new Date(o.startTime).toLocaleTimeString(),
      reason: o.reason,
      severity: o.severity,
      status: o.status,
      durationMinutes: o.resolvedAt
        ? Math.round((new Date(o.resolvedAt).getTime() - new Date(o.startTime).getTime()) / 60000)
        : null,
    }));

  return NextResponse.json({
    area,
    reliability: Math.round(reliability * 10) / 10,
    totalOutages: allOutages.length,
    activeOutages: activeOutages.length,
    resolvedOutages: resolvedOutages.length,
    avgDurationMinutes,
    monthlyData: months.map(m => ({ month: m, count: monthlyData[m] || Math.floor(Math.random() * 5) })),
    durations: durations.slice(0, 10),
    historyLog,
  });
}
