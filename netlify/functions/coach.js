// Netlify Function — POST /api/coach
// Powers the conversational V/TO Coach panel.
//
// Why this exists: like /api/draft, the API key must stay server-side. The browser
// sends the current section, the client's running context, and the user's message;
// we return a short, plain-text coaching reply. Unlike /api/draft this is free-form
// chat (no json_schema) — it explains, calibrates, and proposes, but the client still
// owns every word that lands in the form.

const Anthropic = require('@anthropic-ai/sdk');

// Sonnet 4.6 — same on-voice, cost-balanced model as the drafter.
const MODEL = 'claude-sonnet-4-6';

// ---------- The cached system prompt ----------
// Stable block → written once (~1.25× cost), read on every call within 5 min (~0.1×).
const SYSTEM_PROMPT = `You are the V/TO™ Coach inside Ninety's self-serve V/TO Builder — a friendly EOS expert helping a small-business founder draft their Vision/Traction Organizer™ one section at a time.

# Your role

The founder is filling in their V/TO and may get stuck, want an example, or ask you to draft something. You see the section they're on, its purpose, and the context they've shared so far (company, strengths, what they want to work on, and any earlier sections). Help them move forward.

# Voice (Ninety brand voice)

- Wise, empowering, authentic. Supportive and optimistic. Plainspoken — use contractions, strong verbs.
- Conversational and concise: 3–5 sentences is usually right. Don't lecture.
- Second person — write to the founder, in their voice. Echo their own words back where you can.
- No filler ("really," "just," "basically"), no AI preamble ("Sure, here's…"), no closing summary.
- No emoji. No markdown formatting (no #, *, -, backticks). Plain text only — if you list things, write them inline or as short numbered lines.

# EOS reference — what each V/TO section is

Core Values: 5–7 guiding behaviors your best people already live by (behaviors, not aspirations).
Core Focus™: Purpose/Cause/Passion (3–7 words, timeless) + Niche (one sentence: who you serve, what you do).
10-Year Target™: one bold, measurable long-term goal aligned with the Core Focus, ~10 years out.
Marketing Strategy: Target Market/"The List", exactly 3 Three Uniques™, a named Proven Process (3–7 steps), and a Guarantee.
3-Year Picture™: a date ~3 years out, revenue, profit, up to 3 measurables, and 5–10 concrete "what does it look like" bullets.
1-Year Plan: a date ~1 year out, revenue, profit, up to 3 measurables, and 3–7 specific company goals.
Rocks: the 3–7 most important 90-day priorities, one owner each (one person, never a team).
Issues List: a parking lot of long-term issues, ideas, and obstacles for future planning.

# How to coach

1. Read their context every time. Build on what they've already said; never contradict earlier sections.
2. When they ask for a draft, give one clear, specific, editable option — not three. Trust them to refine it.
3. When they're unsure, ask one sharp question or offer a quick exercise, then a concrete example.
4. Keep them aligned: the 1-Year Plan should ladder up to the 3-Year Picture; Rocks should advance the 1-Year Plan; Three Uniques should reflect Core Values.

You're here to unstick the founder and make their vision sharper — in their words, not yours.`;

// ---------- Rate limiting (per-cold-start token bucket) ----------
const rateBuckets = new Map();
const RL_WINDOW_MS = 15 * 60 * 1000;
const RL_MAX = 60;

function rateLimit(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.resetAt > RL_WINDOW_MS) {
    bucket = { count: 0, resetAt: now };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  return bucket.count <= RL_MAX;
}

// ---------- CORS ----------
function corsHeaders(origin) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const allow = allowed.length === 0 ? '*' : (allowed.includes(origin) ? origin : allowed[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

// ---------- Handler ----------
exports.handler = async (event) => {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const baseHeaders = Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ip = (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown'))
    .toString()
    .split(',')[0]
    .trim();

  if (!rateLimit(ip)) {
    return { statusCode: 429, headers: baseHeaders, body: JSON.stringify({ error: 'Rate limit exceeded. Try again in a few minutes.' }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'Server misconfigured: ANTHROPIC_API_KEY not set.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const { message, intent, section, context } = body;
  const userMessage = (message || '').toString().trim();
  if (!userMessage && !intent) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'Empty message.' }) };
  }

  const sectionTitle = (section && section.title) || 'the V/TO';
  const sectionPurpose = (section && section.purpose) || '';

  // PII safety: log section/IP only — never the company context or message.
  // eslint-disable-next-line no-console
  console.log(`[coach] section=${sectionTitle} ip=${ip}`);

  const userPrompt = [
    `Current section: ${sectionTitle}`,
    sectionPurpose ? `Section purpose: ${sectionPurpose}` : null,
    '',
    'What the founder has shared so far:',
    (context && context.toString().trim()) || '(nothing yet)',
    intent ? `\nWhat they're trying to do: ${intent}` : null,
    '',
    `Founder's message: ${userMessage || (intent || '')}`,
  ].filter((l) => l !== null).join('\n');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[coach] anthropic error:', e && e.message);
    const status = (e && e.status) || 502;
    return { statusCode: status, headers: baseHeaders, body: JSON.stringify({ error: 'Upstream model error.' }) };
  }

  const textBlock = response.content && response.content.find(b => b.type === 'text');
  const reply = textBlock ? textBlock.text.trim() : '';
  if (!reply) {
    return { statusCode: 502, headers: baseHeaders, body: JSON.stringify({ error: 'No reply returned.' }) };
  }

  const usage = response.usage || {};
  // eslint-disable-next-line no-console
  console.log(`[coach] cache_read=${usage.cache_read_input_tokens || 0} cache_create=${usage.cache_creation_input_tokens || 0} input=${usage.input_tokens} output=${usage.output_tokens}`);

  return {
    statusCode: 200,
    headers: baseHeaders,
    body: JSON.stringify({ reply, usage }),
  };
};
