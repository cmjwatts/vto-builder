// Netlify Function — POST /api/draft
// Calls Claude to generate a draft for one V/TO section.
//
// Why this exists: the API key must stay server-side. The browser sends the client's
// Step-0 context plus their current section answers; we ask Claude for a section-shaped
// JSON draft and return it. The frontend drops the draft into the form fields as
// editable text — the client always owns the final answer.

const Anthropic = require('@anthropic-ai/sdk');

// Sonnet 4.6 was chosen in the approved plan (cost-balanced, on-voice drafting).
const MODEL = 'claude-sonnet-4-6';

// ---------- Per-section schemas ----------
// Each schema matches the shape the frontend's applyDraft() expects to merge into state.
// additionalProperties: false everywhere — required by Anthropic's json_schema mode.

const STRING = { type: 'string' };
const obj = (props, required) => ({
  type: 'object',
  properties: props,
  required: required || Object.keys(props),
  additionalProperties: false,
});
const arr = (items, opts = {}) => Object.assign({ type: 'array', items }, opts);

const SECTION_SCHEMAS = {
  'core-values': obj({
    items: arr(
      obj({ value: STRING, descriptor: STRING }),
    ),
  }),
  'core-focus': obj({
    purpose: STRING,
    niche: STRING,
  }),
  'ten-year-target': obj({
    target: STRING,
    targetYear: STRING,
  }),
  'marketing-strategy': obj({
    targetMarket: STRING,
    threeUniques: arr(obj({ name: STRING, descriptor: STRING })),
    provenProcessName: STRING,
    provenProcessSteps: arr(STRING),
    guarantee: STRING,
  }),
  'three-year-picture': obj({
    targetDate: STRING,
    revenue: STRING,
    profit: STRING,
    measurables: arr(STRING),
    lookLike: arr(STRING),
  }),
  'one-year-plan': obj({
    targetDate: STRING,
    revenue: STRING,
    profit: STRING,
    measurables: arr(STRING),
    goals: arr(STRING),
  }),
  'rocks': obj({
    targetDate: STRING,
    revenue: STRING,
    profit: STRING,
    measurables: arr(STRING),
    items: arr(obj({ rock: STRING, owner: STRING })),
  }),
  'issues-list': obj({
    items: arr(STRING),
  }),
};

// Lightweight per-section instructions appended to the user message (uncached).
// The bulk of the EOS reference lives in the cached system prompt below.
const SECTION_INSTRUCTIONS = {
  'core-values': 'Draft exactly 5 Core Values. Each item: a short 1–4 word "value" plus a 1-sentence "descriptor" describing the behavior in practice. Use the client\'s words and stories where you can.',
  'core-focus': 'Draft a 3-7 word Purpose/Cause/Passion (timeless, big, simple) and a one-sentence Niche (who you serve + what you do).',
  'ten-year-target': 'Draft one bold, measurable 10-Year Target™ that connects to the Core Focus™. Include a target year roughly 10 years from now.',
  'marketing-strategy': 'Draft all four pieces: Target Market / "The List" (one paragraph, geo + demo + psycho), exactly 3 Three Uniques™ (each as a short label like "Fast" or "Familiar" plus a specific descriptor like "Guaranteed 2-Hour Arrival Window"), a Proven Process name plus 3–7 step names, and a one-sentence Guarantee.',
  'three-year-picture': 'Draft a 3-Year Picture™: a future date ~3 years out, revenue, profit, up to 3 measurables, and exactly 5 short "what does it look like?" bullets that are concrete and specific.',
  'one-year-plan': 'Draft a 1-Year Plan: a future date ~12 months out, revenue, profit, up to 3 measurables, and exactly 5 specific company goals.',
  'rocks': 'Draft a 90-Day Plan: a future date ~3 months out, revenue, profit, up to 3 measurables, and 3–7 Company Rocks. Each Rock: a short "rock" (the 90-day priority) plus a placeholder "owner" (use [Owner] if no name is suggested). The 90-day numbers should ladder toward the 1-Year Plan.',
  'issues-list': 'Draft 5–10 long-term issues, ideas, or obstacles a leadership team running on EOS would naturally surface for this company. One short bullet each.',
};

