import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getRealWeather } from '@/lib/predictor';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---- Compute historical average duration for a district (in ms) ----
async function getAvgDuration(district: string): Promise<number | null> {
  const { data } = await supabase
    .from('district_history')
    .select('start_time, end_time')
    .ilike('district', `%${district}%`)
    .not('end_time', 'is', null)
    .limit(20);

  if (!data || data.length < 3) return null;

  const durations = data.map(r =>
    new Date(r.end_time).getTime() - new Date(r.start_time).getTime()
  ).filter(d => d > 0 && d < 24 * 3600 * 1000); // sanity: 0–24h

  if (durations.length === 0) return null;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

// ---- Format an estimate label ----
function formatETA(avgMs: number): string {
  const mins = Math.round(avgMs / 60000);
  if (mins < 60) return `Estimated ${mins}–${Math.round(mins * 1.5)} minutes`;
  const hrs = Math.round(mins / 60);
  return `Estimated ${hrs}–${hrs + 1} hour${hrs > 1 ? 's' : ''}`;
}

export async function GET() {
  try {
    const { data: allOutages, error } = await supabase
      .from('district_history')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase outages error:', error);
      return NextResponse.json({ outages: [], error: error.message, hint: error.hint, code: error.code, timestamp: new Date().toISOString() });
    }

    if (!allOutages || allOutages.length === 0) {
      return NextResponse.json({ outages: [], debug: 'no_rows_returned', timestamp: new Date().toISOString() });
    }

    const now = new Date();
    const activeOutages = allOutages.filter(o => {
      if (!o.end_time) return true;
      const endTime = new Date(o.end_time);
      return endTime > now || o.type === 'planned';
    });

    // Build mapped outages with smart ETA
    const mapped = await Promise.all(activeOutages.map(async (o) => {
      let estimatedRestoreTime: string;
      let etaLabel: string | undefined;

      if (o.end_time) {
        // Already has an end time — use it directly
        estimatedRestoreTime = o.end_time;
      } else {
        // Compute ETA from history
        const avgDurationMs = await getAvgDuration(o.district);

        if (avgDurationMs) {
          const etaMs = new Date(o.start_time).getTime() + avgDurationMs;
          estimatedRestoreTime = new Date(etaMs).toISOString();
          etaLabel = formatETA(avgDurationMs);
        } else {
          // Last resort: 3h fallback
          estimatedRestoreTime = new Date(
            new Date(o.start_time).getTime() + 3 * 3600 * 1000
          ).toISOString();
          etaLabel = 'Estimated 1–3 hours (insufficient history)';
        }
      }

      // If we are at the default center, add a tiny aesthetic jitter so markers don't overlap perfectly.
      // We've reduced this from 4km to ~200m since Pass 2 AI now provides better coordinates.
      let outLat = o.lat || 9.0;
      let outLng = o.lng || 38.75;
      if (outLat === 9.0 && outLng === 38.75) {
        // Small offset ~200m around the center for generic points
        outLat += (Math.random() - 0.5) * 0.002;
        outLng += (Math.random() - 0.5) * 0.002;
      }

      // Fetch live weather for these coordinates
      const weather = await getRealWeather(outLat, outLng);

      return {
        id: o.id.toString(),
        area: o.district,
        district: o.district,
        subcity: o.subcity || 'Unknown',
        coordinates: [outLat, outLng] as [number, number],
        type: (o.type as any) || 'emergency',
        severity: (o.severity as any) || 'moderate',
        status: o.end_time ? 'resolved' : 'active',
        reason: o.cause || 'EEU Power Interruption',
        startTime: o.start_time,
        estimatedRestoreTime,
        etaLabel,
        weather
      };
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
