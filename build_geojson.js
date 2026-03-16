const fs = require('fs');

const dists = [
  { name: 'Bole', coords: [8.9806, 38.7578] },
  { name: 'Piassa', coords: [9.0300, 38.7469] },
  { name: 'Merkato', coords: [9.0107, 38.7350] },
  { name: 'Kazanchis', coords: [9.0120, 38.7630] },
  { name: 'Sarbet', coords: [9.0010, 38.7420] },
  { name: 'Megenagna', coords: [9.0190, 38.7890] },
  { name: 'Ayat', coords: [9.0400, 38.8200] },
  { name: 'CMC', coords: [9.0280, 38.8030] },
  { name: 'Akaki Kaliti', coords: [8.8873, 38.7800] },
  { name: 'Kolfe Keranio', coords: [9.0050, 38.7100] },
  { name: 'Lideta', coords: [9.0080, 38.7300] },
  { name: 'Kirkos', coords: [9.0050, 38.7480] },
  { name: 'Nifas Silk-Lafto', coords: [8.9700, 38.7400] },
  { name: 'Yeka', coords: [9.0350, 38.8000] },
  { name: 'Gulele', coords: [9.0520, 38.7350] },
  { name: 'Arada', coords: [9.0350, 38.7450] },
  { name: 'Addis Ketema', coords: [9.0150, 38.7350] },
  { name: 'Bahir Dar', coords: [11.5936, 37.3908] },
  { name: 'Hawassa', coords: [7.0504, 38.4692] },
  { name: 'Dire Dawa', coords: [9.6009, 41.8661] },
  { name: 'Adama', coords: [8.5414, 39.2705] },
  { name: 'Jimma', coords: [7.6751, 36.8344] },
  { name: 'Mekelle', coords: [13.4967, 39.4753] },
  { name: 'Gondar', coords: [12.6000, 37.4667] },
  { name: 'Dessie', coords: [11.1333, 39.6333] },
  { name: 'Debre Birhan', coords: [9.6833, 39.5333] },
  { name: 'Bishoftu', coords: [8.7500, 38.9833] },
  { name: 'Shashamane', coords: [7.2000, 38.6000] },
  { name: 'Arba Minch', coords: [6.0333, 37.5500] },
  { name: 'Woldia', coords: [11.8333, 39.5833] },
  { name: 'Debre Markos', coords: [10.3333, 37.7167] },
  { name: 'Sululta', coords: [9.1833, 38.7500] },
  { name: 'Sebeta', coords: [8.9167, 38.6167] },
  { name: 'Burayu', coords: [9.0667, 38.6667] }
];

let features = dists.map(d => {
  let lat = d.coords[0];
  let lng = d.coords[1];
  let o = 0.02; // Roughly 4km box
  return {
    type: "Feature",
    properties: { name: d.name },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [lng - o, lat - o],
        [lng + o, lat - o],
        [lng + o, lat + o],
        [lng - o, lat + o],
        [lng - o, lat - o]
      ]]
    }
  };
});

let geojson = { type: "FeatureCollection", features: features };

if (!fs.existsSync('public/data')) {
  fs.mkdirSync('public/data', { recursive: true });
}
fs.writeFileSync('public/data/addis_districts.geojson', JSON.stringify(geojson, null, 2), 'utf8');
console.log('GeoJSON written to public/data/addis_districts.geojson');
