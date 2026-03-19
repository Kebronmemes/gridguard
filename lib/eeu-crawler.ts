// ============================================
// GridGuard — EEU Power Interruption Crawler
// ============================================
// Simple pipeline:
//   1. Fetch https://www.eeu.gov.et/power-interruption/
//   2. Extract text from Inertia.js data-page attribute OR raw HTML
//   3. Send to AI (OpenRouter) → get English districts, times, reasons
//   4. Save to Supabase district_history + system_feed

import { extractOutagesFromText } from './gemini';
import { matchDistrict, type EEUInterruption } from './store';
import { supabase } from '@/lib/supabase';

const EEU_URL = 'https://www.eeu.gov.et/power-interruption/';


/**
 * Main entry point: crawl EEU, translate via AI, save to Supabase.
 */
export async function crawlEEUInterruptions(): Promise<{
  total: number;
  newEntries: number;
  errors: string[];
  interruptions: EEUInterruption[];
}> {
  const errors: string[] = [];
  const interruptions: EEUInterruption[] = [];
  let newEntries = 0;

  try {
    // ── Step 1: Fetch the EEU page ──
    console.log('[Crawler] Fetching EEU page...');
    const response = await fetch(EEU_URL, {
      headers: {
        'User-Agent': 'GridGuard/1.0 (Ethiopian Power Outage Monitor)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'am,en;q=0.9',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      errors.push(`EEU website returned ${response.status}`);
      return { total: 0, newEntries: 0, errors, interruptions };
    }

    const html = await response.text();
    console.log(`[Crawler] Got ${html.length} chars of HTML`);

    // ── Step 2 & 3: Extract & Process ──
    // We pass the raw HTML to extractOutagesFromText. 
    // Internally, it handles Inertia extraction, Amharic-only filtering, and 1000-char chunking.
    console.log(`[Crawler] Processing full HTML (${html.length} chars) with AI...`);
    const extractedOutages = await extractOutagesFromText(html);
    
    console.log(`[Crawler] AI returned ${extractedOutages.length} normalized outages`);

    if (extractedOutages.length === 0) {
      console.log('[Crawler] No outage data found in this sync.');
      return { total: 0, newEntries: 0, errors, interruptions };
    }

    // ── Step 4: Save each outage to Supabase ──
    for (const outage of extractedOutages) {
      for (const district of outage.districts) {
        const matched = matchDistrict(district);
        if (!matched && district.length < 3) continue;

        const finalDistrict = matched?.area || district;
        const lat = matched?.coords[0] || 9.0;
        const lng = matched?.coords[1] || 38.75;

        // Check for duplicates (same district in last 24h)
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existing, error: checkError } = await supabase
          .from('district_history')
          .select('id')
          .eq('district', finalDistrict)
          .gte('created_at', dayAgo);

        if (checkError) {
          console.error(`[Crawler] Error checking duplicates for ${finalDistrict}:`, checkError.message);
        }

        if (existing && existing.length > 0) {
          console.log(`[Crawler] Skipping duplicate: ${finalDistrict} (found ${existing.length} recent entry)`);
          continue;
        }

        // Insert into district_history
        console.log(`[Crawler] Inserting ${finalDistrict} into Supabase...`);
        const { error: insertErr } = await supabase.from('district_history').insert({
          district: finalDistrict,
          subcity: matched?.subcity || finalDistrict,
          cause: outage.reason || 'EEU Power Interruption',
          start_time: outage.start_time || new Date().toISOString(),
          end_time: outage.end_time || null,
          type: 'planned',
          severity: outage.severity || 'moderate',
          lat,
          lng,
          affected_count: 0,
        });

        if (insertErr) {
          console.error(`[Crawler] ❌ Failed to insert ${finalDistrict}:`, insertErr.message);
          errors.push(`Insert failed for ${finalDistrict}: ${insertErr.message}`);
          continue;
        }

        console.log(`[Crawler] ✅ Saved successfully: ${finalDistrict}`);

        // Add to system feed
        await supabase.from('system_feed').insert({
          type: 'grid_update',
          message: `EEU: ${outage.reason || 'Power interruption'} — ${finalDistrict}`,
          area: finalDistrict,
        });

        interruptions.push({
          id: `EEU-${Date.now()}-${finalDistrict.substring(0, 4)}`.toUpperCase(),
          district: finalDistrict,
          subcity: matched?.subcity || finalDistrict,
          startTime: outage.start_time || new Date().toISOString(),
          endTime: outage.end_time || null,
          reason: outage.reason || 'EEU Power Interruption',
          sourceUrl: EEU_URL,
          coordinates: matched?.coords || null,
          translatedFrom: 'EEU Website (Amharic)',
          fetchedAt: new Date().toISOString(),
          active: true,
          severity: outage.severity || 'moderate',
        });

        newEntries++;
        console.log(`[Crawler] ✅ Saved: ${finalDistrict} — ${outage.reason}`);
      }
    }

    console.log(`[Crawler] Done! ${newEntries} new entries saved.`);
    return { total: extractedOutages.length, newEntries, errors, interruptions };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Crawler error: ${msg}`);
    console.error('[Crawler] Fatal error:', msg);
    return { total: 0, newEntries: 0, errors, interruptions };
  }
}

/**
 * Mark old outages as resolved.
 */
export async function deactivateOldInterruptions(maxAgeHours = 48) {
  const cutoff = new Date(Date.now() - maxAgeHours * 3600000).toISOString();
  await supabase
    .from('district_history')
    .update({ end_time: new Date().toISOString() })
    .is('end_time', null)
    .lte('start_time', cutoff)
    .eq('type', 'planned');
}
