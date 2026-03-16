const fs = require('fs');
const https = require('https');

async function testGemini() {
  const structuredItems = [
    {
      "title": "የተለያዩ የቅድመ ጥገና ስራ ለማከናወን ሲባል በዕቅድ የሚቋረጥ የኃይል አቅርቦት",
      "city": "አዲስ አበባ",
      "date": "መጋቢት 8 ቀን 2017 ዓ.ም መጋቢት 9 ቀን 2017 ዓ.ም",
      "reason": "የመልሶ ግንባታ ስራ ለማከናወን",
      "affectedAreas": "ጉርድ ሾላ ቴሌ፣ ትምህርት መሳሪያዎች ማምረቻ ድርጅት፣ ግብርና ምርምር ፣ ጃክሮስ አደባባይ በስተጀርባ፣አየር መንገድ ዴዲኬትድትደድ፣ጀሞነ -2 ኮንዶሚኒየም ፣ የስ ውሃ ፣ዓለምገና ማርስ ሕንጻ፣በኮተቤ፣",
      "time": "ከጠዋቱ 2፡30 እስከ ቀን 9፡30 ሰዓት"
    },
    {
      "title": "የተለያዩ የቅድመ ጥገና ስራ ለማከናወን ሲባል በዕቅድ የሚቋረጥ የኃይል አቅርቦት",
      "city": "አዲስ አበባ",
      "date": "መጋቢት 10 ቀን 2017 ዓ.ም",
      "reason": "የመልሶ ግንባታ ስራ ለማከናወን",
      "affectedAreas": "ከኮተቤ ብረታ ብረት፣ ኮተቤ ኪዳነምህረት ቤ/ክ አካባቢ፣ አንቆርጫ ሰፈር",
      "time": "ከጠዋቱ 2፡00 እስከ ቀን 10፡00 ሰዓት"
    },
    {
      "title": "የተለያዩ የቅድመ ጥገና ስራ ለማከናወን ሲባል በዕቅድ የሚቋረጥ የኃይል አቅርቦት",
      "city": "ደብረማርቆስ",
      "date": "መጋቢት 8 ቀን 2017 ዓ.ም",
      "reason": "የመልሶ ግንባታ ስራ ለማከናወን",
      "affectedAreas": "ጎፍጭማ፣ዋበር፣አንጂም፣ዪኒቨርስቲ،ኢንዱስትሪ፣ደ/ማርቆስ ውሃ፣ሉማሜ እና አማኑኤል ባታ፣ኢንዱስትሪ በከፊልሏ፣ ስላሴ፣አባይኩኑ ኮንዶሚኒየም፣አብማት/ቤት፣አብማቤ/ክ፣አዲሱ ፍ/ቤት ፣ አባ ብዙነህ ጉርድ፣ ገጠር መንገድ ኮንዶሚኒየም",
      "time": ""
    }
  ];

  const safeText = JSON.stringify(structuredItems, null, 2);
  const prompt = `
I am building an outage monitor website and I need you to translate the following JSON power interruption data from the Ethiopian Electric Utility website.
The data contains announcements for multiple scheduled power outages, mostly written in Amharic.

For EACH distinct outage object you find in the data, you must:
1. Translate the Amharic text to English.
2. Extract the start time and end time.
3. Extract the reason/cause (in English).
4. Give me the district/city names in English that will be affected.

IMPORTANT GEOGRAPHIC RULES:
After identifying the English district names, you MUST map the ONE PRIMARY affected district/city ONLY to this strict list of known districts/subcities:
[Bole, Piassa, Merkato, Kazanchis, Sarbet, Megenagna, Ayat, CMC, Akaki Kaliti, Kolfe Keranio, Lideta, Kirkos, Nifas Silk-Lafto, Yeka, Gulele, Arada, Addis Ketema, Bahir Dar, Hawassa, Dire Dawa, Adama, Jimma, Mekelle, Gondar, Dessie, Debre Birhan, Bishoftu, Shashamane, Arba Minch, Woldia, Debre Markos, Sululta, Sebeta, Burayu]
If the 'city' property says "አዲስ አበባ" (Addis Ababa), you MUST look at the 'affectedAreas' to figure out which sub-district it belongs to (e.g. Yeka, Bole, etc.) and output that sub-district from the list. If it's a regional city like Debre Markos, output Debre Markos.

Output ONLY valid JSON in this exact format (an array of objects), with no markdown formatting or backticks around it:
[
  {
    "districts": ["English District from the list above"],
    "times": { "start": "Readable Start info", "end": "Readable End info" },
    "reason": "English translation of the reason"
  }
]

Data to analyze:
${safeText}`;

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
        console.log("====== GEMINI OUTPUT ======");
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
