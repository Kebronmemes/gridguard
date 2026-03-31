// ============================================
// GridGuard — Public Data Export API
// ============================================
// Returns a compact snapshot of live outages + predictions.
// Used as source data for QR code export.
// No auth required — only non-sensitive public data.

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();

    // Latest 20 active outages
    const { data: outages } = await supabase
      .from('district_history')
      .select('id, district, subcity, cause, start_time, end_time, severity, lat, lng')
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(20);

    // Latest non-expired predictions (medium/high only for QR compactness)
    const { data: predictions } = await supabase
      .from('predictions')
      .select('id, location, lat, lng, risk_level, confidence_score, predicted_time_window')
      .gt('expires_at', now.toISOString())
      .in('risk_level', ['medium', 'high'])
      .order('confidence_score', { ascending: false })
      .limit(10);

    const payload = {
      v: 1, // version for forward compatibility
      exportedAt: now.toISOString(),
      outages: (outages || []).map(o => ({
        id: o.id,
        area: o.district,
        district: o.subcity,
        coordinates: [o.lat, o.lng],
        severity: o.severity,
        reason: o.cause,
        startTime: o.start_time,
        status: 'active',
        type: 'planned',
        estimatedRestoreTime: new Date(new Date(o.start_time).getTime() + 3 * 3600000).toISOString(),
        verifiedByStaff: true,
        reportCount: 0,
      })),
      predictions: predictions || [],
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'Content-Disposition': 'inline; filename="gridguard-export.json"',
      }
    });
  } catch (err) {
    console.error('[Export] Error:', err);
    return NextResponse.json({ v: 1, outages: [], predictions: [], exportedAt: new Date().toISOString() });
  }
}
