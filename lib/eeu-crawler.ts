// ============================================
// GridGuard — EEU Power Interruption Crawler
// ============================================
// Simple pipeline:
//   1. Fetch https://www.eeu.gov.et/power-interruption/
//   2. Extract text from Inertia.js data-page attribute OR raw HTML
//   3. Send to AI (OpenRouter) → get English districts, times, reasons
//   4. Save to Supabase district_history + system_feed

import { extractOutagesFromText, researchPlaces } from './gemini';
import { matchDistrict, type EEUInterruption } from './store';
import { supabase } from '@/lib/supabase';
import webpush from 'web-push';

// Configuration for Browser Push Notifications
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@gridguard-eth.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

/**
 * Notifies browser subscribers for a specific area.
 */
async function notifyPushSubscribers(area: string, reason: string, severity: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  
  console.log(`[Push] Checking subscribers for ${area}...`);
  try {
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('area', area);

    if (error || !subs || subs.length === 0) return;

    console.log(`[Push] Sending ${subs.length} notifications for ${area}`);
    
    const payload = JSON.stringify({
      title: `⚡ Power Alert: ${area}`,
      body: `Status: ${severity.toUpperCase()}\nReason: ${reason}`,
      url: '/map',
      tag: `outage-${area}`
    });

    const promises = subs.map(s => {
      const subscription = {
        endpoint: s.endpoint,
        keys: { auth: s.auth, p256dh: s.p256dh }
      };
      return webpush.sendNotification(subscription, payload).catch((e: any) => {
        if (e.statusCode === 410 || e.statusCode === 404) {
          // Clean up expired subscriptions
          return supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      });
    });

    await Promise.all(promises);
  } catch (err) {
    console.error('[Push] Notify failed:', err);
  }
}

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

    // ── Step 4: Research unknown places ──
    const unknownDistricts = extractedOutages
      .flatMap(o => o.districts)
      .filter(d => !matchDistrict(d) && d.length > 3);
    
    const researched = unknownDistricts.length > 0 
      ? await researchPlaces(unknownDistricts) 
      : {};

    // ── Step 5: Save each outage to Supabase ──
    for (const outage of extractedOutages) {
      for (const district of outage.districts) {
        const matched = matchDistrict(district);
        const researchResult = researched[district];

        // Skip if not in Addis
        if (!matched && (!researchResult || !researchResult.isAddis)) {
          console.log(`[Crawler] Skipping non-Addis or unverified area: ${district}`);
          continue;
        }

        const finalDistrict = researchResult?.englishName || matched?.area || district;
        const lat = researchResult?.lat || matched?.coords[0] || null;
        const lng = researchResult?.lng || matched?.coords[1] || null;

        if (!lat || !lng) {
          console.log(`[Crawler] Skipping ${finalDistrict} - No coordinates found.`);
          continue;
        }

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
          area: outage.area || finalDistrict,
          cause: outage.reason || 'EEU Power Interruption',
          reason: outage.reason || 'EEU Power Interruption',
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

        // ── TRIGGER PUSH NOTIFICATIONS ──
        // Only notify if it's a new entry that we just successfully saved
        console.log(`[Crawler] 📣 Sending push alerts for ${finalDistrict}...`);
        await notifyPushSubscribers(finalDistrict, outage.reason || 'Outage', outage.severity || 'moderate').catch(e => console.error('[Push] Notify failed for district:', e));
        
        // Also notify for subcity (e.g. "Bole") if it's different
        if (matched?.subcity && matched.subcity !== finalDistrict) {
          console.log(`[Crawler] 📣 Sending push alerts for subcity ${matched.subcity}...`);
          await notifyPushSubscribers(matched.subcity, outage.reason || 'Outage', outage.severity || 'moderate').catch(e => console.error('[Push] Notify failed for subcity:', e));
        }
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
