// Netlify Function — POST /api/enrich
// Given a company website URL, fetch the page, then ask Claude to extract a
// company name and a 1–3 sentence "what you do / who for" description so the
// V/TO Builder can autofill the Setup step.
//
// Safety: the URL is user-supplied and fetched server-side, so we guard against
// SSRF — http(s) only, DNS-resolve the host and reject private/loopback/link-local
// ranges, follow redirects manually (re-validating each hop), cap the body size,
// and time out fast. The API key stays server-side; nothing is persisted.

const dns = require('dns').promises;
const net = require('net');
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-6';

const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 600 * 1024; // 600 KB of HTML is plenty for title/meta/copy
const MAX_REDIRECTS = 3;

// ---------- SSRF guards ----------
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 127) return true;                          // loopback
    if (p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;          // link-local
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const a = ip.toLowerCase();
    if (a === '::1' || a === '::') return true;             // loopback / unspecified
    if (a.startsWith('fe80')) return true;                  // link-local
    if (a.startsWith('fc') || a.startsWith('fd')) return true; // unique-local
    if (a.startsWith('::ffff:')) return isPrivateIp(a.slice(7)); // IPv4-mapped
    return false;
  }
  return true; // unknown form — treat as unsafe
}

async function assertPublicHost(hostname) {
  // Reject obvious local names before resolving.
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) {
    throw new Error('blocked host');
  }
  const records = await dns.lookup(hostname, { all: true });
  if (!records.length) throw new Error('unresolvable host');
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error('blocked private address');
  }
}

function normalizeUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) throw new Error('empty url');
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  const u = new URL(s);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol');
  return u;
}

// Fetch with manual redirect handling so every hop's host is re-validated.
async function safeFetch(startUrl) {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Ninety-VTO-Builder/1.0 (+https://ninety.io)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
    } finally {
      clearTimeout(timer);
    }

    // Manual redirect follow.
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location'), url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad redirect protocol');
      continue;
    }

    if (!res.ok) throw new Error('upstream status ' + res.status);

    // Read with a hard byte cap.
    const reader = res.body && res.body.getReader ? res.body.getReader() : null;
    if (!reader) {
      const txt = await res.text();
      return txt.slice(0, MAX_BYTES);
    }
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      chunks.push(value);
      if (total >= MAX_BYTES) { try { reader.cancel(); } catch (e) {} break; }
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8').slice(0, MAX_BYTES);
  }
  throw new Error('too many redirects');
}

// ---------- HTML → compact text ----------
function extractText(html) {
  const pick = (re) => { const m = html.match(re); return m ? m[1].trim() : ''; };
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDesc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const ogSite = pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const ogDesc = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const h1 = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, ' ');

  const body = (html.match(/<body[\s\S]*?<\/body>/i) || [html])[0]
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2500);

  return [
    title && 'Title: ' + title,
    ogSite && 'Site name: ' + ogSite,
    metaDesc && 'Meta description: ' + metaDesc,
    ogDesc && 'OG description: ' + ogDesc,
    h1 && 'Headline: ' + h1.trim(),
    body && 'Page text: ' + body,
  ].filter(Boolean).join('\n');
}

// ---------- CORS ----------
function corsHeaders(origin) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const allow = allowed.length === 0 ? '*' : (allowed.includes(origin) ? origin : allowed[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

// ---------- Rate limiting (per-cold-start, like draft.js) ----------
const rateBuckets = new Map();
const RL_WINDOW_MS = 15 * 60 * 1000;
const RL_MAX = 30;
function rateLimit(ip) {
  const now = Date.now();
  let b = rateBuckets.get(ip);
  if (!b || now - b.resetAt > RL_WINDOW_MS) { b = { count: 0, resetAt: now }; rateBuckets.set(ip, b); }
  b.count += 1;
  return b.count <= RL_MAX;
}

const SYSTEM_PROMPT = `You extract a few factual fields about a company from the text of its own website, to pre-fill a setup form.

Return only what the website text actually supports. If a field isn't clearly supported, return an empty string — never guess or invent.

- companyName: the company's name as it presents itself (no legal suffixes unless that's how they write it, no taglines).
- about: 1–3 plain sentences describing what the company does and who it serves, in their own framing. No marketing fluff, no "we are passionate about". Write it as the company would describe itself in the second person is NOT required — third person is fine.
- strengths: only if the site clearly highlights specific strengths or differentiators; otherwise empty.

Plain text values. No markdown, no quotes, no trademark symbols.`;

const SCHEMA = {
  type: 'object',
  properties: {
    companyName: { type: 'string' },
    about: { type: 'string' },
    strengths: { type: 'string' },
  },
  required: ['companyName', 'about', 'strengths'],
  additionalProperties: false,
};

// ---------- Handler ----------
exports.handler = async (event) => {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const baseHeaders = Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin));

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

  const ip = (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown'))
    .toString().split(',')[0].trim();
  if (!rateLimit(ip)) return { statusCode: 429, headers: baseHeaders, body: JSON.stringify({ error: 'Rate limit exceeded. Try again in a few minutes.' }) };
  if (!process.env.ANTHROPIC_API_KEY) return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'Server misconfigured: ANTHROPIC_API_KEY not set.' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'Invalid JSON body.' }) }; }

  let url;
  try { url = normalizeUrl(body.url); }
  catch (e) { return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'Please enter a valid website address.' }) }; }

  // Fetch the site (guarded). Don't leak why a host was rejected.
  let html;
  try {
    html = await safeFetch(url);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`[enrich] fetch failed host=${url.hostname} reason=${e && e.message}`);
    return { statusCode: 422, headers: baseHeaders, body: JSON.stringify({ error: "Couldn't read that website. You can fill in the details manually." }) };
  }

  const siteText = extractText(html);
  if (!siteText || siteText.length < 20) {
    return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({ fields: { companyName: '', about: '', strengths: '' } }) };
  }

  // eslint-disable-next-line no-console
  console.log(`[enrich] host=${url.hostname} ip=${ip} chars=${siteText.length}`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 350,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Website: ${url.toString()}\n\nExtracted site text:\n${siteText}` }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[enrich] anthropic error:', e && e.message);
    return { statusCode: 502, headers: baseHeaders, body: JSON.stringify({ error: 'Upstream model error.' }) };
  }

  const textBlock = response.content && response.content.find((b) => b.type === 'text');
  let fields = { companyName: '', about: '', strengths: '' };
  if (textBlock) {
    try { fields = Object.assign(fields, JSON.parse(textBlock.text)); } catch (e) {}
  }

  return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({ fields }) };
};
