const ETHIOPIAN_AREAS = [
    { name: 'Bole', coords: [9.0000, 38.7833] },
    { name: 'Piassa', coords: [9.0300, 38.7500] },
    { name: 'Merkato', coords: [9.0333, 38.7333] },
    { name: 'Kazanchis', coords: [9.0167, 38.7667] },
    { name: 'Sarbet', coords: [8.9950, 38.7400] },
    { name: 'Megenagna', coords: [9.0180, 38.8000] },
    { name: 'Ayat', coords: [9.0333, 38.8500] },
    { name: 'CMC', coords: [9.0200, 38.8333] },
    { name: 'Akaki Kaliti', coords: [8.8833, 38.7833] },
    { name: 'Kolfe Keranio', coords: [9.0167, 38.7000] },
    { name: 'Lideta', coords: [9.0167, 38.7333] },
    { name: 'Kirkos', coords: [9.0000, 38.7500] },
    { name: 'Nifas Silk-Lafto', coords: [8.9667, 38.7333] },
    { name: 'Yeka', coords: [9.0333, 38.8000] },
    { name: 'Gulele', coords: [9.0500, 38.7333] },
    { name: 'Arada', coords: [9.0333, 38.7500] },
    { name: 'Addis Ketema', coords: [9.0333, 38.7333] },
    { name: 'Bahir Dar', coords: [11.5936, 37.3908], type: 'city' },
    { name: 'Hawassa', coords: [7.0504, 38.4692], type: 'city' },
    { name: 'Dire Dawa', coords: [9.6009, 41.8661], type: 'city' },
    { name: 'Adama', coords: [8.5414, 39.2705], type: 'city' },
    { name: 'Jimma', coords: [7.6751, 36.8344], type: 'city' },
    { name: 'Mekelle', coords: [13.4967, 39.4753], type: 'city' },
    { name: 'Gondar', coords: [12.6000, 37.4667], type: 'city' },
    { name: 'Dessie', coords: [11.1333, 39.6333], type: 'city' },
    { name: 'Debre Birhan', coords: [9.6833, 39.5333], type: 'city' },
    { name: 'Bishoftu', coords: [8.7500, 38.9833], type: 'city' },
    { name: 'Shashamane', coords: [7.2000, 38.6000], type: 'city' },
    { name: 'Arba Minch', coords: [6.0333, 37.5500], type: 'city' },
    { name: 'Woldia', coords: [11.8333, 39.5833], type: 'city' },
    { name: 'Debre Markos', coords: [10.3333, 37.7167], type: 'city' },
    { name: 'Sululta', coords: [9.1833, 38.7500], type: 'city' },
    { name: 'Sebeta', coords: [8.9167, 38.6167], type: 'city' },
    { name: 'Burayu', coords: [9.0667, 38.6667], type: 'city' }
];

function matchDistrict(text) {
  if (!text) return null;
  const lText = text.toLowerCase();
  for (const area of ETHIOPIAN_AREAS) {
    if (lText.includes(area.name.toLowerCase())) {
      return { district: area.name, subcity: area.name, coords: area.coords };
    }
  }
  return null;
}

const geminiOutput = [
  "Yeka",
  "Bole",
  "Addis Ketema", 
  "Debre Markos"
];

for(const g of geminiOutput) {
   console.log("Matching " + g + ": ", matchDistrict(g));
}
