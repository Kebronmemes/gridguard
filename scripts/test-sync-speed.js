// ============================================
// GridGuard — Turbo Sync Optimization Test
// ============================================
// This is a temporary script to test parallel AI calls and larger chunks.
// Mocked Supabase, real OpenRouter.

import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const EEU_URL = 'https://www.eeu.gov.et/power-interruption?lang=en';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const AI_MODELS = [
  'stepfun/step-3.5-flash:free',
  'openrouter/free',
  'arcee-ai/trinity-large-preview:free',
  'arcee-ai/trinity-mini:free'
];

async function callAI(prompt, modelIndex) {
  const model = AI_MODELS[modelIndex % AI_MODELS.length];
  try {
    console.log(`🤖 AI: Using ${model}...`);
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
      console.log(`⚠️ Throttled (429) on ${model}. Waiting 30s backoff...`);
      await new Promise(r => setTimeout(r, 30000));
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim();
  } catch (err) {
    console.error(`❌ AI failed (${model}):`, err.message);
    return null;
  }
}

async function test() {
  const startTime = Date.now();
  console.log('🚀 Starting Turbo Sync Local Test...');

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

  // 3. Optimized Chunking (1500ch - User Requested)
  const CHUNK_SIZE = 1500;
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }
  console.log(`📦 Sliced into ${chunks.length} large chunks (Turbo Mode)`);

  // 4. Sequential Extraction
  console.log(`\n🧵 Processing ${chunks.length} chunks sequentially...`);
  const today = new Date().toISOString().split('T')[0];
  const allOutages = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`--- Chunk ${i + 1}/${chunks.length} ---`);
    const prompt = `
Extract power outages from this Amharic text.
Output ONLY a JSON array.
Today is ${today}. 

JSON Format:
[{"districts":["Bole"],"area":"Bole","start_time":"2026-03-19T07:30:00Z","end_time":"2026-03-19T17:30:00Z","reason":"Planned Maintenance","severity":"moderate"}]

Text:
${chunks[i]}`;

    const res = await callAI(prompt, i);
    
    if (res) {
      console.log(`\n📄 RAW AI RESPONSE (Chunk ${i+1}):\n${res}\n`);
      try {
        const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
        const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
        if (s !== -1 && e !== -1) {
          const arr = JSON.parse(cleaned.substring(s, e + 1));
          allOutages.push(...arr);
          console.log(`✅ Success: ${arr.length} items extracted.`);
        }
      } catch (e) {
        console.error(`❌ Parse failed: ${e.message}`);
      }
    } else {
      console.error(`❌ No response.`);
    }

    // 10s delay between requests as requested to avoid throttling
    if (i < chunks.length - 1) {
      console.log('⏳ Waiting 10s for next request...');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n✨ TEST COMPLETE in ${duration.toFixed(2)} seconds!`);
  console.log(`📊 Found ${allOutages.length} total outages.`);
  console.log('📝 (Database insertion skipped during test)');
}

test();
