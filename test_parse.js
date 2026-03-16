const fs = require('fs');
const html = fs.readFileSync('eeu_page.html', 'utf8');
const cheerio = require('cheerio');
const inertiaMatch = html.match(/data-page="([^"]+)"/);
const structuredItems = [];

if (inertiaMatch && inertiaMatch[1]) {
  const jsonStr = inertiaMatch[1].replace(/&quot;/g, '"');
  const pageData = JSON.parse(jsonStr);
  const items = pageData?.props?.result?.data || [];
  
  for (const item of items) {
    const contentable = item.contentable || {};
    const title = contentable.title || 'Unknown';
    const rawHtml = contentable.detail || '';
    if (!rawHtml) continue;
    
    const $ = cheerio.load(rawHtml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
    $('tr').each((i, row) => {
      if (i === 0) return;
      const cols = $(row).find('td').map((_, td) => $(td).text().trim().replace(/\s+/g, ' ')).get();
      if (cols.length >= 6) {
         const entry = {
            title: title,
            city: cols[1] || '',
            date: cols[2] || '',
            reason: cols[3] || '',
            affectedAreas: cols[4] || '',
            time: cols[5] || ''
         };
         if (entry.affectedAreas && entry.affectedAreas.length > 5) {
           structuredItems.push(entry);
         }
      }
    });
  }
}
console.log(JSON.stringify(structuredItems, null, 2));
