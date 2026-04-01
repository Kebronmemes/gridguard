// ============================================
// GridGuard — Public Predictions API
// ============================================
// Frontend reads predictions from here. Zero AI calls.
// Just a fast Supabase DB read.

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date().toISOString();

    // Only return non-expired predictions
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select('id, location, lat, lng, risk_level, confidence_score, probability, predicted_time_window, reason_summary, source, weather_impact, created_at')
      .gt('expires_at', now)
      .order('confidence_score', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[API/Predictions] DB error:', error.message);
      return NextResponse.json({ predictions: [] });
    }

    return NextResponse.json({
      predictions: predictions || [],
      count: predictions?.length || 0,
      fetchedAt: now,
    });
  } catch (err) {
    console.error('[API/Predictions] Unexpected error:', err);
    return NextResponse.json({ predictions: [], count: 0 });
  }
}
