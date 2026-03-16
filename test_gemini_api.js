const fs = require('fs');
const https = require('https');

async function testGemini() {
  const text = fs.readFileSync('test_gemini_input.txt', 'utf8');
  const safeText = text.substring(0, 15000);
  const prompt = \
I am building an outage monitor website and I need you to translate the following power interruption announcements from the Ethiopian Electric Utility website.
The text contains announcements for multiple scheduled power outages, mostly written in Amharic.

For EACH distinct outage announcement you find in the text, you must:
1. Translate the Amharic text to English.
2. Extract the start time and end time.
3. Extract the reason/cause (in English).
4. Give me the district names in English that will be affected.

IMPORTANT GEOGRAPHIC RULES:
After identifying the English district names, you MUST map the affected areas ONLY to this strict list of known districts/subcities:
[Bole, Piassa, Merkato, Kazanchis, Sarbet, Megenagna, Ayat, CMC, Akaki Kaliti, Kolfe Keranio, Lideta, Kirkos, Nifas Silk-Lafto, Yeka, Gulele, Arada, Addis Ketema, Bahir Dar, Hawassa, Dire Dawa, Adama, Jimma, Mekelle, Gondar, Dessie, Debre Birhan, Bishoftu, Shashamane, Arba Minch, Woldia, Debre Markos, Sululta, Sebeta, Burayu]
If an area mentioned is a specific street or neighborhood, output the parent district from the list above instead. If you cannot map it to the list, skip that specific area but still output the outage if other areas match.

Output ONLY valid JSON in this exact format (an array of objects), with no markdown formatting or backticks around it:
[
  {
    "districts": ["Bole"],
    "times": { "start": "ISO String or readable date/time format", "end": "ISO String or readable date/time format" },
    "reason": "English translation of the reason for the outage"
  }
]

Text to analyze:
\\;

  const apiKey = process.env.GEMINI_API_KEY;
  if(!apiKey) { console.log('NO API KEY'); return; }

  const req = https.request('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, (res) => {
    let raw = '';
    res.on('data', d => raw += d);
    res.on('end', () => {
      try {
        const data = JSON.parse(raw);
        console.log(data.candidates[0].content.parts[0].text);
      } catch(e) { console.error('Parse error:', e, raw); }
    });
  });
  req.write(JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
  }));
  req.end();
}
testGemini();
