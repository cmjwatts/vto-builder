/* V/TO Builder — AI drafter.
   Given a section + the user's current context, ask Claude to produce structured field values.
   We prompt Claude to return JSON conforming to the section's field shape.
   On parse failure, we fall back to best-effort heuristics so the UI never gets stuck. */

(function () {
  /* Build a compact "what the user has shared so far" context string */
  function buildContext(answers) {
    const a = answers || {};
    const lines = [];
    const about = a.about || {};
    if (about.companyName) lines.push("Company: " + about.companyName);
    if (about.website)     lines.push("Website: " + about.website);
    if (about.about)       lines.push("Description: " + about.about);
    if (about.strengths)   lines.push("Strengths: " + about.strengths);
    if (about.workOns)     lines.push("Working on: " + about.workOns);

    const cv = (a["core-values"] && a["core-values"].items) || [];
    if (cv.length) {
      lines.push("Core Values: " + cv.map(function (x) { return x && x.value; }).filter(Boolean).join(", "));
    }
    const cf = a["core-focus"] || {};
    if (cf.purpose) lines.push("Purpose: " + cf.purpose);
    if (cf.niche)   lines.push("Niche: " + cf.niche);
    const tyt = a["ten-year-target"] || {};
    if (tyt.target) lines.push("10-Year Target: " + tyt.target);
    const ms = a["marketing-strategy"] || {};
    if (ms.targetMarket)     lines.push("Target Market: " + ms.targetMarket);
    if (ms.threeUniques && ms.threeUniques.length) {
      lines.push("Three Uniques: " + ms.threeUniques.map(function (u) { return u && u.name; }).filter(Boolean).join(", "));
    }
    const typ = a["three-year-picture"] || {};
    if (typ.revenue) lines.push("3-Year Revenue: " + typ.revenue);
    if (typ.targetDate) lines.push("3-Year Date: " + typ.targetDate);
    const oyp = a["one-year-plan"] || {};
    if (oyp.revenue) lines.push("1-Year Revenue: " + oyp.revenue);

    return lines.join("\n");
  }

  /* Build the per-section schema description we send to Claude */
  function describeSchema(section) {
    const lines = [];
    section.fields.forEach(function (f) {
      if (f.type === "text" || f.type === "textarea") {
        lines.push('"' + f.key + '": string  // ' + f.label + (f.help ? " — " + f.help : ""));
      } else if (f.type === "list") {
        const isPair = !!(f.item && f.item.extra);
        const min = f.min || 1;
        const max = f.max || min;
        if (isPair) {
          const keys = f.item.name + ", " + f.item.extra;
          lines.push('"' + f.key + '": [{ ' + keys + ' }]  // ' + f.label + ", " + min + "–" + max + " items");
        } else {
          lines.push('"' + f.key + '": [string]  // ' + f.label + ", " + min + "–" + max + " items");
        }
      }
    });
    return lines.join("\n");
  }

  /* Heuristic fallbacks if Claude isn't reachable */
  function heuristicDraft(section, answers) {
    const out = {};
    const about = (answers && answers.about) || {};
    const company = about.companyName || "Your company";
    const year = new Date().getFullYear();

    if (section.id === "core-values") {
      out.items = [
        { value: "Get smart stuff done", descriptor: "We move with intent and finish what we start." },
        { value: "Be curious", descriptor: "We ask better questions before we answer." },
        { value: "Make it better", descriptor: "Leave every customer, teammate, and process improved." },
        { value: "Own it", descriptor: "Take responsibility before assigning it." },
        { value: "Stay human", descriptor: "Real people, real conversations — every interaction." }
      ];
    }
    if (section.id === "core-focus") {
      out.purpose = "Make life better.";
      out.niche = "We help " + (about.about || "ambitious teams").toLowerCase() + ".";
    }
    if (section.id === "ten-year-target") {
      out.target = "Be the most-loved partner of every team we serve.";
      out.targetYear = String(year + 10);
    }
    if (section.id === "marketing-strategy") {
      out.targetMarket = "Mid-sized companies (50–500 employees) running EOS or similar operating systems.";
      out.threeUniques = [
        { name: "Built for the work", descriptor: "Designed around the daily ritual of running on EOS." },
        { name: "Live with you", descriptor: "We grow as your team grows — every step of the rollout." },
        { name: "One team behind it", descriptor: "Real humans on call — not a chatbot, not a queue." }
      ];
      out.provenProcessName = "The " + company + " Way";
      out.provenProcessSteps = [
        { name: "Listen" }, { name: "Plan" }, { name: "Launch" }, { name: "Refine" }
      ];
      out.guarantee = "If you don't see traction in 90 days, we'll work with you until you do.";
    }
    if (section.id === "three-year-picture") {
      out.targetDate = "December 31, " + (year + 3);
      out.revenue = "$10M";
      out.profit = "$1.5M (15%)";
      out.measurables = [{ name: "300 active accounts" }, { name: "92% retention" }, { name: "60 NPS" }];
      out.lookLike = [
        { name: "Customers describe us as their most trusted partner." },
        { name: "Every team has a single Champion running their L10." },
        { name: "We ship a meaningful improvement every two weeks." },
        { name: "Recognized in our category as the team to beat." },
        { name: "Our people would not work anywhere else." }
      ];
    }
    if (section.id === "one-year-plan") {
      out.targetDate = "December 31, " + (year + 1);
      out.revenue = "$3M";
      out.profit = "$300K (10%)";
      out.measurables = [{ name: "100 active accounts" }, { name: "85% retention" }];
      out.goals = [
        { name: "Launch Q1 onboarding redesign across all customer cohorts." },
        { name: "Stand up the Champion Network — first 10 trained Champions live." },
        { name: "Ship the Rollout Tracker to general availability." },
        { name: "Hit 100 active accounts." },
        { name: "Lift annual retention to 85%." }
      ];
    }
    if (section.id === "rocks") {
      out.targetDate = "March 31, " + (year + 1);
      out.revenue = "$750K";
      out.profit = "$75K (10%)";
      out.measurables = [{ name: "25 active accounts" }, { name: "85% retention" }];
      out.items = [
        { rock: "Define and document our Proven Process, end to end.", owner: "TBD" },
        { rock: "Land our first 3 Champion-led EOS rollouts.", owner: "TBD" },
        { rock: "Stand up our Quarterly Conversations cadence.", owner: "TBD" }
      ];
    }
    if (section.id === "issues-list") {
      out.items = [
        { name: "Pricing: are we positioned correctly for SMBs vs. mid-market?" },
        { name: "Hiring: when do we add a Director of Customer Success?" },
        { name: "Onboarding: how do we shorten time-to-value below 30 days?" }
      ];
    }
    return out;
  }

  /* Compact prior-answers object for continuity — only sections before this one. */
  function priorAnswersFor(sectionId, answers) {
    const order = ["core-values", "core-focus", "ten-year-target", "marketing-strategy", "three-year-picture", "one-year-plan", "rocks", "issues-list"];
    const idx = order.indexOf(sectionId);
    if (idx <= 0) return {};
    const out = {};
    for (let i = 0; i < idx; i++) {
      const id = order[i];
      if (answers[id] && Object.keys(answers[id]).length) out[id] = answers[id];
    }
    return out;
  }

  /* Main entry — draft a section via the server (/api/draft), where the API key lives.
     The endpoint returns section-shaped JSON enforced by Anthropic's json_schema mode.
     On any network/model failure we fall back to a local heuristic so the UI never gets stuck. */
  async function draftSection(section, answers) {
    const a = answers || {};
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: section.id,
          context: a.about || {},
          currentAnswers: a[section.id] || {},
          priorAnswers: priorAnswersFor(section.id, a),
        }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || !data.draft) throw new Error("No draft returned");
      return data.draft;
    } catch (e) {
      return heuristicDraft(section, answers);
    }
  }

  /* Be forgiving — strip code fences, find the first JSON object */
  function tryParseJson(raw) {
    if (!raw) return null;
    let s = String(raw).trim();
    // Strip code fences
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    // Find first { and last }
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end < 0 || end < start) return null;
    s = s.slice(start, end + 1);
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  }

  /* Apply Claude's draft to the section's answers, returning the merged object.
     Each field becomes either a string, a list of strings, or a list of objects
     matching the schema. */
  function applyDraft(section, draft, currentAnswers) {
    const out = Object.assign({}, currentAnswers || {});
    section.fields.forEach(function (f) {
      const v = draft[f.key];
      if (v === undefined || v === null) return;
      if (f.type === "list") {
        out[f.key] = normalizeListValue(f, v);
      } else {
        out[f.key] = String(v);
      }
    });
    return out;
  }

  function normalizeListValue(field, v) {
    if (!Array.isArray(v)) return [];
    const isPair = !!(field.item && field.item.extra);
    return v.map(function (row) {
      if (isPair) {
        if (row && typeof row === "object") {
          const obj = {};
          obj[field.item.name] = row[field.item.name] || row.name || row.value || "";
          obj[field.item.extra] = row[field.item.extra] || row.descriptor || row.detail || "";
          return obj;
        }
        const obj = {};
        obj[field.item.name] = String(row);
        obj[field.item.extra] = "";
        return obj;
      }
      // single
      if (row && typeof row === "object") {
        return { name: row.name || row.value || row.label || "" };
      }
      return { name: String(row) };
    }).slice(0, field.max || 20);
  }

  /* Smart defaults that don't need AI — pure derivations from existing context. */
  function smartDefaults(section, answers) {
    const year = new Date().getFullYear();
    const out = {};
    if (section.id === "three-year-picture") {
      out.targetDate = "December 31, " + (year + 3);
    }
    if (section.id === "one-year-plan") {
      out.targetDate = "December 31, " + (year + 1);
    }
    if (section.id === "ten-year-target") {
      out.targetYear = String(year + 10);
    }
    if (section.id === "rocks") {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      out.targetDate = d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    }
    return out;
  }

  /* Curated quick-pick suggestions for selection-style sections.
     These are deliberate, common-EOS picks the user can click to add. */
  function quickPicks(section, answers) {
    if (section.id === "core-values") {
      return [
        { value: "Get smart stuff done", descriptor: "Move with intent and finish what we start." },
        { value: "Be curious", descriptor: "Ask better questions before answering." },
        { value: "Own it", descriptor: "Take responsibility before assigning it." },
        { value: "Make it better", descriptor: "Leave every customer and process improved." },
        { value: "Stay human", descriptor: "Real people, real conversations." },
        { value: "Default to action", descriptor: "Bias to ship and learn." },
        { value: "Tell the truth, kindly", descriptor: "Direct without being harsh." },
        { value: "Customer first", descriptor: "Decisions start with the customer." }
      ];
    }
    if (section.id === "marketing-strategy") {
      // Quick-picks for Three Uniques are tricky — they have to be specific to the company.
      return null;
    }
    return null;
  }

  /* Demo seed — populates About with a sample company so the user can see prefill magic. */
  function demoSeed() {
    return {
      about: {
        companyName: "Northwind Logistics",
        website: "northwindlogistics.example",
        about: "We provide overnight freight and warehousing for mid-sized e-commerce retailers in the Pacific Northwest.",
        strengths: "On-time delivery, deep regional carrier network, hands-on account management.",
        workOns: "Inconsistent sales pipeline, scaling operations beyond 3 facilities, hiring great mid-managers."
      }
    };
  }

  /* Autofill the Setup step from a company website. Server fetches the page and
     extracts { companyName, about, strengths }. Returns {} on any failure so the
     caller can fall back to manual entry. */
  async function enrichFromWebsite(url) {
    if (!url || !String(url).trim()) return {};
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: String(url).trim() }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      return (data && data.fields) || {};
    } catch (e) {
      return {};
    }
  }

  Object.assign(window, {
    vtoDraftSection: draftSection,
    vtoApplyDraft: applyDraft,
    vtoSmartDefaults: smartDefaults,
    vtoQuickPicks: quickPicks,
    vtoDemoSeed: demoSeed,
    vtoBuildContext: buildContext,
    vtoEnrichFromWebsite: enrichFromWebsite
  });
})();
