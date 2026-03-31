// ============================================
// GridGuard — Rule-Based Prediction Engine
// ============================================
// FREE. No AI calls. Runs on every prediction cron job.
// Reads from district_history, writes to predictions table.

import { supabase } from './supabase';
import { ETHIOPIAN_AREAS } from './store';

interface PredictionResult {
  location: string;
  lat: number;
  lng: number;
  risk_level: 'low' | 'medium' | 'high';
  confidence_score: number;
  predicted_time_window: string;
  reason_summary: string;
  source: 'rule';
}

// ---- Determine peak time window from historical records ----
function getPeakTimeWindow(hours: number[]): string {
  if (hours.length === 0) return 'Any time';
  const freq: Record<number, number> = {};
  for (const h of hours) {
    freq[h] = (freq[h] || 0) + 1;
  }
  let peakHour = 7;
  let maxCount = 0;
  for (const [h, c] of Object.entries(freq)) {
    if (c > maxCount) { maxCount = c; peakHour = parseInt(h); }
  }
  const end = (peakHour + 6) % 24;
  const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return `${fmt(peakHour)}–${fmt(end)}`;
}

// ---- Main rule engine ----
export async function runRuleEngine(): Promise<PredictionResult[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const currentHour = new Date().getHours();

  // 1. Fetch 30-day history
  const { data: history, error: hErr } = await supabase
    .from('district_history')
    .select('district, subcity, start_time, end_time, severity, lat, lng')
    .gte('start_time', thirtyDaysAgo);

  if (hErr || !history) {
    console.error('[Predictor] Failed to fetch history:', hErr?.message);
    return [];
  }

  // 2. Fetch recent citizen reports (last 6h) for boost
  const { data: recentReports } = await supabase
    .from('citizen_reports')
    .select('area, severity, created_at')
    .gte('created_at', sixHoursAgo);

  const reportCountByArea: Record<string, number> = {};
  for (const r of recentReports || []) {
    const area = r.area?.toLowerCase().trim();
    if (area) reportCountByArea[area] = (reportCountByArea[area] || 0) + 1;
  }

  // 3. Group history by location
  const groupedByLocation: Record<string, typeof history> = {};
  for (const record of history) {
    const key = (record.district || record.subcity || 'Unknown').toLowerCase().trim();
    if (!groupedByLocation[key]) groupedByLocation[key] = [];
    groupedByLocation[key].push(record);
  }

  const predictions: PredictionResult[] = [];

  // 4. Score each known Ethiopian area
  for (const area of ETHIOPIAN_AREAS) {
    const key = area.area.toLowerCase().trim();
    const records = groupedByLocation[key] || [];
    const outageCount = records.length;

    // Hour-of-day pattern
    const outageHours = records.map(r => new Date(r.start_time).getHours());
    const isCurrentPeakHour = outageHours.filter(h =>
      Math.abs(h - currentHour) <= 2
    ).length >= 2;

    // Recent citizen report boost
    const reportBoost = (reportCountByArea[key] || 0) >= 3 ? 2 :
                        (reportCountByArea[key] || 0) >= 1 ? 1 : 0;

    // Nearby outage boost: check areas within ~0.05 degree
    const nearbyActive = history.filter(r => {
      if (!r.lat || !r.lng || !r.end_time === false) return false;
      const dist = Math.sqrt(
        Math.pow((r.lat - area.coords[0]), 2) + Math.pow((r.lng - area.coords[1]), 2)
      );
      return dist < 0.05 && !r.end_time;
    }).length;
    const nearbyBoost = nearbyActive >= 2 ? 1 : 0;

    // Total score
    const totalScore = outageCount + reportBoost * 2 + nearbyBoost + (isCurrentPeakHour ? 1 : 0);

    let risk_level: 'low' | 'medium' | 'high';
    let confidence_score: number;

    if (totalScore >= 8) {
      risk_level = 'high';
      confidence_score = Math.min(90, 60 + totalScore * 2);
    } else if (totalScore >= 4) {
      risk_level = 'medium';
      confidence_score = Math.min(75, 40 + totalScore * 3);
    } else if (totalScore >= 2) {
      risk_level = 'low';
      confidence_score = Math.min(55, 20 + totalScore * 5);
    } else {
      // Not enough data — skip this area
      continue;
    }

    const reasons: string[] = [];
    if (outageCount > 0) reasons.push(`${outageCount} outages in last 30 days`);
    if (reportBoost > 0) reasons.push(`${reportCountByArea[key] || 0} citizen reports in last 6h`);
    if (isCurrentPeakHour) reasons.push('current time matches peak outage window');
    if (nearbyBoost > 0) reasons.push('active outages in nearby areas');

    predictions.push({
      location: area.area,
      lat: area.coords[0],
      lng: area.coords[1],
      risk_level,
      confidence_score,
      predicted_time_window: getPeakTimeWindow(outageHours),
      reason_summary: reasons.join('; ') || 'Historical pattern detected',
      source: 'rule',
    });
  }

  console.log(`[Predictor] Rule engine produced ${predictions.length} predictions`);
  return predictions;
}

