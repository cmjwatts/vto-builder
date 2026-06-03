/* V/TO Builder — section definitions grouped by V/TO Vision side and Traction side.
   Each section: { id, title, group, eosLabel, definition, why, example, tip, fields[] }
   Field types: text, textarea, list (with optional paired { name, extra }) */

window.VTO_GROUPS = [
  {
    id: "setup",
    label: "Setup",
    blurb: "A quick snapshot so the rest of the V/TO builds on real context."
  },
  {
    id: "vision",
    label: "Vision side",
    blurb: "Where are you going? Five sections that align your team on the destination."
  },
  {
    id: "traction",
    label: "Traction side",
    blurb: "How do you get there? Three sections that turn vision into 90-day action."
  }
];

window.VTO_SECTIONS = [
  {
    id: "about",
    group: "setup",
    title: "About your company",
    eosLabel: "Setup",
    duration: "3–5 min",
    definition: "A quick snapshot of your company. We'll use this to tailor prompts and draft suggestions throughout the rest of the V/TO.",
    why: "The clearer you are about who you are today, the sharper your V/TO will be tomorrow. A few clear sentences work better than a polished mission statement — you'll refine your story across the next 8 sections.",
    fields: [
      { type: "text",     key: "website",     label: "Website", optional: true, placeholder: "acme.com", help: "Add your site and we'll pull in your company name and what you do — edit anything that's off." },
      { type: "text",     key: "companyName", label: "Company name", required: true, placeholder: "Acme Co." },
      { type: "textarea", key: "about",       label: "In 1–3 sentences, what do you do and who do you do it for?", placeholder: "We help mid-sized law firms…" },
      { type: "textarea", key: "strengths",   label: "Top 2–3 things you do really well today", placeholder: "Responsiveness, deep industry expertise…" },
      { type: "textarea", key: "workOns",     label: "Top 2–3 things you most want to work on", placeholder: "Sales pipeline consistency, hiring…" }
    ],
    tip: "Don't overthink this. The more honest you are about strengths and gaps, the more useful the rest of the builder gets."
  },

  /* ─── Vision side ─── */
  {
    id: "core-values",
    group: "vision",
    title: "Core Values",
    eosLabel: "Vision · 1 of 5",
    duration: "10–20 min",
    definition: "A small set of guiding behaviors your ideal team members already live by. Most teams land on 5–7.",
    why: "Core Values are how you hire, fire, review, reward, and recognize. They're behaviors — not aspirations. The right list makes it easier to keep the right people and harder for the wrong ones to stay.",
    example: '"Make life better." "Be curious." "Get it done." Each paired with a short descriptor explaining what it looks like in practice.',
    fields: [
      { type: "list", key: "items", min: 3, max: 7,
        item: { name: "value", extra: "descriptor" },
        addLabel: "Add a Core Value",
        placeholders: { name: "e.g. Get smart stuff done", extra: "What does this look like in your day-to-day?" }
      }
    ],
    tip: "Think of your top performers. What do they all have in common that the people who didn't work out lacked? Those traits often surface your real Core Values."
  },
  {
    id: "core-focus",
    group: "vision",
    title: "Core Focus™",
    eosLabel: "Vision · 2 of 5",
    duration: "10–20 min",
    definition: "Two short statements that anchor everything you do — your Purpose/Cause/Passion and your Niche.",
    why: "Core Focus keeps you from chasing every shiny opportunity. When something doesn't fit, you say no faster.",
    example: 'Purpose/Cause/Passion: "Make life better." Niche: "We provide IT support to law firms in the Mid-Atlantic."',
    fields: [
      { type: "text", key: "purpose", label: "Our Purpose / Cause / Passion", placeholder: "Make life better.", help: "Aim for 3–7 words. Big, bold, simple." },
      { type: "text", key: "niche",   label: "Our Niche",                     placeholder: "We provide IT support to law firms in the Mid-Atlantic.", help: "One clear sentence: who you serve, what you do." }
    ],
    tip: "Your Purpose should never expire. If it's tied to a specific product or moment in time, broaden it."
  },
  {
    id: "ten-year-target",
    group: "vision",
    title: "10-Year Target™",
    eosLabel: "Vision · 3 of 5",
    duration: "10–15 min",
    definition: "One bold long-term goal — challenging, exciting, measurable, and clearly aligned with your Core Focus.",
    why: "A great 10-Year Target rallies the whole company. It should feel a bit out of reach today but believable if you get the next 10 years right.",
    example: '"$50M in revenue by 2035, serving 500 law firms across North America."',
    fields: [
      { type: "textarea", key: "target",     label: "Our 10-Year Target", placeholder: "A bold, measurable goal that takes ~10 years to reach." },
      { type: "text",     key: "targetYear", label: "Target year",         placeholder: "e.g. 2035" }
    ],
    tip: "If your team can't recite the target from memory after a few weeks, it's probably too long. Keep it tight enough to remember."
  },
  {
    id: "marketing-strategy",
    group: "vision",
    title: "Marketing Strategy",
    eosLabel: "Vision · 4 of 5",
    duration: "20–30 min",
    definition: "Four pieces that, together, define how you win business: Target Market, Three Uniques™, Proven Process, and Guarantee.",
    why: "Most teams know what they sell. Far fewer can clearly say who they're for, what makes them different, how they deliver, and what they promise. Nailing these four kills bad-fit deals before they consume time.",
    fields: [
      { type: "textarea", key: "targetMarket", label: "Target Market / \"The List\"", placeholder: "Geographic + demographic + psychographic.", help: "Where they are, who they are, and what they value. One paragraph is plenty." },
      { type: "list",     key: "threeUniques", label: "Three Uniques™", min: 3, max: 3,
        item: { name: "name", extra: "descriptor" },
        addLabel: "Add a unique",
        placeholders: { name: 'Short label (e.g. "Fast")', extra: "A specific way you stand apart" },
        help: 'Exactly three. Pair a short label with a specific differentiator — e.g. "Fast" + "Guaranteed 2-Hour Arrival Window."' },
      { type: "text",     key: "provenProcessName",  label: "Proven Process — name", placeholder: "e.g. The Acme Way" },
      { type: "list",     key: "provenProcessSteps", label: "Proven Process — steps", min: 3, max: 7,
        addLabel: "Add a step",
        placeholders: { name: "A named step in your process" } },
      { type: "text",     key: "guarantee", label: "Guarantee", placeholder: "A bold promise that takes the risk off the buyer." }
    ],
    tip: "Your Three Uniques should be three things, not a list of features. If you can't say each in under 8 words, it's probably not unique enough yet."
  },
  {
    id: "three-year-picture",
    group: "vision",
    title: "3-Year Picture™",
    eosLabel: "Vision · 5 of 5",
    duration: "15–20 min",
    definition: "A snapshot of what your company looks like 3 years from now: revenue, profit, key measurables, and a short list of \"what does it look like\" bullets.",
    why: "Big-picture goals are easy to ignore. Specific 3-year goals — with numbers — give your team something to plan and hire toward.",
    fields: [
      { type: "text", key: "targetDate", label: "Future date", placeholder: "e.g. December 31, 2028" },
      { type: "text", key: "revenue",    label: "Revenue",     placeholder: "e.g. $25M" },
      { type: "text", key: "profit",     label: "Profit",      placeholder: "e.g. $4M (16%)" },
      { type: "list", key: "measurables", label: "Measurables (up to 3 KPIs)", min: 1, max: 3,
        addLabel: "Add a measurable",
        placeholders: { name: "e.g. 1,200 active client accounts" } },
      { type: "list", key: "lookLike",    label: "What does it look like?", min: 3, max: 10,
        addLabel: "Add a bullet",
        placeholders: { name: "e.g. Recognized as the leading IT firm for Mid-Atlantic law firms" },
        help: "5–10 short bullets. Concrete and specific — what would visiting your company in 3 years feel like?" }
    ],
    tip: 'Get specific about people, products, and recognition — not just financials. "Number of A-players" and "named one of the best places to work" land harder than revenue alone.'
  },

  /* ─── Traction side ─── */
  {
    id: "one-year-plan",
    group: "traction",
    title: "1-Year Plan",
    eosLabel: "Traction · 1 of 3",
    duration: "15–20 min",
    definition: "The 12 months ahead: revenue, profit, measurables, and 3–7 specific company goals.",
    why: "Your 1-Year Plan is the step that turns vision into traction. Pick fewer goals than you think you can do — focus beats ambition over 12 months.",
    fields: [
      { type: "text", key: "targetDate", label: "Future date", placeholder: "e.g. December 31, 2026" },
      { type: "text", key: "revenue",    label: "Revenue",     placeholder: "e.g. $9.5M" },
      { type: "text", key: "profit",     label: "Profit",      placeholder: "e.g. $1.2M (12%)" },
      { type: "list", key: "measurables", label: "Measurables (up to 3 KPIs)", min: 1, max: 3,
        addLabel: "Add a measurable",
        placeholders: { name: "e.g. 350 active client accounts" } },
      { type: "list", key: "goals",       label: "Goals for the year (3–7)",  min: 3, max: 7,
        addLabel: "Add a goal",
        placeholders: { name: "A specific, achievable goal" } }
    ],
    tip: "Aim for goals you'd feel proud of hitting — and would notice missing. If a goal could quietly slip without anyone caring, it shouldn't be on the list."
  },
  {
    id: "rocks",
    group: "traction",
    title: "Rocks",
    eosLabel: "Traction · 2 of 3",
    duration: "10–15 min",
    definition: "The 3–7 most important priorities for the next 90 days, each owned by one person.",
    why: "Rocks are how 1-Year goals actually get done — broken into 90-day chunks with a clear owner. Discipline at the quarter level is what builds traction over the year.",
    example: 'Rock: "Launch new client onboarding process." Owner: "Priya."',
    fields: [
      { type: "list", key: "items", min: 3, max: 7,
        item: { name: "rock", extra: "owner", nameMultiline: true },
        cols: "name-wide",
        addLabel: "Add a Rock",
        placeholders: { name: "A 90-day priority — describe what done looks like", extra: "Owner (one person)" } }
    ],
    tip: "One Rock, one owner — even if a team is involved. Shared ownership is shared accountability, which usually means none."
  },
  {
    id: "issues-list",
    group: "traction",
    title: "Issues List",
    eosLabel: "Traction · 3 of 3",
    duration: "5–10 min",
    definition: "A parking lot for big-picture issues, ideas, and obstacles to address in upcoming quarterly or annual planning sessions.",
    why: "Most teams generate more ideas than they can execute. Capturing issues here keeps the V/TO focused while making sure nothing important gets lost.",
    fields: [
      { type: "list", key: "items", min: 0, max: 20,
        addLabel: "Add an issue",
        placeholders: { name: "A long-term issue, idea, or obstacle" } }
    ],
    tip: "It's OK to leave this empty. You can always come back and add to it."
  }
];

/* Section lookup helper */
window.vtoSection = function (id) {
  return window.VTO_SECTIONS.find(function (s) { return s.id === id; });
};

/* Group lookup helper */
window.vtoGroup = function (id) {
  return window.VTO_GROUPS.find(function (g) { return g.id === id; });
};

/* Sections in a group */
window.vtoSectionsByGroup = function (groupId) {
  return window.VTO_SECTIONS.filter(function (s) { return s.group === groupId; });
};
