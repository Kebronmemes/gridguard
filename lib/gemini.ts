// ============================================
// GridGuard — Gemini Translation Client
// ============================================
// Translates Amharic text to English using Google Gemini API (free tier).
// Includes retry logic with exponential backoff.

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string };
}

/**
 * Translate text from Amharic to English using Gemini API.
 * Returns the original text if GEMINI_API_KEY is not set or translation fails.
 */
export async function translateAmharic(text: string, maxRetries = 3): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini] No API key set (GEMINI_API_KEY). Returning original text.');
    return text;
  }

  // Skip translation if text appears to already be English
  if (/^[a-zA-Z0-9\s.,!?;:\-()[\]{}'"]+$/.test(text)) {
    return text;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Translate the following Amharic text to English. Only return the English translation, nothing else. If the text is already in English, return it as-is.\n\nText: ${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          }
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[Gemini] HTTP ${response.status}: ${err}`);
        if (attempt < maxRetries - 1) {
          await delay(Math.pow(2, attempt) * 1000); // exponential backoff
          continue;
        }
        return text;
      }

      const data: GeminiResponse = await response.json();

      if (data.error) {
        console.error(`[Gemini] API error: ${data.error.message}`);
        if (attempt < maxRetries - 1) {
          await delay(Math.pow(2, attempt) * 1000);
          continue;
        }
        return text;
      }

      const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!translated || translated.length === 0) {
        console.warn('[Gemini] Empty response, returning original text.');
        return text;
      }

      // Sanitize — remove any markdown formatting, special chars
      return sanitizeTranslation(translated);

    } catch (err) {
      console.error(`[Gemini] Request failed (attempt ${attempt + 1}):`, err);
      if (attempt < maxRetries - 1) {
        await delay(Math.pow(2, attempt) * 1000);
        continue;
      }
    }
  }

  return text; // fallback to original
}

/**
 * Translate multiple texts in batch (for efficiency).
 */
export async function translateBatch(texts: string[]): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || texts.length === 0) return texts;

  // For small batches, translate individually
  if (texts.length <= 3) {
    return Promise.all(texts.map(t => translateAmharic(t)));
  }

  // For larger batches, combine into single prompt
  try {
    const combined = texts.map((t, i) => `[${i}] ${t}`).join('\n');
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate each of the following Amharic lines to English. Return each translation on its own line, prefixed by its index number in brackets. Keep the same format [index] translation.\n\n${combined}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
        }
      }),
    });

    if (!response.ok) return texts;

    const data: GeminiResponse = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!result) return texts;

    // Parse indexed results
    const lines = result.split('\n');
    const translated = [...texts]; // start with originals
    for (const line of lines) {
      const match = line.match(/^\[(\d+)\]\s*(.+)$/);
      if (match) {
        const idx = parseInt(match[1]);
        if (idx >= 0 && idx < texts.length) {
          translated[idx] = sanitizeTranslation(match[2]);
        }
      }
    }
    return translated;
  } catch {
    return texts;
  }
}

function sanitizeTranslation(text: string): string {
  return text
    .replace(/```[a-z]*\n?/g, '')  // Remove code block markers
    .replace(/\*\*/g, '')           // Remove bold markers
    .replace(/\*/g, '')             // Remove italic markers
    .replace(/<[^>]+>/g, '')        // Remove HTML tags
    .trim();
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Intelligently extract structured location and time data from text using Gemini.
 * Maps locations strictly to the known ETHIOPIAN_AREAS list for perfect map rendering.
 */
export async function extractLocationsAndTimes(text: string): Promise<{
  districts: string[];
  times: { start: string; end: string };
  severity: string;
  reason_en: string;
} | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text) return null;

  try {
    const prompt = `
Analyze the following text about a scheduled power outage in Ethiopia.
Extract the start time, end time, and a list of affected areas.

IMPORTANT: You MUST map the affected areas ONLY to this list of known districts/subcities:
[Bole, Piassa, Merkato, Kazanchis, Sarbet, Megenagna, Ayat, CMC, Akaki Kaliti, Kolfe Keranio, Lideta, Kirkos, Nifas Silk-Lafto, Yeka, Gulele, Arada, Addis Ketema, Bahir Dar, Hawassa, Dire Dawa, Adama, Jimma, Mekelle, Gondar, Dessie, Debre Birhan, Bishoftu, Shashamane, Arba Minch, Woldia]
If an area in the text is a smaller neighborhood inside one of these, output the parent district from the list above.

Output ONLY valid JSON in this exact format, with no markdown formatting or backticks:
{
  "districts": ["Name1", "Name2"],
  "times": { "start": "ISO String or string", "end": "ISO String or string" },
  "severity": "low" | "moderate" | "critical" | "grid_failure",
  "reason_en": "English translation of the reason"
}

Text to analyze:
${text}
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        }
      }),
    });

    if (!response.ok) return null;
    const data: GeminiResponse = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!resultText) return null;

    const parsed = JSON.parse(resultText);
    if (parsed && Array.isArray(parsed.districts) && parsed.times) {
      return {
        ...parsed,
        severity: parsed.severity || 'moderate',
        reason_en: parsed.reason_en || 'Scheduled Maintenance'
      };
    }
    return null;
  } catch (err) {
    console.error('[Gemini] Extraction error:', err);
    return null;
  }
}

/**
 * Parses an entire webpage of text (containing multiple Amharic/English interruption announcements).
 * Translates intent and extracts ALL outages into an array of structured JSON.
 */
export async function extractAllLocationsAndTimesFromHtml(text: string): Promise<Array<{
  districts: string[];
  start_time: string;
  end_time: string;
  reason: string;
}>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text) return [];

  // Trim to avoid hitting limits if the page is unnecessarily massive
  const safeText = text.substring(0, 15000); 

  try {
    const prompt = `
I am building an outage monitor website and I need you to translate the following JSON power interruption data from the Ethiopian Electric Utility website.
The data contains announcements for multiple scheduled power outages, mostly written in Amharic.

For EACH distinct outage object you find in the data, you must:
1. Translate the Amharic text to English.
2. Extract the start time and end time.
3. Extract the reason/cause (in English).
4. Give me the district/city names in English that will be affected.

IMPORTANT GEOGRAPHIC RULES:
After identifying the English district names, you MUST map the PRIMARY affected district/city ONLY to this strict list of known districts/subcities:
[Bole, Piassa, Merkato, Kazanchis, Sarbet, Megenagna, Ayat, CMC, Akaki Kaliti, Kolfe Keranio, Lideta, Kirkos, Nifas Silk-Lafto, Yeka, Gulele, Arada, Addis Ketema, Bahir Dar, Hawassa, Dire Dawa, Adama, Jimma, Mekelle, Gondar, Dessie, Debre Birhan, Bishoftu, Shashamane, Arba Minch, Woldia, Debre Markos, Sululta, Sebeta, Burayu]

CRITICAL: If the 'city' property says "አዲስ አበባ" (Addis Ababa), you MUST look at the 'affectedAreas' or 'reason' to figure out which sub-district it belongs to (e.g., Yeka, Bole, Kolfe Keranio, etc.) and output that EXACT matching sub-district from the list. If it is a regional city like Debre Markos, output exactly "Debre Markos". If you cannot find any matching district on the list, output "Addis Ketema" as a default fallback for Addis Ababa outages, or the "city" name in English for regional outages. Do NOT return an empty list.

Output ONLY valid JSON in this exact format (an array of objects), with no markdown formatting or backticks around it:
[
  {
    "districts": ["English District from the list above"],
    "start_time": "Readable Start info / ISO format",
    "end_time": "Readable End info / ISO format",
    "reason": "English translation of the reason",
    "severity": "low" | "moderate" | "critical" | "grid_failure"
  }
]

Data to analyze:
${safeText}
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        }
      }),
    });

    if (!response.ok) return [];
    
    const data: GeminiResponse = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!resultText) return [];

    // DEBUG: Logging what Gemini responded with
    console.log("====== GEMINI OUTPUT ====\n", resultText);

    const parsed = JSON.parse(resultText);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        ...item,
        severity: item.severity || 'moderate'
      })).filter(item => Array.isArray(item.districts) && item.start_time);
    }
    return [];
  } catch (err) {
    console.error('[Gemini] Bulk extraction error:', err);
    return [];
  }
}


