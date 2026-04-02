// ============================================
// GridGuard — AI Translation Client (OpenRouter)
// ============================================
// Uses OpenRouter API (free models) to translate
// Amharic text and extract outage data from the EEU website.

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Safe + working free models identified by the user
const AI_MODELS = [
  'openrouter/free',
  'stepfun/step-3.5-flash:free',
  'arcee-ai/trinity-large-preview:free',
  'arcee-ai/trinity-mini:free'
];

/**
 * Call OpenRouter AI with a prompt and get text back.
 * Randomizes start model and implements backoff on 429.
 */
async function callAI(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[AI] No OPENROUTER_API_KEY set');
    return null;
  }

  // Randomize start model to distribute load
  const startIdx = Math.floor(Math.random() * AI_MODELS.length);

  for (let m = 0; m < AI_MODELS.length; m++) {
    const model = AI_MODELS[(startIdx + m) % AI_MODELS.length];
    const label = model.split('/')[1] || model;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[AI] ${label} (attempt ${attempt})...`);
        
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://gridguard-eight.vercel.app',
            'X-Title': 'GridGuard',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
          }),
        });

        if (response.status === 429) {
          const waitMs = 30000 * attempt; // 30s, 60s, 90s
          console.warn(`[AI] Rate limited on ${label}. Waiting ${waitMs/1000}s...`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[AI] HTTP ${response.status} on ${label}`, errText);
          break; // try next model
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          console.log(`[AI] ✅ Got response from ${label}`);
          return content;
        }
      } catch (err) {
        console.error(`[AI] Request failed for ${label}:`, err);
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  }

  console.error('[AI] All models failed');
  return null;
}

/**
 * Normalizes place names and reasons using a final AI pass.
 * Ensures EVERYTHING is in English and only within Addis Ababa.
 */
async function normalizeOutages(outages: any[]): Promise<any[]> {
  if (outages.length === 0) return [];
  console.log(`[AI] Normalizing ${outages.length} extracted items (Strict Addis Filter)...`);

  const prompt = `
Filter and normalize these power outage entries.
1. ONLY keep entries located in Addis Ababa, Ethiopia. (Discard Bahir Dar, Hawassa, Adama, etc.)
2. Translate ALL Amharic text to English (area names, sub-cities, reasons).
3. Fix spelling (e.g., "bole subcity" -> "Bole", "addis abeba" -> "Addis Ababa").
4. If a place is outside Addis Ababa, REMOVE it from the list.
5. Standardize reasons: "Maintenance", "Emergency", "System Failure", "Load Shedding".

Output ONLY a JSON array.

Input:
${JSON.stringify(outages.slice(0, 50))}

Output ONLY JSON array.`;

  const res = await callAI(prompt);
  if (!res) return outages;

  try {
    const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
    const s = cleaned.indexOf('[');
    const e = cleaned.lastIndexOf(']');
    if (s !== -1 && e !== -1) {
      return JSON.parse(cleaned.substring(s, e + 1));
    }
  } catch (e) {
    console.warn('[AI] Normalization parse failed');
  }
  return outages;
}

/**
 * AI research tool to geocode and verify unknown places in Addis.
 */
export async function researchPlaces(places: string[]): Promise<Record<string, { lat: number, lng: number, englishName: string, isAddis: boolean }>> {
  if (places.length === 0) return {};
  console.log(`[AI] Researching ${places.length} unknown places...`);

  const prompt = `
For each place in this list, determine if it is a neighborhood/district within Addis Ababa, Ethiopia.
If it is in Addis, provide its approximate GPS coordinates (lat, lng) and its English name.
If it is NOT in Addis Ababa, set isAddis to false.

List: ${places.join(', ')}

Output ONLY a JSON object mapping the input name to results:
{"place name": {"lat": 9.x, "lng": 38.x, "englishName": "English Name", "isAddis": true}}
`;

  const res = await callAI(prompt);
  if (!res) return {};

  try {
    const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    if (s !== -1 && e !== -1) {
      return JSON.parse(cleaned.substring(s, e + 1));
    }
  } catch (e) {
    console.warn('[AI] Place research parse failed');
  }
  return {};
}

/**
 * Main extraction function: takes raw EEU page text and processes it in chunks.
 */
