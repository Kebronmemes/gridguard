// ============================================
// GridGuard — EEU Power Interruption Crawler
// ============================================
// Fetches power interruption data from EEU's public API.
// Translates Amharic content via Gemini, matches districts to coordinates.

import { translateAmharic, extractAllLocationsAndTimesFromHtml, extractLocationsAndTimes } from './gemini';
import * as cheerio from 'cheerio';
import { matchDistrict, ETHIOPIAN_AREAS, type EEUInterruption } from './store';
import { supabase } from '@/lib/supabase';

const EEU_API_BASE = 'https://www.eeu.gov.et';
const EEU_INTERRUPTION_ENDPOINT = '/power-interruption/latest-power-interruption';

interface EEUApiResponse {
  data?: Array<{
    id: number;
    title?: { en?: string; am?: string };
    body?: { en?: string; am?: string };
    summary?: { en?: string; am?: string };
    published_date?: string;
    media?: Array<{ url?: string }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Crawl EEU power interruption data, translate, and store results.
 * Returns the number of new interruptions found.
 */
export async function crawlEEUInterruptions(): Promise<{
  total: number;
  newEntries: number;
  errors: string[];
  interruptions: EEUInterruption[];
}> {
  const errors: string[] = [];
  const interruptions: EEUInterruption[] = [];

  try {
    // Fetch the latest power interruption page data
    const response = await fetch(`${EEU_API_BASE}${EEU_INTERRUPTION_ENDPOINT}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GridGuard/1.0 (Ethiopian Power Outage Monitor)',
      },
      signal: AbortSignal.timeout(15000), // 15s timeout for serverless
    });

    if (!response.ok) {
      errors.push(`EEU API returned ${response.status}`);
      // Try fetching the HTML page directly as fallback
      return await crawlEEUFromHTML(errors);
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data: EEUApiResponse = await response.json();
      if (!data.data || data.data.length === 0) {
        errors.push('EEU API returned empty JSON. Falling back to HTML scraping...');
        return await crawlEEUFromHTML(errors);
      }
      return processEEUJsonResponse(data, errors);
    } else {
      // HTML response — parse it
      const html = await response.text();
      return processEEUHtmlResponse(html, errors);
    }

  } catch (err) {
    errors.push(`Crawler error: ${err instanceof Error ? err.message : String(err)}`);
    return { total: 0, newEntries: 0, errors, interruptions };
  }
}

async function crawlEEUFromHTML(errors: string[]): Promise<{ total: number; newEntries: number; errors: string[]; interruptions: EEUInterruption[] }> {
  try {
    const response = await fetch(`${EEU_API_BASE}/power-interruption?lang=en`, {
      headers: { 'User-Agent': 'GridGuard/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      errors.push(`HTML fallback failed: ${response.status}`);
      return { total: 0, newEntries: 0, errors, interruptions: [] };
    }
    const html = await response.text();
    return processEEUHtmlResponse(html, errors);
  } catch (err) {
    errors.push(`HTML fallback error: ${err instanceof Error ? err.message : String(err)}`);
    return { total: 0, newEntries: 0, errors, interruptions: [] };
  }
}

async function processEEUJsonResponse(
  data: EEUApiResponse,
  errors: string[]
): Promise<{ total: number; newEntries: number; errors: string[]; interruptions: EEUInterruption[] }> {
  const interruptions: EEUInterruption[] = [];
  let newEntries = 0;

  const items = data.data || [];


  for (const item of items) {
    try {
      // Get title — prefer English, translate Amharic if needed
      let title = item.title?.en || '';
      if (!title && item.title?.am) {
        title = await translateAmharic(item.title.am);
      }
      if (!title) title = `EEU Interruption #${item.id}`;

      // Get body/summary
      let body = item.body?.en || item.summary?.en || '';
      if (!body && (item.body?.am || item.summary?.am)) {
        body = await translateAmharic(item.body?.am || item.summary?.am || '');
      }

      // Extract district/area info from title and body using Gemini
      const combinedText = title + '\n\n' + body;
      let extraction = await extractLocationsAndTimes(combinedText);
      
      // Fallback to regex if Gemini fails
      if (!extraction) {
        extraction = extractInterruptionDetails(combinedText);
      }
      
      const { districts, times } = extraction;

      for (const district of districts.length > 0 ? districts : ['Unknown']) {
        const matched = matchDistrict(district);
        const interruption: EEUInterruption = {
          id: `EEU-${item.id}-${district.substring(0, 4)}`.toUpperCase(),
          district: matched?.district || district,
          subcity: matched?.subcity || district,
          startTime: times.start || item.published_date || new Date().toISOString(),
          endTime: times.end || '',
          reason: title,
          sourceUrl: `${EEU_API_BASE}/power-interruption/detail/${item.id}`,
          coordinates: matched?.coords || null,
          translatedFrom: item.title?.am || '',
          fetchedAt: new Date().toISOString(),
          active: true,
        };

        const { data: existing } = await supabase.from('district_history')
          .select('id').eq('cause', interruption.reason).eq('district', interruption.district).is('end_time', null);

        if (!existing || existing.length === 0) {
          await supabase.from('district_history').insert({
            district: interruption.district,
            subcity: interruption.subcity,
            cause: interruption.reason,
            start_time: interruption.startTime,
            type: 'planned',
            severity: 'moderate',
            lat: interruption.coordinates?.[0] || 9.0,
            lng: interruption.coordinates?.[1] || 38.75,
            affected_count: 0
          });

          interruptions.push(interruption);
          newEntries++;

          await supabase.from('system_feed').insert({
            type: 'grid_update',
            message: `EEU scheduled interruption: ${interruption.reason} — ${interruption.subcity}`,
            area: interruption.subcity,
          });
        }
      }
    } catch (err) {
      errors.push(`Failed to process item ${item.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { total: items.length, newEntries, errors, interruptions };
}

async function processEEUHtmlResponse(
  html: string,
  errors: string[]
): Promise<{ total: number; newEntries: number; errors: string[]; interruptions: EEUInterruption[] }> {
  const interruptions: EEUInterruption[] = [];
  let newEntries = 0;

  // The EEU website uses Inertia.js, so the actual data is injected as a JSON string in the data-page attribute
  const inertiaMatch = html.match(/data-page="([^"]+)"/);
  const structuredItems: any[] = [];

  if (inertiaMatch && inertiaMatch[1]) {
    try {
      // Decode HTML entities in the JSON string
      const jsonStr = inertiaMatch[1].replace(/&quot;/g, '"');
      const pageData = JSON.parse(jsonStr);
      
      const items = pageData?.props?.result?.data || [];
      
      // Parse the HTML table inside each item's detail
      for (const item of items) {
        const contentable = item.contentable || {};
        const title = contentable.title || 'Power Interruption';
        const rawHtml = contentable.detail || '';
        
        if (!rawHtml) continue;
        
        // Use cheerio to parse the HTML table cleanly
        const $ = cheerio.load(rawHtml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
        
        $('tr').each((i, row) => {
          // Skip header row
          if (i === 0) return;
          
          const cols = $(row).find('td').map((_, td) => $(td).text().trim().replace(/\s+/g, ' ')).get();
          
          if (cols.length >= 6) {
             // Typical format: [No, Region/City, Date, Reason, Affected Areas, Duration]
             // We pad to ensure we get the right columns depending on exactly how it's drawn
             const entry = {
                title: title,
                city: cols[1] || '',
                date: cols[2] || '',
                reason: cols[3] || '',
                affectedAreas: cols[4] || '',
                time: cols[5] || ''
             };
             // Only add if it looks like actual data
             if (entry.affectedAreas && entry.affectedAreas.length > 5) {
               structuredItems.push(entry);
             }
          }
        });
      }
    } catch (e) {
      console.error('Failed to parse Inertia JSON or HTML:', e);
      errors.push('Failed to parse the structured Inertia payload.');
    }
  }

  if (structuredItems.length === 0) {
    errors.push('Could not extract structured table data from the HTML.');
    return { total: 0, newEntries: 0, errors, interruptions };
  }

  // Batch into chunks of 5 items so we don't overwhelm Gemini or hit size limits
  const CHUNK_SIZE = 5;
  let totalExtracted = 0;

  for (let c = 0; c < structuredItems.length; c += CHUNK_SIZE) {
    const chunk = structuredItems.slice(c, c + CHUNK_SIZE);
    
    // Convert this chunk back to a clean string format for Gemini to translate and map
    // The previous text conversion failed because the prompt expected structured JSON data.
    const chunkText = JSON.stringify(chunk, null, 2);

    console.log(`[Crawler] Sending chunk ${(c / CHUNK_SIZE) + 1} to Gemini...`);

    let extractedOutages: any[] = [];
    let retries = 3;
    while (retries > 0) {
      try {
        extractedOutages = await extractAllLocationsAndTimesFromHtml(chunkText);
        break; // Success
      } catch (err: any) {
        console.error(`[Crawler] Chunk ${(c / CHUNK_SIZE) + 1} failed (Retries left: ${retries - 1}):`, err?.message || err);
        retries--;
        if (retries === 0) {
          errors.push(`Gemini chunk ${(c / CHUNK_SIZE) + 1} extraction failed completely.`);
        } else {
          // Wait 5 seconds before retrying (rate limit handling)
          await new Promise(res => setTimeout(res, 5000));
        }
      }
    }

    totalExtracted += extractedOutages.length;

      // Map Gemini results into our system
      for (let i = 0; i < extractedOutages.length; i++) {
        const outage = extractedOutages[i];
        
        for (const district of outage.districts) {
          const matched = matchDistrict(district);
          // Only add if we successfully matched it to a valid geographic area
          if (matched || district.length > 2) {
            const finalDistrict = matched?.district || district;
            const interruption: EEUInterruption = {
              id: `EEU-HTML-${Date.now()}-${c}-${i}-${finalDistrict.substring(0, 4)}`.toUpperCase(),
              district: finalDistrict,
              subcity: matched?.subcity || finalDistrict,
              startTime: outage.start_time || new Date().toISOString(),
              endTime: outage.end_time || '',
              reason: outage.reason || 'EEU Power Interruption',
              sourceUrl: `${EEU_API_BASE}/power-interruption?lang=en`,
              coordinates: matched?.coords || null,
              translatedFrom: 'Structured EEU Table Data',
              fetchedAt: new Date().toISOString(),
              active: true,
            };

            const { data: existing } = await supabase.from('district_history')
              .select('id')
              .eq('district', interruption.district)
              .gte('start_time', interruption.startTime)
              .is('end_time', null);

            if (!existing || existing.length === 0) {
              await supabase.from('district_history').insert({
                district: interruption.district,
                subcity: interruption.subcity,
                cause: interruption.reason,
                start_time: interruption.startTime,
                type: 'planned',
                severity: 'moderate',
                lat: interruption.coordinates?.[0] || 9.0,
                lng: interruption.coordinates?.[1] || 38.75,
              });

              interruptions.push(interruption);
              newEntries++;
            }
          }
        }
      }
    
    // Delay between chunks to prevent rate limits
    await new Promise(res => setTimeout(res, 6000));
  }

  if (totalExtracted === 0 && structuredItems.length > 0) {
     errors.push('Gemini processed the data but could not extract any valid map coordinates.');
  }

  return { total: totalExtracted, newEntries, errors, interruptions };
}

/**
 * Extract district names and time info from text.
 */
function extractInterruptionDetails(text: string): {
  districts: string[];
  times: { start: string; end: string };
} {
  const districts: string[] = [];
  const times = { start: '', end: '' };

  // Match known area names
  for (const area of ETHIOPIAN_AREAS) {
    if (text.toLowerCase().includes(area.area.toLowerCase())) {
      districts.push(area.area);
    }
    if (text.toLowerCase().includes(area.subcity.toLowerCase()) && !districts.includes(area.area)) {
      districts.push(area.area);
    }
  }

  // Extract time patterns (e.g., "08:00 AM to 05:00 PM", "8:00-17:00")
  const timePattern = /(\d{1,2}[:.]\d{2}\s*(?:AM|PM)?)\s*(?:to|–|-|until)\s*(\d{1,2}[:.]\d{2}\s*(?:AM|PM)?)/gi;
  const timeMatch = text.match(timePattern);
  if (timeMatch && timeMatch[0]) {
    const parts = timeMatch[0].split(/\s*(?:to|–|-|until)\s*/i);
    if (parts.length === 2) {
      times.start = parts[0].trim();
      times.end = parts[1].trim();
    }
  }

  // Extract date patterns
  const datePattern = /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    try {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) {
        times.start = times.start ? `${dateMatch[1]} ${times.start}` : d.toISOString();
      }
    } catch { /* ignore invalid dates */ }
  }

  return { districts, times };
}

/**
 * Mark old EEU interruptions as inactive.
 */
export async function deactivateOldInterruptions(maxAgeHours = 48) {
  const cutoff = new Date(Date.now() - maxAgeHours * 3600000).toISOString();

  await supabase.from('district_history')
    .update({ end_time: new Date().toISOString() })
    .is('end_time', null)
    .lte('start_time', cutoff)
    .eq('type', 'planned');
}
