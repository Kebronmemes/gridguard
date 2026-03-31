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
  const url = new URL(request.url);
  const runAI = url.searchParams.get('ai') === 'true';
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  console.log(`[Cron/Predictions] Job started. RunAI: ${runAI}`);
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron/Predictions] ❌ Unauthorized attempt blocked');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // 1. Clean up expired predictions first
    console.log('[Cron/Predictions] 🧹 Cleaning expired entries...');
    const now = new Date().toISOString();
    const { count: deletedCount, error: deleteError } = await supabase.from('predictions').delete().lt('expires_at', now);
    if (deleteError) throw deleteError;
    console.log(`[Cron/Predictions] ✅ Cleaned ${deletedCount || 0} expired predictions`);

    // 2. Run rule-based engine (always runs, free)
    console.log('[Cron/Predictions] 📐 Running rule-based logic...');
    const predictions = await runRuleEngine();
    console.log(`[Cron/Predictions] 📦 Rule engine generated ${predictions.length} zones`);
    
    await savePredictions(predictions);
    console.log('[Cron/Predictions] ✅ Rule predictions saved to DB');

    // 3. Optionally run AI enhancement
    let aiRan = false;
    if (runAI) {
      console.log('[Cron/Predictions] 🤖 Starting deep AI analysis...');
      await runAIEnhancement();
      console.log('[Cron/Predictions] ✅ AI analysis complete');
      aiRan = true;
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron/Predictions] 🏁 Job finished in ${duration}ms`);

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
    console.error('[Cron/Predictions] ❌ FATAL ERROR:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
