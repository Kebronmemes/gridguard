// ============================================
// GridGuard — Predictions Cron Endpoint
// ============================================
// Called by GitHub Actions every 1–2 hours.
// Runs rule engine. Optionally calls AI every 3rd run.
// NEVER call this from the frontend directly.

import { NextResponse } from 'next/server';
import { runRuleEngine, savePredictions, runAIEnhancement } from '@/lib/predictor';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const url = new URL(request.url);
  const runAI = url.searchParams.get('ai') === 'true';

  try {
    // 1. Clean up expired predictions first
    const now = new Date().toISOString();
    await supabase.from('predictions').delete().lt('expires_at', now);
    console.log('[Cron/Predictions] Cleaned expired predictions');

    // 2. Run rule-based engine (always runs, free)
    const predictions = await runRuleEngine();
    await savePredictions(predictions);

    // 3. Optionally run AI enhancement (only when explicitly requested by job)
    let aiRan = false;
    if (runAI) {
      await runAIEnhancement();
      aiRan = true;
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      ranAt: new Date().toISOString(),
      rulePredictions: predictions.length,
      highRisk: predictions.filter(p => p.risk_level === 'high').length,
      mediumRisk: predictions.filter(p => p.risk_level === 'medium').length,
      aiEnhancementRan: aiRan,
      durationMs: duration,
    });
  } catch (err) {
    console.error('[Cron/Predictions] Error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
