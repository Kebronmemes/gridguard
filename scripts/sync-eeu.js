// ============================================
// GridGuard — Production Sync Script (GitHub)
// ============================================
// Based on test-sync-speed.js pattern + Supabase insertion.

import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Polyfill for Next.js internal variables so predictor.ts can compile in Node
global.process.env.NEXT_RUNTIME = 'nodejs';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EEU_URL = 'https://www.eeu.gov.et/power-interruption?lang=en';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AI_MODELS = [
  'stepfun/step-3.5-flash:free',
  'openrouter/free',
  'arcee-ai/trinity-large-preview:free',
  'arcee-ai/trinity-mini:free'
];

// District Mapping Data (Addis Ababa only)
const ETHIOPIAN_AREAS = [
  { area: 'Bole', subcity: 'Bole', coords: [8.9806, 38.7578] },
  { area: 'Piassa', subcity: 'Arada', coords: [9.0300, 38.7469] },
  { area: 'Merkato', subcity: 'Addis Ketema', coords: [9.0107, 38.7350] },
  { area: 'Kazanchis', subcity: 'Kirkos', coords: [9.0120, 38.7630] },
  { area: 'Sarbet', subcity: 'Nifas Silk-Lafto', coords: [9.0010, 38.7420] },
  { area: 'Megenagna', subcity: 'Yeka', coords: [9.0190, 38.7890] },
  { area: 'Ayat', subcity: 'Yeka', coords: [9.0400, 38.8200] },
  { area: 'CMC', subcity: 'Yeka', coords: [9.0280, 38.8030] },
  { area: 'Akaki Kaliti', subcity: 'Akaki Kaliti', coords: [8.8873, 38.7800] },
  { area: 'Kolfe Keranio', subcity: 'Kolfe Keranio', coords: [9.0050, 38.7100] },
  { area: 'Lideta', subcity: 'Lideta', coords: [9.0080, 38.7300] },
  { area: 'Kirkos', subcity: 'Kirkos', coords: [9.0050, 38.7480] },
  { area: 'Nifas Silk-Lafto', subcity: 'Nifas Silk-Lafto', coords: [8.9700, 38.7400] },
  { area: 'Yeka', subcity: 'Yeka', coords: [9.0350, 38.8000] },
  { area: 'Gulele', subcity: 'Gulele', coords: [9.0520, 38.7350] },
  { area: 'Arada', subcity: 'Arada', coords: [9.0350, 38.7450] },
  { area: 'Addis Ketema', subcity: 'Addis Ketema', coords: [9.0150, 38.7350] },
  { area: 'Lemi Kura', subcity: 'Lemi Kura', coords: [9.0100, 38.8300] },
  { area: 'Jomo', subcity: 'Nifas Silk-Lafto', coords: [8.9600, 38.7000] },
  { area: 'Lebu', subcity: 'Nifas Silk-Lafto', coords: [8.9500, 38.7200] },
  { area: 'Atlas', subcity: 'Bole', coords: [9.0180, 38.7830] },
  { area: 'Gotera', subcity: 'Kirkos', coords: [8.9900, 38.7600] },
  { area: 'Gerji', subcity: 'Bole', coords: [9.0000, 38.8000] },
  { area: 'Bulbula', subcity: 'Bole', coords: [8.9700, 38.7800] },
  { area: 'Summit', subcity: 'Bole', coords: [9.0200, 38.8500] },
];

function matchDistrict(name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  return ETHIOPIAN_AREAS.find(a =>
    a.area.toLowerCase().includes(n) || 
    n.includes(a.area.toLowerCase()) ||
    a.subcity.toLowerCase().includes(n) ||
    n.includes(a.subcity.toLowerCase())
  );
}

async function callAI(prompt) {
  const startIdx = Math.floor(Math.random() * AI_MODELS.length);
  for (let m = 0; m < AI_MODELS.length; m++) {
    const model = AI_MODELS[(startIdx + m) % AI_MODELS.length];
    
    // 60-second AbortController to prevent hangs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000 * 3); // 3 mins for Pass 2

    try {
      console.log(`🤖 AI: Trying ${model}...`);
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://gridguard-eight.vercel.app',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
      });
      clearTimeout(timeout);
      
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) return content;
    } catch (err) {
      console.error(`❌ ${model} failed, searching for next...`);
    }
  }
  return null;
}

