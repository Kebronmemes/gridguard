// ============================================
// GridGuard — Production Sync Script (GitHub)
// ============================================
// Optimized for speed: larger chunks, minimal delays, global timeout.

import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EEU_URL = 'https://www.eeu.gov.et/power-interruption?lang=en';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Global timeout — kill the process after 5 minutes no matter what
const GLOBAL_TIMEOUT_MS = 5 * 60 * 1000;
setTimeout(() => {
  console.error('⏰ Global timeout reached (5 min). Exiting.');
  process.exit(1);
}, GLOBAL_TIMEOUT_MS).unref();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ⚡ Reliability-first models
const AI_MODELS = [
  'stepfun/step-3.5-flash:free',
  'openrouter/free',
  'arcee-ai/trinity-large-preview:free',
  'arcee-ai/trinity-mini:free'
];

// District Mapping Data
const ETHIOPIAN_AREAS = [
  { area: 'Bole', subcity: 'Bole', coords: [8.9806, 38.7578] },
  { area: 'Piassa', subcity: 'Arada', coords: [9.0300, 38.7469] },
  { area: 'Merkato', subcity: 'Addis Ketema', coords: [9.0107, 38.7350] },
  { area: 'Kazanchis', subcity: 'Kirkos', coords: [9.0120, 38.7630] },
  { area: 'Sarbet', subcity: 'Nifas Silk-Lafto', coords: [9.0010, 38.7420] },
  { area: 'Megenagna', subcity: 'Yeka', coords: [9.0190, 38.7890] },
  { area: 'Ayat', subcity: 'Yeka', coords: [9.0400, 38.8200] },
  { area: 'CMC', subcity: 'Yeka', coords: [9.0280, 38.8030] },
  { area: 'Bahir Dar', subcity: 'Bahir Dar', coords: [11.5742, 37.3614] },
  { area: 'Hawassa', subcity: 'Hawassa', coords: [7.0504, 38.4955] },
  { area: 'Dire Dawa', subcity: 'Dire Dawa', coords: [9.6009, 41.8501] },
  { area: 'Adama', subcity: 'Adama', coords: [8.5400, 39.2700] },
  { area: 'Jimma', subcity: 'Jimma', coords: [7.6667, 36.8333] },
  { area: 'Mekelle', subcity: 'Mekelle', coords: [13.4967, 39.4753] },
];

function matchDistrict(name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  return ETHIOPIAN_AREAS.find(a => 
    a.area.toLowerCase().includes(n) || n.includes(a.area.toLowerCase())
  );
}

