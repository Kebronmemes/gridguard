// ============================================
// GridGuard AI Pipeline — FINAL (With Reason Fix)
// ============================================

import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const EEU_URL = 'https://www.eeu.gov.et/power-interruption?lang=en';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ============================
// MODELS (SAFE + WORKING)
// ============================
const AI_MODELS = [
  'openrouter/free',
  'stepfun/step-3.5-flash:free',
  'arcee-ai/trinity-large-preview:free',
  'arcee-ai/trinity-mini:free'
];

// ============================
// AI CALL (ROTATION + BACKOFF)
// ============================
async function callAI(prompt) {
  const startIdx = Math.floor(Math.random() * AI_MODELS.length);

  for (let m = 0; m < AI_MODELS.length; m++) {
    const model = AI_MODELS[(startIdx + m) % AI_MODELS.length];
    const label = model.split('/')[1];

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🤖 ${label} (attempt ${attempt})...`);

        const res = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
          }),
        });

        if (res.status === 429) {
          const wait = 20000 * attempt;
          console.log(`⚠️ Rate limited. Waiting ${wait / 1000}s...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }

        if (!res.ok) {
          console.log(`❌ HTTP ${res.status}`);
          break;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;

      } catch (err) {
        console.error('❌ AI Error:', err.message);
        await new Promise(r => setTimeout(r, 20000));
      }
    }
  }

  return null;
}

// ============================
// FINAL NORMALIZATION (KEEP REASON)
// ============================
async function normalizeLocations(outages) {
  console.log('\n🧠 Final AI normalization...');

  const prompt = `
Fix Ethiopian place names into correct recognizable names.

IMPORTANT:
- DO NOT remove "reason"
- DO NOT change time
- ONLY fix location names

Input:
${JSON.stringify(outages)}

Output ONLY JSON array.
`;

  const res = await callAI(prompt);

  if (!res) return outages;

  try {
    const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
    const s = cleaned.indexOf('[');
    const e = cleaned.lastIndexOf(']');
    if (s !== -1 && e !== -1) {
      return JSON.parse(cleaned.substring(s, e + 1));
    }
  } catch { }

  return outages;
}

// ============================
// MAIN PIPELINE
// ============================
async function main() {
  console.log('=== GridGuard FINAL ===\n');

  if (!OPENROUTER_API_KEY) {
    console.error('❌ Missing API key');
    return;
  }

  // Fetch
  console.log('📡 Fetching...');
  const html = await (await fetch(EEU_URL)).text();

  // Extract
  console.log('🧹 Extracting...');
  let text = '';

  const match = html.match(/data-page="([^"]+)"/);
  if (match) {
    const decoded = match[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');

    try {
      const json = JSON.parse(decoded);
      const items = json.props?.result?.data || [];

      items.forEach(item => {
        const c = item.contentable || item;
        text += (c.title || '') + ' ' + (c.detail || c.body || '');
      });
    } catch { }
  }

  if (!text) text = html;

  text = text.match(/[\u1200-\u137F0-9\s:/-]+/g)?.join(' ') || '';
  text = text.replace(/\s+/g, ' ').trim();

  // Chunking
  const chunks = [];
  for (let i = 0; i < text.length; i += 1000) {
    chunks.push(text.substring(i, i + 1000));
  }

  console.log(`📦 ${chunks.length} chunks\n`);

  // AI Extraction
  const results = [];
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`--- Chunk ${i + 1}/${chunks.length} ---`);

    const prompt = `
Extract power outages.

ALWAYS include:
- districts
- start_time
- end_time
- reason (translate Amharic → English)

If reason missing → use "Maintenance"

Output ONLY JSON array:
[{"districts":["Bole"],"start_time":"2026-03-19T07:30:00Z","end_time":"2026-03-19T17:30:00Z","reason":"Maintenance"}]

Today: ${today}

Text:
${chunks[i]}
`;

    const res = await callAI(prompt);
    if (!res) continue;

    try {
      const cleaned = res.replace(/```json/gi, '').replace(/```/g, '');
      const s = cleaned.indexOf('[');
      const e = cleaned.lastIndexOf(']');
      if (s !== -1 && e !== -1) {
        const arr = JSON.parse(cleaned.substring(s, e + 1));
        arr.forEach(o => {
          if (!o.reason) o.reason = 'Maintenance';
        });
        results.push(...arr);
      }
    } catch { }

    await new Promise(r => setTimeout(r, 20000));
  }

  // Deduplicate
  const final = [];
  const seen = new Set();

  for (const o of results) {
    const key = `${o.start_time}-${o.districts}`;
    if (!seen.has(key)) {
      final.push(o);
      seen.add(key);
    }
  }

  // Normalize
  const clean = await normalizeLocations(final);

  // Output
  console.log(`\n📊 FINAL OUTAGES (${clean.length}):`);
  clean.forEach((o, i) => {
    console.log(
      `[${i + 1}] ${o.districts.join(', ')} | ${o.start_time} → ${o.end_time} | ${o.reason}`
    );
  });

  console.log('\n🎉 DONE — FULL AI PIPELINE');
}

main();