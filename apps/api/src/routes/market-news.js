// Symbol-aware financial headlines via Yahoo Finance RSS (free, no key).
// Short-cached (5 min) per symbol. Plain regex parsing — no XML deps.
import logger from '../utils/logger.js';
import { yahooSymbolFor } from '../utils/yahoo.js';

const UA = { 'User-Agent': 'Mozilla/5.0' };
const cache = new Map();

function parseItems(xml, limit = 12) {
  const items = [];
  const blocks = String(xml || '').split('<item>').slice(1);
  for (const b of blocks) {
    if (items.length >= limit) break;
    const pick = (tag) => {
      const m = b.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
      if (!m) return '';
      return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    };
    const title = pick('title');
    const link = pick('link');
    if (!title || !link) continue;
    items.push({ title, link, pubDate: pick('pubDate'), source: pick('source') || 'Yahoo Finance' });
  }
  return items;
}

export default async (req, res) => {
  const symbol = String(req.query.symbol || '').toUpperCase();
  const ySym = yahooSymbolFor(symbol);
  if (!symbol || !ySym) return res.json({ symbol, headlines: [] });
  const key = `news:${ySym}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return res.json({ symbol, headlines: hit.value, cached: true });
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(
      `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ySym)}&region=US&lang=en-US`,
      { headers: UA, signal: ctrl.signal },
    ).finally(() => clearTimeout(t));
    if (!r.ok) return res.json({ symbol, headlines: [] });
    const xml = await r.text();
    const headlines = parseItems(xml);
    if (cache.size > 200) cache.clear();
    cache.set(key, { value: headlines, expires: Date.now() + 300000 });
    return res.json({ symbol, headlines, cached: false });
  } catch (err) {
    logger.warn('market news failed', String(err?.message || err));
    return res.json({ symbol, headlines: [] });
  }
};