// ---- Write predictions to Supabase ----
export async function savePredictions(predictions: PredictionResult[]): Promise<void> {
  if (predictions.length === 0) return;

  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  for (const p of predictions) {
    // Upsert: one prediction per location (replace old rule-based ones)
    const { error } = await supabase
      .from('predictions')
      .upsert(
        {
          location: p.location,
          lat: p.lat,
          lng: p.lng,
          risk_level: p.risk_level,
          confidence_score: p.confidence_score,
          predicted_time_window: p.predicted_time_window,
          reason_summary: p.reason_summary,
          source: p.source,
          created_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: 'location' }
      );

    if (error) {
      // If upsert fails (no unique constraint), try delete + insert
      await supabase.from('predictions').delete().eq('location', p.location).eq('source', 'rule');
      await supabase.from('predictions').insert({ ...p, expires_at: expiresAt });
    }
  }

  // Log activity
  await supabase.from('activity_logs').insert({
    event_type: 'prediction_updated',
    location: 'system',
    metadata: { count: predictions.length, high: predictions.filter(p => p.risk_level === 'high').length },
  });

  console.log(`[Predictor] Saved ${predictions.length} predictions to Supabase`);
}

// ---- AI Enhancement: analyze patterns and update predictions ----
export async function runAIEnhancement(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('[Predictor] No OPENROUTER_API_KEY — skipping AI enhancement');
    return;
  }

  // 1. Fetch historical statistics for AI to "think" about
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  
  // Get all historical data to compute global/per-district stats
  const { data: history } = await supabase
    .from('district_history')
    .select('district, start_time, end_time, cause, severity')
    .gte('start_time', thirtyDaysAgo);

  if (!history || history.length < 5) {
    console.log('[Predictor] Not enough historical data for deep AI analysis');
    return;
  }

  // 2. Compute statistics to feed to the AI
  const statsByDistrict: Record<string, any> = {};
  history.forEach(r => {
    const d = r.district || 'Unknown';
    if (!statsByDistrict[d]) statsByDistrict[d] = { count: 0, totalDuration: 0, resolved: 0, lateCount: 0 };
    statsByDistrict[d].count++;
    if (r.end_time) {
      statsByDistrict[d].resolved++;
      const duration = (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 3600000;
      statsByDistrict[d].totalDuration += duration;
      if (duration > 6) statsByDistrict[d].lateCount++; // over 6h is "late"
    }
  });

  const topDistricts = Object.entries(statsByDistrict)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5) // Top 5 most active districts
    .map(([name, s]) => ({
      name,
      outages_30d: s.count,
      avg_duration_hrs: s.resolved > 0 ? (s.totalDuration / s.resolved).toFixed(1) : 'Unknown',
      punctuality_score: s.resolved > 0 ? (100 - (s.lateCount / s.resolved * 100)).toFixed(0) + '%' : 'N/A',
    }));

  const prompt = `You are the GridGuard AI Intelligence Engine. Analyze this data from the Ethiopian Electric Utility (EEU):
TOP DISTRICTS HISTORY: ${JSON.stringify(topDistricts)}
LATEST RECENT DATA: ${JSON.stringify(history.slice(-15))}

Your task:
1. Identify the TOP 3 high-risk areas.
2. For each, ESTIMATE:
   - Manpower Needs: How many field technicians should be deployed?
   - Punctuality Risk: Why are they slow/not punctual here? (Research-based reasoning: grid age, terrain, or workload).
   - Detection Insight: What pattern did you find?

Return ONLY a JSON array:
[{"area": "...", "risk_level": "high|medium", "peak_hours": "HH:00-HH:00", "manpower": "X technicians", "punctuality_reason": "brief explanation", "insight": "pattern detection"}]

Output ONLY the raw JSON array. No text.`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://gridguard-eight.vercel.app',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!res.ok) throw new Error(`AI API error: ${res.status}`);

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty AI response');

    const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const s = cleaned.indexOf('[');
    const e = cleaned.lastIndexOf(']');
    if (s === -1 || e === -1) throw new Error('No JSON array in response');

    const aiInsights: Array<any> = JSON.parse(cleaned.substring(s, e + 1));

    const expiresAt = new Date(Date.now() + 6 * 3600 * 1000).toISOString();

    for (const insight of aiInsights) {
      const areaInfo = ETHIOPIAN_AREAS.find(
        a => a.area.toLowerCase() === insight.area?.toLowerCase()
      );
      if (!areaInfo) continue;

      // Reason summary now includes manpower and punctuality insights
      const complexSummary = `🤖 AI DETECTION: ${insight.insight} | 👷 Manpower: ${insight.manpower} | ⏱ Punctuality Risk: ${insight.punctuality_reason}`;

      await supabase.from('predictions').insert({
        location: `${insight.area} (AI Analysis)`,
        lat: areaInfo.coords[0],
        lng: areaInfo.coords[1],
        risk_level: insight.risk_level === 'high' ? 'high' : 'medium',
        confidence_score: insight.risk_level === 'high' ? 88 : 68,
        predicted_time_window: insight.peak_hours || 'Varies',
        reason_summary: complexSummary,
        source: 'ai',
        expires_at: expiresAt,
      });
    }

    await supabase.from('activity_logs').insert({
      event_type: 'ai_run',
      location: 'system_core',
      metadata: { insights: aiInsights.length, areas: aiInsights.map(i => i.area) },
    });

    console.log(`[Predictor] Deep AI analysis complete for ${aiInsights.length} areas`);
  } catch (err) {
    console.error('[Predictor] Deep AI analysis failed:', err);
  }
}
