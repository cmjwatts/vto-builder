# V/TO Builder

A self-service web app prospects and clients can use to draft a credible first version of their EOS® Vision/Traction Organizer™ — Ninety Pro Serve sends a link, the client walks through 9 sections, and at the end gets a single full-page V/TO ready to paste into Ninety's Vision tool.

## What it is

- One-page web app, no login, no database.
- Answers stored in the client's browser (localStorage). They can leave and come back.
- Optional Claude-powered "Suggest a draft" button on each section pulls a draft tailored to the client's company context.
- Final output formatted as a standard EOS V/TO so each block maps 1:1 to a field in Ninety.

## Architecture

```
┌──────────────────┐        POST          ┌────────────────────────┐
│  index.html      │ ───────────────────▶ │ netlify/functions/     │
│  (browser, JS)   │                      │   draft.js             │
│                  │ ◀─────── draft ───── │   → Anthropic API      │
└──────────────────┘                      └────────────────────────┘
       │                                              ▲
       └──── localStorage ──── client's answers       │
                                                      └── ANTHROPIC_API_KEY
                                                          (server env var only)
```

The API key never reaches the browser. The function is the only thing that touches Anthropic.

## Local development

```bash
npm install
cp .env.example .env
# edit .env, paste your ANTHROPIC_API_KEY
npx netlify dev
```

Open http://localhost:8888.

## Deploy to Netlify

1. Push this folder to a new GitHub repo.
2. In Netlify: **Add new site → Import from Git** → pick the repo. Defaults work (publish dir `.`, functions dir `netlify/functions`).
3. **Site settings → Environment variables** → add `ANTHROPIC_API_KEY`.
4. **Site settings → Environment variables** → add `ALLOWED_ORIGINS` once you know the production URL (e.g. `https://vto.ninety.io`).
5. Trigger a deploy. Netlify gives you a `*.netlify.app` URL; map a custom subdomain when ready.

GitHub Pages will not work — there's no function support there. Vercel works as a drop-in replacement (rename `netlify/functions/draft.js` → `api/draft.js` and delete `netlify.toml`).

## Updating content

All section copy, helper text, examples, and field definitions live inline in `index.html` under the `SECTIONS` array. Edit the array; redeploy.

LLM behavior (system prompt, EOS reference, brand-voice rules) lives in `netlify/functions/draft.js` under `SYSTEM_PROMPT`. The system prompt is cached on the Anthropic side, so the first call after an edit pays the write premium and subsequent calls are read-priced.

## What's intentionally out of scope (MVP)

- Saved accounts / email-me-my-V/TO / multi-device sync
- Multi-user collaboration
- Direct push to Ninety platform via API
- PDF generation (use the browser's print dialog or paste into a doc)
- Fetching the company website server-side

## Trademarks

EOS®, V/TO™, Core Focus™, Three Uniques™, 10-Year Target™, and 3-Year Picture™ are trademarks of EOS Worldwide, LLC. Ninety is built under license from EOS Worldwide.