// ── Pass 2: Final Verification ──
async function verifyOutages(rawList) {
  console.log(`\n🕵️ Pass 2: Verifying ${rawList.length} outages...`);
  
  const VALID_NEIGHBORHOODS = [
    "Bole", "Piassa", "Merkato", "Arada", "Kazanchis", "Sarbet", "Megenagna", "Ayat", "CMC", 
    "Akaki Kaliti", "Kolfe Keranio", "Lideta", "Kirkos", "Nifas Silk-Lafto", "Yeka", "Gulele", 
    "Addis Ketema", "Lemi Kura", "Jomo", "Lebu", "Atlas", "Gotera", "Gerji", "Bulbula", "Summit",
    "Addis Ababa University", "Petros Hospital", "Gion", "Kilinto", "Tuludimtu", "Kotebe", "Shiro Meda"
  ];

  const prompt = `
Verify and Clean these power outage records for Addis Ababa.
STRICT RULES:
1. NEIGHBORHOOD CHECK: Discard any neighborhood that doesn't exist in Addis Ababa.
2. WHITELIST: Prefer these names if they match: [${VALID_NEIGHBORHOODS.join(', ')}].
3. NO AMHARIC: All fields MUST be in perfect English. 
4. DATE CHECK: All dates MUST be Gregorian (2026/2027). If it says 2018 EC, convert to 2026 GC.
5. GEOCODING: For each entry, provide the most accurate Latitude and Longitude you can identify for that neighborhood in Addis Ababa.
6. DE-DUPLICATE: If multiple entries describe the same area and time, merge them into one.
7. NO HALLUCINATION: If a location or reason is nonsense, discard it.

Output ONLY a JSON array.

Input Data:
${JSON.stringify(rawList, null, 2)}

Example Item Record Format:
{
  "districts": ["Bole"],
  "area": "Bole (Woreda 03)",
  "lat": 8.9806,
  "lng": 38.7578,
  "start_time": "2026-03-19T07:30:00Z",
  "end_time": "2026-03-19T17:30:00Z",
  "reason": "Planned Maintenance",
  "severity": "moderate"
}`;

  const res = await callAI(prompt);
  if (!res) return rawList; // Fallback to raw if Pass 2 fails

  try {
    const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
    const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
    if (s !== -1 && e !== -1) {
      const verified = JSON.parse(cleaned.substring(s, e + 1));
      console.log(`✅ Pass 2 Complete: ${verified.length} verified items.`);
      return verified;
    }
  } catch (e) {
    console.error(`❌ Pass 2 Parse failed: ${e.message}`);
  }
  return rawList;
}

