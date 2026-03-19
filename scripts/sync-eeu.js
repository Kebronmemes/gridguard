// ============================================
// GridGuard — Production Sync Script (GitHub)
// ============================================
// This script runs on GitHub Actions to avoid Vercel timeouts.
// Uses the user's preferred 20s wait and 1000ch chunking.

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

const AI_MODELS = [
  'openrouter/free',
  'stepfun/step-3.5-flash:free',
  'arcee-ai/trinity-large-preview:free',
  'arcee-ai/trinity-mini:free'
];

async function callAI(prompt) {
  const startIdx = Math.floor(Math.random() * AI_MODELS.length);
  for (let m = 0; m < AI_MODELS.length; m++) {
    const model = AI_MODELS[(startIdx + m) % AI_MODELS.length];
    try {
      console.log(`🤖 AI: Using ${model}...`);
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
        console.log('⚠️ Rate limited. Waiting 20s...');
        await new Promise(r => setTimeout(r, 20000));
        continue;
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) return content;
    } catch (err) {
      console.error('❌ AI Call failed:', err.message);
    }
  }
  return null;
}

async function main() {
  console.log('=== GridGuard Production Sync Start ===');

  // 1. Fetch
  const html = await (await fetch(EEU_URL)).text();
  console.log(`📡 Fetched ${html.length} chars`);

  // 2. Extract and Filter (Amharic + Digits)
  let text = '';
  const match = html.match(/data-page="([^"]+)"/);
  if (match) {
    const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
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
  text = text.match(/[\u1200-\u137F0-9\s:/-]+/g)?.join(' ').replace(/\s+/g, ' ').trim() || '';

  // 3. Chunking (1000ch)
  const chunks = [];
  for (let i = 0; i < text.length; i += 1000) {
    chunks.push(text.substring(i, i + 1000));
  }
  console.log(`📦 ${chunks.length} chunks to process...`);

  // 4. AI Process
  const extracted = [];
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`--- [Chunk ${i + 1}/${chunks.length}] ---`);
    const prompt = `Extract power outages. Return ONLY JSON array. Today: ${today}.
Text: ${chunks[i]}`;

    const res = await callAI(prompt);
    if (res) {
      try {
        const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
        const start = cleaned.indexOf('['), end = cleaned.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
          const arr = JSON.parse(cleaned.substring(start, end + 1));
          extracted.push(...arr);
        }
      } catch { }
    }
    // The user's requested 20s wait
    await new Promise(r => setTimeout(r, 20000));
  }

  // 5. Final Cleaning & Insertion
  console.log(`\n🧠 Normalizing ${extracted.length} items...`);
  const unique = [];
  const seen = new Set();
  for (const o of extracted) {
    const key = `${o.districts?.join(',')}|${o.start_time}`;
    if (!seen.has(key)) {
      unique.push(o);
      seen.add(key);
    }
  }

  for (const item of unique) {
    const district = item.districts?.[0] || 'Unknown';
    console.log(`📝 Saving ${district}...`);
    
    await supabase.from('district_history').insert({
      district,
      cause: item.reason || 'Maintenance',
      start_time: item.start_time,
      end_time: item.end_time || null,
      type: 'planned',
      severity: item.severity || 'moderate',
      lat: 9.0, // Default lat/lng for now, maps will fuzzy match later
      lng: 38.75
    });

    await supabase.from('system_feed').insert({
      type: 'grid_update',
      message: `Planned outage for ${district} on ${item.start_time}`,
      area: district
    });
  }

  console.log('🎉 Sync Complete!');
}

main().catch(console.error);