// ---------- The cached system prompt ----------
// This is the big, stable block. The first call writes it (~1.25× cost); every subsequent
// call within 5 minutes reads it (~0.1× cost). Verify via cache_read_input_tokens.
const SYSTEM_PROMPT = `You are a Ninety Pro Serve assistant helping an EOS client draft one section of their V/TO™ (Vision/Traction Organizer™) inside an in-browser builder.

# Your role

The client has already shared a short About-Your-Company context (company name, what they do, current strengths, things they want to work on). You will be asked to draft ONE specific section of their V/TO™ at a time. The client will see the draft, edit it freely, and either accept it, regenerate it, or scrap it. Drafts are starting points — not final answers.

# Voice (Ninety brand voice)

- Wise, empowering, authentic. Supportive and optimistic.
- Plainspoken. Use contractions. Strong verbs over adjectives.
- Second person — write to the client, in the client's voice.
- No filler ("really," "just," "totally," "basically").
- No "AI-isms" — no preamble like "Sure, here's a draft" and no closing summary.
- Match the cadence of how the client describes their business in their About-Us context. If they sound technical, sound technical back. If they sound warm, sound warm back.

# EOS reference — what each V/TO section actually is

**Core Values** — A small set of guiding behaviors your ideal team members already live by. Behaviors, not aspirations. Each is short (often 1–4 words) plus a one-sentence descriptor showing what it looks like in practice. They must be important, relevant to your business, and enduring.

**Core Focus™** — Two short statements that anchor the company. (1) Purpose / Cause / Passion: 3–7 words that describe why you exist; timeless, big, simple. (2) Our Niche: one clear sentence — who you serve, what you do.

**10-Year Target™** — One bold, measurable long-term goal aligned with the Core Focus™. ~10 years out. Should feel ambitious but believable. Plain language; memorable.

**Marketing Strategy** — Four pieces:
- *Target Market / "The List"*: one paragraph combining geography (where they are), demographics (who they are), and psychographics (what they value). Specific.
- *Three Uniques™*: exactly three. Short — usually under 8 words each. The three things customers actually repeat back when they recommend you. Not features.
- *Proven Process*: a named, repeatable way you deliver. Includes a memorable name and 3–7 named steps.
- *Guarantee*: one bold promise that takes risk off the buyer.

**3-Year Picture™** — A snapshot 3 years out. A future date (~3 years), revenue, profit, up to 3 measurables/KPIs, and a short list of "what does it look like?" bullets. Bullets should be concrete: people, products, recognition, customer count, locations. Not vague aspirations.

**1-Year Plan** — The 12 months ahead. A future date (~1 year), revenue, profit, up to 3 measurables, and a focused list of company goals (not departmental). Goals should be specific enough to verify.

**90-Day Plan** — The quarter ahead: a future date (~90 days out), revenue, profit, up to 3 measurables, and the 3–7 most important Company Rocks. One owner per Rock (one person, never a team). A Rock is a 90-day priority, not a perpetual responsibility. The numbers should ladder up toward the 1-Year Plan.

**Issues List** — A parking lot for long-term issues, ideas, and obstacles surfaced for upcoming quarterly or annual planning. Short bullets.

# How to use the client's context

1. Read the client's About / strengths / work-ons every time. Echo their language back where you can — verbatim phrases from their About-Us are gold.
2. If they've already filled in this section partially, treat their words as load-bearing. Build on what they have; don't overwrite their voice.
3. If they've completed earlier sections, use them for continuity. The 1-Year Plan should ladder up to the 3-Year Picture™. Three Uniques™ should reflect Core Values. Rocks should advance the 1-Year Plan. Don't contradict their earlier answers.
4. The draft is a *starting point*. Pick a clear, specific direction. The client will edit. They don't need three options — they need one good one.

# Output rules

- Return ONLY the JSON for this section. The schema is enforced; do not include extra fields.
- Do not write preambles, commentary, or notes inside string values.
- Use the client's voice and language. Avoid generic business-speak.
- Where the schema asks for a list, populate it with the right number of items per the section's rules above.
- Use plain text — no markdown, no bullet markers, no quotation marks around items.
- Trademark symbols (™/®) are NOT needed inside the JSON values — the frontend handles that.

You are drafting in service of the client's vision, not your own. Be helpful, be specific, and trust them to edit.`;

