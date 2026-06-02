# V/TO Builder

A self-service web app prospects and clients can use to draft a credible first version of their EOS® Vision/Traction Organizer™ — Ninety Pro Serve sends a link, the client walks through 9 sections, and at the end gets a single full-page V/TO ready to paste into Ninety's Vision tool.

## What it is

- One-page web app, no login, no database.
- Answers stored in the client's browser (localStorage). They can leave and come back.
- A grouped **side rail** (Setup · Vision side · Traction side) with per-section progress.
- Two Claude-powered AI features, both server-backed:
  - **Inline drafting** — "Draft this section" / per-field redraft pulls a section-shaped draft tailored to the client's company context.
  - **Conversational V/TO Coach** — a slide-in drawer that explains sections, calibrates ambition, and proposes drafts in the client's voice.
- Final output formatted as a standard EOS V/TO (Review page) so each block maps 1:1 to a field in Ninety.

## Architecture

The UI is a React app built from the [Claude Design](https://claude.ai/design) handoff. Source components live in `src/`; `npm run build` (esbuild) compiles them — JSX transpiled, React bundled in — into two static files served from the repo root:

- `assets/vendor.js` — React + ReactDOM as window globals (no runtime CDN, no in-browser Babel).
- `assets/app.js` — the V/TO Builder components, JSX → `React.createElement`.

Both are git-ignored build artifacts (regenerated on every Netlify deploy by the `command` in `netlify.toml`).

```
┌──────────────────┐     POST /api/draft   ┌────────────────────────┐
│  index.html      │ ───────────────────▶  │ netlify/functions/     │
│  + assets/*.js   │ ◀──── section JSON ──  │   draft.js  (json_schema)
│  (browser,React) │                       │                        │
│                  │     POST /api/coach    │   coach.js  (chat)     │
│                  │ ───────────────────▶  │   → Anthropic API      │
│                  │ ◀──── coach reply ───  │                        │
└──────────────────┘                       └────────────────────────┘
       │                                              ▲
       └──── localStorage ──── client's answers       │
                                                      └── ANTHROPIC_API_KEY
                                                          (server env var only)
```

The API key never reaches the browser. The functions are the only thing that touches Anthropic. Both share the cached-system-prompt + per-IP rate-limit pattern. If a draft call fails, the client falls back to a local heuristic draft so the form never gets stuck.

### Locked layout config

The design shipped with a live "Tweaks" panel for exploring layout/coach variants. Production locks one configuration in `src/vto-app.jsx` (`VTO_CONFIG`): side rail grouped by Vision/Traction, split teaching+inputs, progressive field reveal, inline drafting + coach both on, coach as a drawer behind a floating button. Change those values and rebuild to adjust.

## Local development

```bash
npm install
cp .env.example .env
# edit .env, paste your ANTHROPIC_API_KEY
npm run dev        # builds assets, then runs `netlify dev`
```

Open http://localhost:8888. After editing anything in `src/`, re-run `npm run build` (or `npm run dev`) to recompile the bundles.

## Deploy to Netlify

1. Push this folder to a new GitHub repo.
2. In Netlify: **Add new site → Import from Git** → pick the repo. Build command `npm run build` and publish dir `.` come from `netlify.toml`; functions dir is `netlify/functions`.
3. **Site settings → Environment variables** → add `ANTHROPIC_API_KEY`.
4. **Site settings → Environment variables** → add `ALLOWED_ORIGINS` once you know the production URL (e.g. `https://vto.ninety.io`).
5. Trigger a deploy. Netlify runs the build (regenerating `assets/*.js`) and gives you a `*.netlify.app` URL; map a custom subdomain when ready.

GitHub Pages will not work — there's no function support there. Vercel works as a drop-in replacement (move `netlify/functions/{draft,coach}.js` → `api/`, keep the build step, and delete `netlify.toml`).

## Updating content

- **Section copy** (titles, helper text, examples, field definitions, groups) lives in `src/vto-data.js`.
- **UI components** live in `src/*.jsx`; **layout config** in `src/vto-app.jsx` (`VTO_CONFIG`).
- Edit, run `npm run build`, redeploy.

LLM behavior (system prompts, EOS reference, brand-voice rules) lives in `netlify/functions/draft.js` (`SYSTEM_PROMPT`, section schemas + instructions) and `netlify/functions/coach.js` (conversational coach `SYSTEM_PROMPT`). Both system prompts are cached on the Anthropic side, so the first call after an edit pays the write premium and subsequent calls are read-priced.

## What's intentionally out of scope (MVP)

- Saved accounts / email-me-my-V/TO / multi-device sync
- Multi-user collaboration
- Direct push to Ninety platform via API
- PDF generation (use the browser's print dialog or paste into a doc)
- Fetching the company website server-side

## Trademarks

EOS®, V/TO™, Core Focus™, Three Uniques™, 10-Year Target™, and 3-Year Picture™ are trademarks of EOS Worldwide, LLC. Ninety is built under license from EOS Worldwide.