async function callAI(prompt) {
  const startIdx = Math.floor(Math.random() * AI_MODELS.length);
  for (let m = 0; m < AI_MODELS.length; m++) {
    const model = AI_MODELS[(startIdx + m) % AI_MODELS.length];
    try {
      console.log(`🤖 AI: Trying ${model}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s per-request timeout
      
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
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
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        console.log(`⚠️ Throttled (429). Waiting 5s then trying next model...`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) return content;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('❌ AI request timed out (30s), trying next model...');
      } else {
        console.error('❌ AI attempt failed:', err.message);
      }
    }
  }
  return null;
}

async function main() {
  const t0 = Date.now();
  console.log('=== GridGuard Production Sync Start ===');

  // 1. Fetch
  const html = await (await fetch(EEU_URL)).text();
  console.log(`📡 Fetched ${html.length} chars of HTML`);

  // 2. Clear Targeted Extraction
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
  
  // Filter for Amharic + Numbers
  text = text.match(/[\u1200-\u137F0-9\s:/-]+/g)?.join(' ').replace(/\s+/g, ' ').trim() || '';
  console.log(`🧹 Extracted ${text.length} chars of data`);

  if (!text || text.length < 10) {
    console.log('❌ No meaningful text extracted. Exiting.');
    return;
  }

  // 3. Larger chunks = fewer AI calls = way faster
  const CHUNK_SIZE = 4000;
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }
  console.log(`📦 Sliced into ${chunks.length} chunks (${CHUNK_SIZE}ch each)`);

  // 4. Extraction — minimal delays between chunks
  const rawResults = [];
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`\n--- Chunk ${i + 1}/${chunks.length} ---`);
    const prompt = `
Extract power outages from this Amharic text.
ALWAYS translate "reason" to English (e.g., "maintenance", "system failure", "accident").
Map districts to correct subcities if possible.
Today is ${today}. 

Output ONLY a JSON array in this format:
[{"districts":["Bole"],"area":"Bole","start_time":"2026-03-19T07:30:00Z","end_time":"2026-03-19T17:30:00Z","reason":"Planned Maintenance"}]

Text:
${chunks[i]}
`;

    const res = await callAI(prompt);
    if (res) {
      try {
        const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
        const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
        if (s !== -1 && e !== -1) {
          const arr = JSON.parse(cleaned.substring(s, e + 1));
          rawResults.push(...arr);
        }
      } catch (e) { console.error('❌ JSON Parse Error in chunk:', e.message); }
    }
    
    // Short 2s delay between chunks (just enough to avoid burst rate limits)
    if (i < chunks.length - 1) {
      console.log('⏳ 2s delay...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (rawResults.length === 0) {
    console.log('❌ No data found.');
    return;
  }

  console.log(`\n✅ Extracted ${rawResults.length} outages from ${chunks.length} chunks`);

  // 5. Normalization Pass — only for large batches to avoid wasting time
  let finalOutages = rawResults;
  if (rawResults.length >= 10) {
    console.log('\n🧠 Final Normalization & Translation Pass...');
    const finalPrompt = `
Translate ALL "reason" fields to clean English. Fix Ethiopian district names.
Rules:
- DO NOT remove "reason"
- DO NOT change dates
Input Data:
${JSON.stringify(rawResults.slice(0, 50))}
Output ONLY JSON array.
`;

    const finalRes = await callAI(finalPrompt);
    if (finalRes) {
      try {
        const cleaned = finalRes.replace(/```json/gi, '').replace(/```/g, '').trim();
        const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
        if (s !== -1 && e !== -1) {
          finalOutages = JSON.parse(cleaned.substring(s, e + 1));
        }
      } catch { }
    }
  }

  // 6. Batch insert to Supabase (parallel, not sequential)
  console.log('\n📝 Saving items to Supabase...');
  
  const inserts = finalOutages.map(item => {
    const rawDistrict = item.districts?.[0] || 'Unknown';
    const matched = matchDistrict(rawDistrict);
    
    const finalDistrict = matched?.area || rawDistrict;
    const finalSubcity = matched?.subcity || finalDistrict;
    const finalLat = matched?.coords[0] || 9.0;
    const finalLng = matched?.coords[1] || 38.75;

    return {
      district: finalDistrict,
      subcity: finalSubcity,
      area: item.area || finalDistrict,
      cause: item.reason || 'Planned Maintenance',
      reason: item.reason || 'Planned Maintenance',
      start_time: item.start_time || new Date().toISOString(),
      end_time: item.end_time || null,
      type: 'planned',
      severity: 'moderate',
      lat: finalLat,
      lng: finalLng,
      affected_count: 0
    };
  });

  // Batch insert all at once
  const { error: insertErr } = await supabase.from('district_history').insert(inserts);
  if (insertErr) {
    console.error(`❌ Batch DB Error: ${insertErr.message}`);
    // Fallback: try one-by-one
    console.log('🔄 Retrying one-by-one...');
    for (const row of inserts) {
      const { error } = await supabase.from('district_history').insert(row);
      if (error) console.error(`   ❌ ${row.district}: ${error.message}`);
      else console.log(`   ✅ ${row.district}`);
    }
  } else {
    console.log(`   ✅ Batch inserted ${inserts.length} records`);
  }

  // Batch insert feed entries
  const feedEntries = finalOutages.map(item => {
    const rawDistrict = item.districts?.[0] || 'Unknown';
    const matched = matchDistrict(rawDistrict);
    const finalDistrict = matched?.area || rawDistrict;
    return {
      type: 'grid_update',
      message: `Planned outage: ${finalDistrict} (${item.reason || 'Maintenance'})`,
      area: finalDistrict
    };
  });

  const { error: feedErr } = await supabase.from('system_feed').insert(feedEntries);
  if (feedErr) console.error(`❌ Feed insert error: ${feedErr.message}`);
  else console.log(`   ✅ Added ${feedEntries.length} feed entries`);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n🎉 ALL DONE in ${elapsed}s!`);
}

main();