async function main() {
  const startTime = Date.now();
  console.log('=== GridGuard Production Sync Start ===');

  // 1. Fetch
  const html = await (await fetch(EEU_URL)).text();
  console.log(`📡 Fetched ${html.length} chars of HTML`);

  // 2. Extraction
  let text = '';
  const match = html.match(/data-page="([^"]+)"/);
  if (match) {
    const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    try {
      const json = JSON.parse(decoded);
      const items = json.props?.result?.data || [];
      items.forEach(item => {
        const c = item.contentable || item;
        text += (c.title || '') + ' ' + (c.detail || c.body || '') + ' ';
      });
    } catch { }
  }
  if (!text) text = html;

  text = text.match(/[\u1200-\u137F0-9\s:/-]+/g)?.join(' ').replace(/\s+/g, ' ').trim() || '';
  console.log(`🧹 Extracted ${text.length} chars of data`);

  // 3. Chunking (1200ch for better AI focus)
  const CHUNK_SIZE = 1200;
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }
  console.log(`📦 Sliced into ${chunks.length} chunks`);

  // 4. Sequential Extraction
  console.log(`\n🧵 Processing ${chunks.length} chunks sequentially...`);
  const today = new Date().toISOString().split('T')[0];
  const allOutages = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`--- Chunk ${i + 1}/${chunks.length} ---`);
    const prompt = `
Extract power outages from this Amharic text and convert EVERYTHING to English and Gregorian Calendar.
SOURCE CONTEXT:
- The dates in the text are in the ETHIOPIAN CALENDAR (EC).
- You MUST convert these to the GREGORIAN CALENDAR (GC) for the year 2026.
- (Note: 2018 EC corresponds to roughly 2025/2026 GC).

STRICT RULES:
1. ONLY extract locations within Addis Ababa City.
2. TRANSLATE ALL Amharic area names, sub-cities, and reasons to English.
3. CONVERT all dates to Gregorian (yyyy-mm-ddThh:mm:ssZ).
4. If you see Amharic characters in your final JSON, you have FAILED.
5. Output ONLY a valid JSON array. Discard non-Addis entries.

Today (Gregorian) is ${today}. 

JSON Format Example:
[{"districts":["Bole"],"area":"Bole (Woreda 03)","start_time":"2026-03-19T07:30:00Z","end_time":"2026-03-19T17:30:00Z","reason":"Planned Grid Maintenance","severity":"moderate"}]

Text:
${chunks[i]}`;

    const res = await callAI(prompt);

    if (res) {
      console.log(`\n📄 AI Response (Chunk ${i+1}):\n${res}\n`);
      try {
        const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
        const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
        if (s !== -1 && e !== -1) {
          const arr = JSON.parse(cleaned.substring(s, e + 1));
          
          // Final Safety: Filter for English only AND enforce 2026 YEAR ONLY
          const amharicRegex = /[\u1200-\u137F]/;
          const currentYear = "2026"; // Hard-enforce current year

          const translatedArr = arr.filter(item => {
            const hasAmharic = amharicRegex.test(item.area || '') || 
                               amharicRegex.test(item.reason || '') || 
                               amharicRegex.test(item.districts?.[0] || '');
            
            // Check if start_time exists and is explicitly in 2026/2027
            // This prevents the "weird" 2018 data from appearing.
            const isStale = !item.start_time || (!item.start_time.includes('2026') && !item.start_time.includes('2027'));
            
            if (hasAmharic) {
              console.log(`   🚨 Blocked: Amharic text detected for ${item.area}`);
              return false;
            }
            if (isStale) {
              console.log(`   🚨 Blocked: Invalid/Stale year detected: ${item.start_time} for ${item.area}`);
              return false;
            }
            return true;
          });

          allOutages.push(...translatedArr);
        }
      } catch (e) {
        console.error(`❌ JSON Parse failed for chunk ${i+1}: ${e.message}`);
      }
    }
 else {
      console.error(`❌ No response.`);
    }

    // 1s delay between requests (Turbo mode)
    if (i < chunks.length - 1) {
      console.log('⏳ 1s delay...');
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (allOutages.length === 0) {
    console.log('❌ No outage data found in Pass 1.');
    return;
  }

  console.log(`\n✅ Pass 1 Extracted ${allOutages.length} total outages`);

  // 4b. Step 2: Final Verification Pass
  const verifiedOutages = await verifyOutages(allOutages);

  // 5. Save to Supabase
  console.log('\n📝 Saving strictly verified data to Supabase...');

  // Fetch recent records to avoid duplication with DB
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: existingRecords } = await supabase
    .from('district_history')
    .select('district, cause, start_time')
    .gt('start_time', oneWeekAgo);

  for (const item of verifiedOutages) {
    const rawDistrict = item.districts?.[0] || item.area || 'Unknown';
    const matched = matchDistrict(rawDistrict);

    const finalDistrict = matched?.area || rawDistrict;
    const finalSubcity = matched?.subcity || finalDistrict;
    // Select Coordinates: AI-provided > Whitelist > Default Center
    const finalLat = item.lat || matched?.coords[0] || 9.0;
    const finalLng = item.lng || matched?.coords[1] || 38.75;

    // 1. Strict filter for generic city-wide "Addis Ababa"
    const isGeneric = finalDistrict.toLowerCase().replace(/\s+/g, '') === 'addisababa' || 
                      finalDistrict.toLowerCase().replace(/\s+/g, '') === 'addisabeba';
                      
    if (isGeneric) {
      console.log(`   ⏭️ Skipped (Generic City): ${finalDistrict}`);
      continue;
    }

    // 2. Amharic Character Filter (Fail-safe)
    const amharicRegex = /[\u1200-\u137F]/;
    const isAmharic = amharicRegex.test(finalDistrict) || 
                      amharicRegex.test(finalSubcity) || 
                      amharicRegex.test(item.reason || '') ||
                      amharicRegex.test(item.area || '');

    if (isAmharic) {
      console.log(`   🚨 Blocked: Amharic text detected for ${finalDistrict}`);
      continue;
    }

    // 3. Deduplication Check (Strict)
    // Avoid double-inserting the same outage in the same district on the same day
    const isDuplicate = existingRecords?.some(r => {
      const sameDistrict = r.district === finalDistrict;
      const sameTime = Math.abs(new Date(r.start_time).getTime() - new Date(item.start_time || new Date().toISOString()).getTime()) < 24 * 3600 * 1000;
      return sameDistrict && sameTime;
    });

    if (isDuplicate) {
      console.log(`   ⏭️ Skipped (Existing): ${finalDistrict} | ${item.start_time}`);
      continue;
    }

    console.log(`   -> Saving: ${finalDistrict} | ${item.reason}`);

    const { error: insertErr } = await supabase.from('district_history').insert({
      district: finalDistrict,
      subcity: finalSubcity,
      area: item.area || finalDistrict,
      cause: item.reason || 'Planned Maintenance',
      reason: item.reason || 'Planned Maintenance',
      start_time: item.start_time || new Date().toISOString(),
      end_time: item.end_time || null,
      type: 'planned',
      severity: item.severity || 'moderate',
      lat: finalLat,
      lng: finalLng,
      affected_count: 0
    });

    if (insertErr) {
      console.error(`   ❌ DB Error: ${insertErr.message}`);
    } else {
      // Add to feed
      await supabase.from('system_feed').insert({
        type: 'grid_update',
        message: `Grid Status: Outage in ${finalDistrict} (${item.reason || 'Maintenance'})`,
        area: finalDistrict
      });
      console.log(`   ✅ Saved: ${finalDistrict}`);
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n🎉 ALL DONE in ${duration.toFixed(1)}s!`);
}

main();