export async function extractOutagesFromText(text: string): Promise<Array<{
  districts: string[];
  area: string;
  start_time: string;
  end_time: string | null;
  reason: string;
  severity: string;
}>> {
  if (!text || text.length < 50) return [];

  // Filter for Amharic + Digits to reduce token noise (User preference)
  const filteredText = text.match(/[\u1200-\u137F0-9\s:/-]+/g)?.join(' ') || '';
  const cleanText = filteredText.replace(/\s+/g, ' ').trim();

  // 1. Split text into chunks of exactly 1000 chars
  const chunks: string[] = [];
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < cleanText.length; i += CHUNK_SIZE) {
    chunks.push(cleanText.substring(i, i + CHUNK_SIZE));
  }
  
  console.log(`[AI] Processing ${chunks.length} chunks of 1000 chars...`);

  const rawExtracted: any[] = [];
  const today = new Date().toISOString().split('T')[0];

  // 2. Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[AI] Processing chunk ${i + 1}/${chunks.length}...`);
    const prompt = `
Extract power outages from this Amharic text and convert EVERYTHING to English and Gregorian Calendar.
SOURCE CONTEXT:
- The dates in the text are in the ETHIOPIAN CALENDAR (EC).
- You MUST convert these to the GREGORIAN CALENDAR (GC) for the year 2026.
- (Example: 2018 EC translates to 2026 GC).

STRICT RULES:
1. ONLY extract locations within Addis Ababa City.
2. TRANSLATE ALL Amharic area names, sub-cities, and reasons to English.
3. CONVERT all dates to Gregorian (yyyy-mm-ddThh:mm:ssZ).
4. Map areas to Addis Ababa sub-cities: [Bole, Piassa, Merkato, Kazanchis, Sarbet, Megenagna, Ayat, CMC, Akaki Kaliti, Kolfe Keranio, Lideta, Kirkos, Nifas Silk-Lafto, Yeka, Gulele, Arada, Addis Ketema, Lemi Kura].
5. DISCARD any locations outside Addis Ababa (e.g., discard Bahir Dar, Jimma, etc.).

Today (Gregorian) is ${today}. Output ONLY JSON array:
[{"districts":["Bole"],"area":"Bole","start_time":"yyyy-mm-ddThh:mm:ssZ","end_time":"yyyy-mm-ddThh:mm:ssZ","reason":"Planned Maintenance","severity":"moderate"}]

Text:
${chunk}`;

    const result = await callAI(prompt);
    if (result) {
      try {
        const cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const startIdx = cleaned.indexOf('[');
        const endIdx = cleaned.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
          const parsed = JSON.parse(cleaned.substring(startIdx, endIdx + 1));
          if (Array.isArray(parsed)) {
            parsed.forEach(o => {
              if (!o.reason) o.reason = 'Maintenance';
              if (!o.severity) o.severity = 'moderate';
            });
            rawExtracted.push(...parsed);
          }
        }
      } catch (e) {
        console.warn(`[AI] Chunk ${i+1} parse failed`);
      }
    }

    // baseline 5s wait strictly to avoid 429 but much faster than 20s
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  if (rawExtracted.length === 0) return [];

  // 3. Deduplicate
  const unique = [];
  const seen = new Set();
  for (const o of rawExtracted) {
    const key = `${o.start_time}-${o.districts?.join(',')}`;
    if (!seen.has(key)) {
      unique.push(o);
      seen.add(key);
    }
  }

  // 4. Final Normalization Pass
  return await normalizeOutages(unique);
}

/**
 * AI Advisor: Provides actionable, human-centric advice for specific areas.
 */
export async function getOutageAdvice(area: string, severity: string, reason: string): Promise<string> {
  console.log(`[AI] Generating advice for ${area} (${severity})...`);
  
  const prompt = `
Generate brief, actionable, and encouraging advice for residents in ${area}, Addis Ababa, during a ${severity} power outage caused by "${reason}".
Use a professional yet caring tone.
Include 3-4 bullet points (max 10 words each) like "Charge power banks" or "Protect sensitive appliances".
Mention how GridGuard is monitoring the situation.
Output ONLY text (max 250 characters).`;

  const res = await callAI(prompt);
  return res || "Stay safe and keep your devices charged. We are monitoring the situation in your area.";
}

/**
 * Grid Status Insight: Provides a high-level summary of current grid performance.
 */
export async function getGridInsight(analytics: any): Promise<string> {
  const prompt = `
Summarize the current grid status in Addis Ababa based on these metrics:
${JSON.stringify(analytics)}
Give a 1-sentence "Energy Outlook" for the next 24 hours.
Be concise and data-driven.`;

  const res = await callAI(prompt);
  return res || "The grid is stable with minor maintenance in select areas.";
}

// Legacy exports for compatibility
export const translateAmharic = async (text: string) => text;
export const translateBatch = async (texts: string[]) => texts;
export async function extractLocationsAndTimes(text: string) { return null; }
export async function extractAllLocationsAndTimesFromHtml(text: string) { return extractOutagesFromText(text); }
