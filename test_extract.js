const fs = require('fs');
const html = fs.readFileSync('eeu_page.html', 'utf8');
const inertiaMatch = html.match(/data-page="([^"]+)"/);
if (inertiaMatch && inertiaMatch[1]) {
  const jsonStr = inertiaMatch[1].replace(/&quot;/g, '"');
  const pageData = JSON.parse(jsonStr);
  const items = pageData?.props?.result?.data || [];
  const texts = items.map((item) => {
    let contentable = item.contentable || {};
    let detail = contentable.detail ? contentable.detail
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ') : '';
    return (contentable.title || '') + '\n' + detail + '\n---';
  });
  console.log(texts.join('\n\n'));
} else {
  console.log('No match');
}
