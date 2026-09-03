const fs = require('fs');
const path = require('path');
const https = require('https');

const NEWS_FILE = path.join(__dirname, '../public/gta6-news.json');

// Google News RSS aggregates IGN, GameSpot, Polygon, PC Gamer, Rockstar, etc.
// into one reliable feed. Free, no API key, never runs out.
const FEEDS = [
  'https://news.google.com/rss/search?q=%22GTA%206%22%20OR%20%22Grand%20Theft%20Auto%20VI%22%20when%3A14d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=%22GTA%206%22%20pre-order%20OR%20release%20when%3A30d&hl=en-US&gl=US&ceid=US:en',
];

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (VICEWIRE news fetcher)' },
    }, (res) => {
      // follow one redirect if needed
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function decode(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// Google News titles look like: "Headline - Publication"
function splitTitle(raw) {
  const t = decode(raw);
  const idx = t.lastIndexOf(' - ');
  if (idx > 0 && idx > t.length - 40) {
    return { title: t.slice(0, idx).trim(), source: t.slice(idx + 3).trim() };
  }
  return { title: t, source: 'Google News' };
}

function tagFor(title) {
  const t = title.toLowerCase();
  if (t.includes('rockstar') || t.includes('official') || t.includes('trailer') || t.includes('confirms')) return 'OFFICIAL';
  if (t.includes('rumor') || t.includes('rumour') || t.includes('leak') || t.includes('allegedly') || t.includes('reportedly')) return 'RUMOR';
  if (t.includes('pre-order') || t.includes('preorder') || t.includes('sales') || t.includes('stock') || t.includes('price') || t.includes('take-two') || t.includes('shares')) return 'BUSINESS';
  return 'NEWS';
}

function fmtDate(pubDate) {
  const d = pubDate ? new Date(pubDate) : new Date();
  if (isNaN(d)) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseItems(xml) {
  const items = [];
  const blocks = xml.split(/<item>/).slice(1);
  for (const b of blocks) {
    const rawTitle = (b.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const link = decode((b.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '');
    const pub = (b.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    const desc = decode((b.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '');
    if (!rawTitle) continue;
    const { title, source } = splitTitle(rawTitle);
    if (!title) continue;
    items.push({
      title,
      summary: desc ? desc.slice(0, 220) : `Reported by ${source}. Tap the source for the full story.`,
      source,
      date: fmtDate(pub),
      tag: tagFor(title),
      url: link,
      _time: pub ? new Date(pub).getTime() || 0 : 0,
    });
  }
  return items;
}

const SITE_URL = 'https://vice-wire.com';
const FEED_FILE = path.join(__dirname, '../public/feed.xml');

function xmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildRss(items) {
  const now = new Date().toUTCString();
  const entries = items.map((it) => {
    // Link back to the site so social clicks land on vice-wire.com (where the affiliate links live).
    const link = SITE_URL + '/#wire';
    const desc = `${it.summary} (Source: ${it.source})`;
    return `    <item>
      <title>${xmlEscape(it.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="false">${xmlEscape(it.title.slice(0, 80) + '|' + it.date)}</guid>
      <pubDate>${now}</pubDate>
      <description>${xmlEscape(desc)}</description>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>VICEWIRE — GTA VI News</title>
    <link>${SITE_URL}</link>
    <description>The latest Grand Theft Auto VI news, tracked by VICEWIRE.</description>
    <lastBuildDate>${now}</lastBuildDate>
${entries}
  </channel>
</rss>
`;
}

async function main() {
  try {
    console.log('Fetching GTA 6 news from RSS feeds...');
    let all = [];
    for (const feed of FEEDS) {
      try {
        const xml = await httpGet(feed);
        all = all.concat(parseItems(xml));
      } catch (e) {
        console.log('One feed failed (continuing):', e.message);
      }
    }

    if (!all.length) throw new Error('No items parsed from any feed');

    // de-dupe by title, newest first, keep top 8
    const seen = new Set();
    const deduped = [];
    all.sort((a, b) => b._time - a._time);
    for (const it of all) {
      const key = it.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      const { _time, ...clean } = it;
      deduped.push(clean);
      if (deduped.length >= 8) break;
    }

    const outDir = path.dirname(NEWS_FILE);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(NEWS_FILE, JSON.stringify(deduped, null, 2));
    console.log(`Updated ${NEWS_FILE} with ${deduped.length} items`);

    // Also write an RSS feed so tools like Zapier/Buffer can auto-post, linking back to the site.
    fs.writeFileSync(FEED_FILE, buildRss(deduped));
    console.log(`Updated ${FEED_FILE} (RSS) with ${deduped.length} items`);
  } catch (err) {
    console.error('Error fetching news:', err.message);
    process.exit(1);
  }
}

main();