// ---------- Rate limiting ----------
// Per-cold-start in-memory token bucket. Combined with the frontend's 5-per-section /
// 30-per-session caps, this is enough for MVP abuse prevention. Replace with Upstash
// or similar if traffic justifies it.
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

  const { sectionId, context, currentAnswers, priorAnswers } = body;
  if (!sectionId || !SECTION_SCHEMAS[sectionId]) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'Unknown sectionId.' }) };
  }
  if (!context || typeof context !== 'object') {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'Missing About-Your-Company context.' }) };
  }

  // PII safety: log section/IP only — never the company context.
  // eslint-disable-next-line no-console
  console.log(`[draft] section=${sectionId} ip=${ip}`);

  // Build the small, uncached user message.
  const ctxSummary = [
    context.companyName ? `Company: ${context.companyName}` : null,
    context.about       ? `About:     ${context.about}`     : null,
    context.strengths   ? `Strengths: ${context.strengths}` : null,
    context.workOns     ? `Want to work on: ${context.workOns}` : null,
  ].filter(Boolean).join('\n');

  const currentSummary = currentAnswers && Object.keys(currentAnswers).length
    ? `\n\nWhat the client has already typed for this section (treat as load-bearing — build on this, don't overwrite):\n${JSON.stringify(currentAnswers)}`
    : '';

  const priorSummary = priorAnswers && Object.keys(priorAnswers).length
    ? `\n\nFor continuity (their answers in earlier sections — keep aligned):\n${JSON.stringify(priorAnswers)}`
    : '';

  const userPrompt = [
    `Section to draft: ${sectionId}`,
    '',
    'Client context:',
    ctxSummary || '(none yet)',
    currentSummary,
    priorSummary,
    '',
    `Instruction: ${SECTION_INSTRUCTIONS[sectionId]}`,
  ].join('\n');

  // ---------- Anthropic call ----------
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      // System prompt is rendered as an array of text blocks so we can put cache_control on the last block.
      // This caches both system prompt + tools+model fingerprint together for ~5min.
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userPrompt }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: SECTION_SCHEMAS[sectionId],
        },
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[draft] anthropic error:', e && e.message);
    const status = (e && e.status) || 502;
    return { statusCode: status, headers: baseHeaders, body: JSON.stringify({ error: 'Upstream model error.' }) };
  }

  // Pull the first text block — output_config.format guarantees it's valid JSON.
  const textBlock = response.content && response.content.find(b => b.type === 'text');
  if (!textBlock) {
    return { statusCode: 502, headers: baseHeaders, body: JSON.stringify({ error: 'No draft returned.' }) };
  }

  let draft;
  try {
    draft = JSON.parse(textBlock.text);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[draft] JSON parse failed:', textBlock.text.slice(0, 200));
    return { statusCode: 502, headers: baseHeaders, body: JSON.stringify({ error: 'Model returned invalid JSON.' }) };
  }

  const usage = response.usage || {};
  // eslint-disable-next-line no-console
  console.log(`[draft] cache_read=${usage.cache_read_input_tokens || 0} cache_create=${usage.cache_creation_input_tokens || 0} input=${usage.input_tokens} output=${usage.output_tokens}`);

  return {
    statusCode: 200,
    headers: baseHeaders,
    body: JSON.stringify({ draft, usage }),
  };
};
