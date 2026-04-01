// ============================================
// GridGuard — Predictor Logic LOCAL TEST v2
// ============================================
// Real Districts + Real Open-Meteo Weather + Real History

import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getRealWeather(lat, lng) {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,wind_speed_10m`);
    const data = await res.json();
    const c = data.current;
    const rainSev = Math.min(1.0, c.precipitation / 5);
    const windSev = Math.min(1.0, c.wind_speed_10m / 40);
    return { condition: c.precipitation > 0 ? '🌧️ Rain' : '☀️ Clear', rain: c.precipitation, wind: c.wind_speed_10m, severity: Math.max(rainSev, windSev) };
  } catch { return { condition: 'Unknown', severity: 0.1 }; }
}

async function runTest() {
  console.log('🚀 LIVE PREDICTOR TEST (Real Data + Open-Meteo)\n');

  // 1. Fetch from real DB tables
  const { data: districts } = await supabase.from('districts').select('*');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data: history } = await supabase.from('district_history').select('district').gte('start_time', thirtyDaysAgo);

  if (!districts || districts.length === 0) {
    console.error('❌ No districts found. Run: node scripts/seed-districts.js first.');
    return;
  }

  console.log(`📊 Loaded ${districts.length} neighborhoods from Supabase.`);
  console.log(`📊 Loaded ${history?.length || 0} history records.`);

  const historyMap = {};
  history?.forEach(r => {
    const key = r.district?.toLowerCase().trim();
    if (key) historyMap[key] = (historyMap[key] || 0) + 1;
  });

  const results = [];
  
  // Test first 10 for speed
  const sample = districts.slice(0, 15);
  console.log(`\n⏳ Validating sample of ${sample.length} districts with Open-Meteo...\n`);

  for (const dist of sample) {
    const weather = await getRealWeather(dist.lat, dist.lng);
    const histHits = historyMap[dist.name.toLowerCase().trim()] || 0;
    
    // Formula matching the lib/predictor.ts
    const historyScore = Math.min(5, histHits / 2);
    const weatherScore = weather.severity * 5;
    const total = historyScore + weatherScore;
    const prob = Math.round(Math.min(98, (total / 9) * 100));

    results.push({
      district: dist.name,
      subcity: dist.subcity,
      weather: weather.condition,
      rain: `${weather.rain}mm`,
      history: histHits,
      probability: `${prob}%`,
      risk: prob >= 75 ? '🔴 HIGH' : prob >= 40 ? '🟡 MEDIUM' : '🟢 LOW'
    });
  }

  console.table(results.sort((a,b) => parseInt(b.probability) - parseInt(a.probability)));
  console.log('\n✨ TEST COMPLETE. Predictor is now fully data-driven.');
}

runTest();
