// ============================================
// GridGuard — AI District Seeder
// ============================================
// Uses AI to generate a comprehensive list of Addis Ababa neighborhoods
// at the Woreda level (e.g., Garment, Mebrat Haile, Bole bulbula) 
// and saves them to your Supabase districts table.

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

if (!OPENROUTER_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedDistricts() {
  console.log('🤖 Asking AI to map every Woreda in Addis Ababa...');

  const prompt = `
List every neighborhood and Woreda-level district in Addis Ababa, Ethiopia.
Include well-known names like Bole, Piassa, Garment, Mebrat Haile, Sarbet, Ayat, CMC, Lebu, Jomo, Bulbula, Gerji, etc.
Focus on ALL 11 sub-cities (Bole, Akaki Kality, Kirkos, Lideta, Addis Ketema, Arada, Gullele, Yeka, Kolfe Keranio, Nifas Silk-Lafto, Lemi Kura).

Output ONLY a JSON array of objects:
[{"name": "District Name", "subcity": "Subcity Name", "lat": 9.xxxx, "lng": 38.xxxx}]

Aim for at least 60-80 detailed neighborhood names with accurate approximate coordinates.
`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'stepfun/step-3.5-flash:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('AI returned empty content');

    const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
    const districts = JSON.parse(cleaned.substring(s, e + 1));

    console.log(`✅ AI generated ${districts.length} neighborhoods.`);
    console.log('📤 Saving to Supabase...');

    const { error } = await supabase.from('districts').upsert(districts, { onConflict: 'name' });

    if (error) throw error;

    console.log('✨ SUCCESS! Your "districts" map is now populated.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
}

seedDistricts();
