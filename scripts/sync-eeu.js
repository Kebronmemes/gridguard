// ============================================
// GridGuard — Production Sync Script (GitHub)
// ============================================
// This script runs on GitHub Actions.
// 20s wait logic + 1000ch chunking + Normalization.

import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

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

// ⚡ Same models as user's working test_pipeline
const AI_MODELS = [
  'openrouter/free',
  'stepfun/step-3.5-flash:free',
  'arcee-ai/trinity-large-preview:free',
  'arcee-ai/trinity-mini:free'
];

// District Mapping Data (simplified version for the script)
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
      });

      if (res.status === 429) {
        console.log('⚠️ Throttled (429). Waiting 20s backoff...');
        await new Promise(r => setTimeout(r, 20000));
        continue;
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) return content;
    } catch (err) {
      console.error('❌ AI attempt failed:', err.message);
    }
  }
  return null;
}

async function main() {
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

  // 3. Chunking (1000ch)
  const chunks = [];
  for (let i = 0; i < text.length; i += 1000) {
    chunks.push(text.substring(i, i + 1000));
  }
  console.log(`📦 Sliced into ${chunks.length} chunks`);

  // 4. Extraction
  const rawResults = [];
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`\n--- Chunk ${i + 1}/${chunks.length} ---`);
    const prompt = `
Extract power outages from this Amharic text.
ALWAYS translate "reason" to English (e.g., "maintenance", "system failure", "accident").
Map districts to correct subcities if possible.
Today: ${today}. Output ONLY JSON array:
[{"districts":["Bole"],"start_time":"2026-03-19T07:30:00Z","end_time":"2026-03-19T17:30:00Z","reason":"Planned Maintenance"}]
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
      } catch { }
    }
    // 20s AI cooldown as requested
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 20000));
  }

  if (rawResults.length === 0) {
    console.log('❌ No data found.');
    return;
  }

  // 5. Normalization Pass (Translate & Fix Names)
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
  let finalOutages = rawResults;
  if (finalRes) {
    try {
      const cleaned = finalRes.replace(/```json/gi, '').replace(/```/g, '').trim();
      const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
      if (s !== -1 && e !== -1) {
        finalOutages = JSON.parse(cleaned.substring(s, e + 1));
      }
    } catch { }
  }

  // 6. Insertion with Fuzzy Matching
  console.log('\n📝 Saving items to Supabase...');
  for (const item of finalOutages) {
    const rawDistrict = item.districts?.[0] || 'Unknown';
    const matched = matchDistrict(rawDistrict);
    
    const finalDistrict = matched?.area || rawDistrict;
    const finalSubcity = matched?.subcity || finalDistrict;
    const finalLat = matched?.coords[0] || 9.0;
    const finalLng = matched?.coords[1] || 38.75;

    console.log(`   -> Saving: ${finalDistrict} | ${item.reason}`);

    const { error: insertErr } = await supabase.from('district_history').insert({
      district: finalDistrict,
      subcity: finalSubcity,
      cause: item.reason || 'Planned Maintenance',
      start_time: item.start_time,
      end_time: item.end_time || null,
      type: 'planned',
      severity: 'moderate',
      lat: finalLat,
      lng: finalLng,
      affected_count: 0
    });

    if (insertErr) console.error(`   ❌ DB Error: ${insertErr.message}`);
    else {
      // Add to feed
      await supabase.from('system_feed').insert({
        type: 'grid_update',
        message: `Planned outage: ${finalDistrict} (${item.reason})`,
        area: finalDistrict
      });
    }
  }

  console.log('\n🎉 ALL DONE!');
}

main();
