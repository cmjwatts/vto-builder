/* V/TO Builder — section view.
   Two content treatments via Tweak: "split" (teaching left / inputs right) or "stacked" (collapsible cards above form).
   Two flow modes via Tweak: "progressive" (one field at a time, typeform-feel) or "all-visible".
   AI suggest button is rendered inline when aiMode === "inline" or "both"; the coach panel handles "coach" / "both". */

function VtoSection({
  section, answers, setAnswer, sectionAnswers,
  onNext, onPrev, hasPrev, hasNext, idx, total,
  tweaks, onSuggest, suggestState,
  aiDrafted, drafting, onDraftSection, onDraftField
}) {
  const fields = section.fields || [];
  const treatment = tweaks.contentTreatment || "split";
  const flow = tweaks.flow || "progressive";

  // Determine which fields are visible under progressive flow:
  // Show every filled field + the first not-yet-filled field. After that, hide.
  // User can still click "Show all" to bypass.
  const [showAll, setShowAll] = React.useState(false);
  React.useEffect(() => { setShowAll(false); }, [section.id]);

  const visibleIdx = React.useMemo(() => {
    if (flow !== "progressive" || showAll) return fields.map((_, i) => i);
    const out = [];
    let firstUnfilledShown = false;
    for (let i = 0; i < fields.length; i++) {
      const filled = vtoFieldFilled(fields[i], sectionAnswers[fields[i].key]);
      if (filled) {
        out.push(i);
      } else if (!firstUnfilledShown) {
        out.push(i);
        firstUnfilledShown = true;
      }
    }
    return out;
  }, [section.id, JSON.stringify(sectionAnswers), flow, showAll]);

  // Auto-focus the most-recently-unlocked field
  const focusIdxRef = React.useRef(0);
  React.useEffect(() => {
    const lastVisible = visibleIdx[visibleIdx.length - 1];
    if (lastVisible !== undefined) focusIdxRef.current = lastVisible;
  }, [visibleIdx.length]);

  const progress = vtoSectionProgress(section, sectionAnswers);
  const pct = Math.round(progress * 100);

  // Teaching content components used in both treatments
  const teachingContent = (
    <div className="vsec__teaching">
      <div className="vsec__teaching-row">
        <span className="vsec__teaching-tag">What it is</span>
        <p className="vsec__teaching-body">{section.definition}</p>
      </div>
      {section.why ? (
        <div className="vsec__teaching-row">
          <span className="vsec__teaching-tag">Why it matters</span>
          <p className="vsec__teaching-body">{section.why}</p>
        </div>
      ) : null}
      {section.example ? (
        <div className="vsec__teaching-row vsec__teaching-row--example">
          <span className="vsec__teaching-tag">Example</span>
          <p className="vsec__teaching-body">{section.example}</p>
        </div>
      ) : null}
      {section.tip ? (
        <div className="vsec__teaching-tip">
          <span className="vsec__teaching-tip-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <path d="M8 1.5 V3 M8 13 V14.5 M14.5 8 H13 M3 8 H1.5 M12.5 3.5 L11.5 4.5 M4.5 11.5 L3.5 12.5 M12.5 12.5 L11.5 11.5 M4.5 4.5 L3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
          </span>
          <span><strong>Tip ·</strong> {section.tip}</span>
        </div>
      ) : null}
    </div>
  );

  const suggestEligible = section.id !== "about";
  const drafted = aiDrafted || {};
  const isDraftingSection = !!(drafting && drafting[section.id]);
  // Show the "blank page" CTA when nothing the user has typed exists yet.
  // AI-drafted fields don't count as user-filled.
  const anyFieldFilled = fields.some((f) => {
    const v = sectionAnswers[f.key];
    return vtoFieldStarted(f, v) && !drafted[f.key];
  });

  // Show the section-level "AI drafted" banner when any field in this section was drafted by AI.
  const anyFieldDrafted = fields.some((f) => !!drafted[f.key]);
  const draftedBanner = anyFieldDrafted ? (
    <div className="vsec__drafted-banner">
      <span className="vsec__drafted-banner-tag">✨ AI drafted</span>
      <span className="vsec__drafted-banner-hint">Edit to make it yours — your changes will replace the draft.</span>
    </div>
  ) : null;

  const draftCta = suggestEligible ? (
    <div className={"vsec__draft " + (anyFieldFilled ? "is-secondary " : "is-primary ")}>
      <div className="vsec__draft-body">
        <span className="vsec__draft-icon" aria-hidden="true">✨</span>
        <span>
          <strong>
            {anyFieldFilled ? "Want me to redraft this section?" : "Skip the blank page — I'll draft this for you."}
          </strong>
          <span className="vsec__draft-sub">
            Based on {vtoContextSummary(answers)}. You'll review every field before moving on.
          </span>
        </span>
      </div>
      <button
        type="button"
        className={"btn " + (anyFieldFilled ? "btn--neutral btn--sm" : "")}
        onClick={() => onDraftSection(section)}
        disabled={isDraftingSection}
      >
        {isDraftingSection ? "Drafting…" : anyFieldFilled ? "Redraft section" : "Draft this section →"}
      </button>
    </div>
  ) : null;

  /* Renders the form fields with progressive reveal animation */
  const formBody = (
    <div className="vsec__form">
      {/* Quick-pick chips appear above the list field for selection-style sections */}
      {window.vtoQuickPicks && window.vtoQuickPicks(section, answers) ? (
        <VtoQuickPicks
          section={section}
          picks={window.vtoQuickPicks(section, answers)}
          currentItems={sectionAnswers.items || []}
          onAdd={(item) => {
            const cur = sectionAnswers.items || [];
            // Avoid duplicates by value name
            if (cur.some((c) => c && (c.value || c.name) === (item.value || item.name))) return;
            setAnswer(section.id, "items", cur.concat([item]));
          }}
        />
      ) : null}
      {fields.map((f, i) => {
        const visible = visibleIdx.includes(i);
        if (!visible) return null;
        const isCurrent = visibleIdx[visibleIdx.length - 1] === i;
        const fieldDrafted = !!drafted[f.key];
        const fieldDrafting = !!(drafting && drafting[section.id + ":" + f.key]);
        return (
          <div
            key={f.key}
            className={"vsec__field-wrap " + (isCurrent ? "is-current " : "is-prior ") + (fieldDrafted ? "is-drafted " : "")}
            data-field-key={f.key}
          >
            <VtoField
              field={f}
              value={sectionAnswers[f.key]}
              onChange={(v) => setAnswer(section.id, f.key, v)}
              autoFocus={false}
              onCommit={() => { /* progressive reveal kicks in via state update */ }}
            />
            {suggestEligible && f.type !== "list" ? (
              <button
                type="button"
                className="vsec__field-redraft"
                onClick={() => onDraftField(section, f.key)}
                disabled={fieldDrafting || isDraftingSection}
                title="Redraft this field"
                aria-label="Redraft this field"
              >
                {fieldDrafting ? "…" : "✨"}
              </button>
            ) : null}
          </div>
        );
      })}

      {/* Show all / collapse toggle when progressive mode hides fields */}
      {flow === "progressive" && !showAll && visibleIdx.length < fields.length ? (
        <button
          type="button"
          className="vsec__show-all"
          onClick={() => setShowAll(true)}
        >
          Show all {fields.length} fields
        </button>
      ) : null}
      {flow === "progressive" && showAll && fields.length > 2 ? (
        <button
          type="button"
          className="vsec__show-all"
          onClick={() => setShowAll(false)}
        >
          Focus mode (one at a time)
        </button>
      ) : null}
    </div>
  );

  const headerBlock = (
    <header className="vsec__header">
      <div className="vsec__header-meta">
        <span className="eyebrow">{section.eosLabel}</span>
      </div>
      <h1 className="vsec__title">{section.title}</h1>
      {section.definition && treatment === "stacked" ? (
        <p className="vsec__lead">{section.definition}</p>
      ) : null}
      <div className="vsec__progress" aria-hidden="true">
        <div className="vsec__progress-bar" style={{ width: pct + "%" }} />
      </div>
      <div className="vsec__progress-meta">
        {pct === 100 ? "Section complete ✓" : pct === 0 ? "Not started yet" : pct + "% complete"}
      </div>
    </header>
  );

  return (
    <article className={"vsec vsec--" + treatment + " vsec--flow-" + flow}>
      {headerBlock}

      {treatment === "split" ? (
        <div className="vsec__split">
          <aside className="vsec__teaching-col">
            {teachingContent}
          </aside>
          <div className="vsec__form-col">
            {draftCta}
            {draftedBanner}
            {formBody}
          </div>
        </div>
      ) : (
        <div className="vsec__stacked">
          {treatment === "stacked" ? (
            <VtoTeachingAccordion section={section} />
          ) : teachingContent}
          {draftCta}
          {draftedBanner}
          {formBody}
        </div>
      )}

      {/* Footer nav */}
      <footer className="vsec__nav">
        <div>
          {hasPrev ? (
            <button type="button" className="btn btn--text" onClick={onPrev}>← Back</button>
          ) : null}
        </div>
        <div className="vsec__nav-right">
          {hasNext ? (
            <button type="button" className="btn" onClick={onNext}>
              {pct === 100 ? "Continue →" : "Next →"}
            </button>
          ) : (
            <button type="button" className="btn" onClick={onNext}>Review your V/TO →</button>
          )}
        </div>
      </footer>

      <style>{`
        .vsec {
          background: var(--color-white);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 36px 40px 28px;
          box-shadow: var(--shadow-xs);
        }
        @media (max-width: 720px) {
          .vsec { padding: 24px 22px 22px; }
        }

        /* Header */
        .vsec__header { margin-bottom: 28px; }
        .vsec__header-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .vsec__header-meta .eyebrow { white-space: nowrap; }
        .vsec__header-dot { color: var(--color-brand-slate); }
        .vsec__header-duration {
          font-size: 12.5px;
          color: var(--fg-2);
          font-weight: 500;
        }
        .vsec__title {
          margin: 0 0 14px;
          font-size: var(--fs-h1);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        @media (max-width: 720px) {
          .vsec__title { font-size: 26px; }
        }
        .vsec__lead {
          font-size: 17px;
          color: var(--fg-2);
          margin: 0 0 16px;
          max-width: 65ch;
          line-height: 1.55;
        }
        .vsec__progress {
          height: 4px;
          background: var(--color-brand-mist);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 6px;
        }
        .vsec__progress-bar {
          height: 100%;
          background: var(--color-brand-blue);
          border-radius: 99px;
          transition: width 320ms var(--ease-out);
        }
        .vsec__progress-meta {
          font-size: 12px;
          color: var(--fg-3);
          margin-top: 8px;
          font-weight: 500;
        }

        /* Split layout */
        .vsec__split {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 40px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .vsec__split { grid-template-columns: 1fr; gap: 24px; }
        }
        .vsec__teaching-col {
          position: sticky;
          top: calc(var(--header-h) + 28px);
          padding: 6px 0;
        }
        @media (max-width: 900px) {
          .vsec__teaching-col { position: static; }
        }

        /* Teaching content shared */
        .vsec__teaching {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .vsec__teaching-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .vsec__teaching-tag {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: var(--tracking-eyebrow);
          color: var(--color-brand-blue);
        }
        .vsec__teaching-row--example .vsec__teaching-tag { color: var(--fg-2); }
        .vsec__teaching-body {
          font-size: 14.5px;
          color: var(--fg-1);
          line-height: 1.6;
          margin: 0;
        }
        .vsec__teaching-row--example .vsec__teaching-body {
          color: var(--fg-2);
          font-style: italic;
        }
        .vsec__teaching-tip {
          display: flex;
          gap: 8px;
          background: var(--color-brand-blue-04);
          border-left: 3px solid var(--color-brand-blue);
          padding: 12px 14px;
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          font-size: 13.5px;
          color: var(--fg-1);
          line-height: 1.55;
        }
        .vsec__teaching-tip-icon {
          color: var(--color-brand-blue);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .vsec__teaching-tip strong {
          color: var(--color-brand-blue-heavy);
          font-weight: 700;
        }

        /* Stacked layout shows teaching ABOVE form */
        .vsec--stacked .vsec__teaching {
          margin-bottom: 22px;
          padding: 18px 20px;
          background: var(--color-brand-ice);
          border-radius: var(--radius-md);
        }
        .vsec--inline .vsec__teaching {
          margin-bottom: 22px;
        }

        /* Draft CTA — hero-style "Draft this for me" button at top of section */
        .vsec__draft {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          padding: 16px 20px;
          border-radius: var(--radius-md);
          margin-bottom: 22px;
          transition: all var(--t-base);
        }
        .vsec__draft.is-primary {
          background: linear-gradient(135deg, var(--color-brand-blue) 0%, var(--color-brand-blue-heavy) 100%);
          color: var(--color-white);
          box-shadow: 0 8px 24px rgba(47, 139, 170, 0.20);
        }
        .vsec__draft.is-primary strong { color: var(--color-white); }
        .vsec__draft.is-primary .vsec__draft-sub { color: rgba(255,255,255,0.85); }
        .vsec__draft.is-primary .vsec__draft-icon {
          background: rgba(255,255,255,0.2);
          color: var(--color-white);
        }
        .vsec__draft.is-primary .btn {
          background: var(--color-white);
          color: var(--color-brand-blue-heavy);
          border-color: var(--color-white);
          font-weight: 600;
        }
        .vsec__draft.is-primary .btn:hover {
          background: var(--color-brand-black);
          color: var(--color-white);
          border-color: var(--color-brand-black);
        }
        .vsec__draft.is-secondary {
          background: var(--color-brand-blue-04);
          border: 1px solid var(--color-brand-blue-15);
          color: var(--fg-1);
        }
        .vsec__draft.is-secondary .vsec__draft-icon {
          background: var(--color-white);
          color: var(--color-brand-blue);
          border: 1px solid var(--color-brand-blue);
        }
        .vsec__draft-body {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 220px;
        }
        .vsec__draft-body strong {
          display: block;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: -0.005em;
          line-height: 1.3;
        }
        .vsec__draft-sub {
          display: block;
          font-size: 12.5px;
          margin-top: 3px;
          line-height: 1.4;
          color: var(--fg-2);
        }
        .vsec__draft-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        /* Field-level badge & redraft */
        .vsec__field-wrap {
          animation: vsec-reveal 360ms var(--ease-out);
          padding: 4px 0;
          position: relative;
        }
        .vsec__field-wrap.is-drafted .vfield__input {
          background: var(--color-brand-blue-04);
          border-color: var(--color-brand-blue-15);
        }
        .vsec__field-wrap.is-drafted .vfield__input:focus {
          background: var(--color-white);
          border-color: var(--color-brand-blue);
        }
        /* Section-level "AI drafted" banner — shown once when any field in the
           section was AI-drafted, instead of repeating above each field. */
        .vsec__drafted-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          padding: 8px 14px;
          background: var(--color-brand-blue-08);
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--color-brand-blue);
        }
        .vsec__drafted-banner-tag {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-brand-blue-heavy);
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .vsec__drafted-banner-hint {
          font-size: 12.5px;
          color: var(--fg-2);
          line-height: 1.4;
        }
        .vsec__field-redraft {
          position: absolute;
          right: 6px;
          top: 32px;
          appearance: none;
          background: transparent;
          border: 1px solid transparent;
          color: var(--color-brand-slate);
          width: 28px;
          height: 28px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          opacity: 0;
          transition: all var(--t-fast);
        }
        .vsec__field-wrap:hover .vsec__field-redraft,
        .vsec__field-wrap:focus-within .vsec__field-redraft { opacity: 1; }
        .vsec__field-redraft:hover {
          background: var(--color-brand-blue-08);
          color: var(--color-brand-blue);
          border-color: var(--color-brand-blue-15);
        }
        .vsec__field-redraft:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Form layout */
        .vsec__form { display: flex; flex-direction: column; gap: 4px; }
        .vsec__field-wrap.is-prior .vfield__label {
          color: var(--fg-2);
          font-weight: 500;
        }
        @keyframes vsec-reveal {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .vsec__show-all {
          appearance: none;
          background: transparent;
          border: 1px dashed var(--border-subtle);
          color: var(--fg-2);
          padding: 10px 16px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 12px;
          align-self: flex-start;
          transition: all var(--t-fast);
        }
        .vsec__show-all:hover {
          color: var(--color-brand-blue);
          border-color: var(--color-brand-blue);
          background: var(--color-brand-blue-04);
        }

        /* Footer nav */
        .vsec__nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid var(--border-subtle);
        }
        .vsec__nav-right { display: flex; gap: 12px; }
      `}</style>
    </article>
  );
}

/* Accordion-style teaching content for "stacked" treatment variant */
function VtoTeachingAccordion({ section }) {
  const [open, setOpen] = React.useState({ definition: true, why: false, example: false });
  const toggle = (k) => setOpen((o) => Object.assign({}, o, { [k]: !o[k] }));

  return (
    <div className="vsec__accordion">
      <div className={"vsec__acc-item " + (open.why ? "is-open " : "")}>
        <button type="button" className="vsec__acc-head" onClick={() => toggle("why")}>
          <span className="vsec__acc-tag">Why it matters</span>
          <span className="vsec__acc-chev" aria-hidden="true">▾</span>
        </button>
        {open.why ? <div className="vsec__acc-body">{section.why}</div> : null}
      </div>
      {section.example ? (
        <div className={"vsec__acc-item " + (open.example ? "is-open " : "")}>
          <button type="button" className="vsec__acc-head" onClick={() => toggle("example")}>
            <span className="vsec__acc-tag">Example</span>
            <span className="vsec__acc-chev" aria-hidden="true">▾</span>
          </button>
          {open.example ? <div className="vsec__acc-body">{section.example}</div> : null}
        </div>
      ) : null}
      {section.tip ? (
        <div className="vsec__teaching-tip" style={{ marginTop: 8 }}>
          <span className="vsec__teaching-tip-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 1.5 V3 M8 13 V14.5 M14.5 8 H13 M3 8 H1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </span>
          <span><strong>Tip ·</strong> {section.tip}</span>
        </div>
      ) : null}

      <style>{`
        .vsec__accordion {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 22px;
        }
        .vsec__acc-item {
          background: var(--color-brand-ice);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .vsec__acc-item.is-open {
          background: var(--color-white);
        }
        .vsec__acc-head {
          appearance: none;
          background: transparent;
          border: 0;
          width: 100%;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          text-align: left;
          color: var(--fg-1);
        }
        .vsec__acc-tag {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: var(--tracking-eyebrow);
          text-transform: uppercase;
          color: var(--color-brand-blue);
        }
        .vsec__acc-chev {
          color: var(--fg-2);
          transition: transform var(--t-base);
        }
        .vsec__acc-item.is-open .vsec__acc-chev {
          transform: rotate(180deg);
        }
        .vsec__acc-body {
          padding: 0 16px 14px;
          color: var(--fg-1);
          font-size: 14px;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   Welcome + Setup screen — intro on the left, the "About your company"
   form on the right. Website is the first field and can autofill the
   company name + description from the site.
   ============================================================ */
function VtoWelcome({ hasProgress, onStart, onReset, onLoadDemo, answers, setAnswer, aboutSection }) {
  const about = (answers && answers.about) || {};
  const fields = (aboutSection && aboutSection.fields) || [];
  const websiteField = fields.find((f) => f.key === "website");
  const restFields = fields.filter((f) => f.key !== "website");

  const [looking, setLooking] = React.useState(false);
  const [note, setNote] = React.useState(null);
  const lookedUpRef = React.useRef("");

  const set = (key, val) => setAnswer("about", key, val);

  const websiteLooksValid = (about.website || "").trim().length > 3 && /\.[a-z]{2,}/i.test(about.website || "");

  /* Fill in name / about / strengths from the website. Only fills empty fields
     so we never clobber what the user has typed. */
  const runLookup = async (auto) => {
    const url = (about.website || "").trim();
    if (!url || looking || !window.vtoEnrichFromWebsite) return;
    if (auto && lookedUpRef.current === url) return; // don't auto-repeat the same URL
    lookedUpRef.current = url;
    setLooking(true);
    setNote(null);
    try {
      const f = await window.vtoEnrichFromWebsite(url);
      const filled = [];
      ["companyName", "about", "strengths"].forEach((k) => {
        const cur = (about[k] || "").trim();
        if (!cur && f[k] && String(f[k]).trim()) { set(k, String(f[k]).trim()); filled.push(k); }
      });
      setNote(filled.length
        ? { ok: true, text: "Pulled in details from your site — edit anything that's off." }
        : { ok: false, text: "Couldn't pull much from that site — add your details below." });
    } catch (e) {
      setNote({ ok: false, text: "Couldn't reach that site just now — add your details below." });
    } finally {
      setLooking(false);
    }
  };

  return (
    <article className="vsetup surface">
      <div className="vsetup__grid">
        {/* Intro / context */}
        <div className="vsetup__intro">
          <span className="eyebrow">EOS V/TO™ Builder</span>
          <h1 className="vsetup__h1">Draft your V/TO,<br />at your own pace.</h1>
          <p className="vsetup__lead">
            A V/TO™ — Vision/Traction Organizer™ — is the foundational tool every company
            running on EOS uses to align on where it's going and how it'll get there.
            Start with a few details about your company and we'll tailor the next 8 sections to you.
          </p>

          <ul className="vsetup__pills">
            <li><span className="vsetup__pill-ic">9</span><span><strong>Sections</strong> Vision side + Traction side</span></li>
            <li><span className="vsetup__pill-ic">↻</span><span><strong>Save &amp; resume</strong> Pick up where you left off</span></li>
            <li><span className="vsetup__pill-ic">🔒</span><span><strong>Saved in your browser</strong> Nothing on our servers</span></li>
            <li><span className="vsetup__pill-ic">✦</span><span><strong>AI coach (optional)</strong> Get unstuck with one click</span></li>
          </ul>
        </div>

        {/* About-your-company form */}
        <div className="vsetup__form">
          <h2 className="vsetup__form-title">Tell us about your company</h2>
          <p className="vsetup__form-sub">Start with your website — we'll fill in the rest. Edit anything.</p>

          {websiteField ? (
            <div className="vfield">
              <div className="vfield__labelwrap">
                <label className="vfield__label" htmlFor="f-website">
                  {websiteField.label}
                  {websiteField.optional ? <span className="vfield__optional"> (optional)</span> : null}
                </label>
                {websiteField.help ? <div className="vfield__help">{websiteField.help}</div> : null}
              </div>
              <div className="vsetup__website">
                <input
                  id="f-website"
                  type="text"
                  className="vfield__input"
                  placeholder={websiteField.placeholder || ""}
                  value={about.website || ""}
                  onChange={(e) => set("website", e.target.value)}
                  onBlur={() => { if (websiteLooksValid) runLookup(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (websiteLooksValid) runLookup(false); } }}
                />
                <button
                  type="button"
                  className="btn btn--neutral btn--sm vsetup__lookup"
                  onClick={() => runLookup(false)}
                  disabled={looking || !websiteLooksValid}
                  title="Autofill from your website"
                >
                  {looking ? "Reading…" : "✦ Autofill"}
                </button>
              </div>
              {note ? <div className={"vsetup__note " + (note.ok ? "is-ok" : "is-warn")}>{note.text}</div> : null}
            </div>
          ) : null}

          {restFields.map((f) => (
            <VtoField
              key={f.key}
              field={f}
              value={about[f.key]}
              onChange={(v) => set(f.key, v)}
              autoFocus={false}
            />
          ))}

          <div className="vsetup__nav">
            {hasProgress ? (
              <button className="btn btn--text" onClick={onReset}>Start over</button>
            ) : <span />}
            <div className="vsetup__nav-right">
              {!hasProgress && onLoadDemo ? (
                <button className="btn btn--neutral" onClick={onLoadDemo}>See it with sample data</button>
              ) : null}
              <button className="btn btn--lg" onClick={onStart}>
                {hasProgress ? "Continue your V/TO →" : "Start the V/TO Builder →"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .vsetup { padding: 36px 40px 32px; }
        @media (max-width: 720px) { .vsetup { padding: 24px 22px 22px; } }
        .vsetup__grid {
          display: grid;
          grid-template-columns: 0.82fr 1.18fr;
          gap: 44px;
          align-items: start;
        }
        @media (max-width: 860px) {
          .vsetup__grid { grid-template-columns: 1fr; gap: 28px; }
        }
        .vsetup__h1 {
          margin: 10px 0 14px;
          font-size: var(--fs-display);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        @media (max-width: 720px) { .vsetup__h1 { font-size: 32px; } }
        .vsetup__lead {
          font-size: 16px;
          color: var(--fg-2);
          line-height: 1.6;
          margin: 0 0 24px;
        }
        .vsetup__pills {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .vsetup__pills li {
          display: flex;
          gap: 12px;
          align-items: center;
          font-size: 13.5px;
          color: var(--fg-2);
          line-height: 1.4;
        }
        .vsetup__pills strong {
          display: block;
          color: var(--fg-1);
          font-weight: 600;
          font-size: 13.5px;
        }
        .vsetup__pill-ic {
          width: 30px; height: 30px;
          border-radius: 50%;
          background: var(--color-brand-blue);
          color: var(--color-white);
          font-weight: 700;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          font-size: 13px;
        }

        .vsetup__form {
          background: var(--color-brand-ice);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px 24px 22px;
        }
        @media (max-width: 720px) { .vsetup__form { padding: 18px 16px 16px; } }
        .vsetup__form-title {
          margin: 0 0 4px;
          font-size: var(--fs-h3);
          font-weight: 600;
        }
        .vsetup__form-sub {
          margin: 0 0 20px;
          font-size: 13.5px;
          color: var(--fg-2);
        }
        .vsetup__website {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .vsetup__website .vfield__input { flex: 1; }
        .vsetup__lookup {
          white-space: nowrap;
          flex-shrink: 0;
        }
        .vsetup__note {
          margin-top: 8px;
          font-size: 12.5px;
          line-height: 1.45;
          padding: 7px 11px;
          border-radius: var(--radius-sm);
        }
        .vsetup__note.is-ok {
          color: var(--color-brand-blue-heavy);
          background: var(--color-brand-blue-08);
          border-left: 3px solid var(--color-brand-blue);
        }
        .vsetup__note.is-warn {
          color: var(--fg-2);
          background: var(--color-brand-mist);
          border-left: 3px solid var(--color-brand-slate);
        }
        .vsetup__nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid var(--border-subtle);
          flex-wrap: wrap;
        }
        .vsetup__nav-right {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
      `}</style>
    </article>
  );
}

/* ============================================================
   Quick-pick chips — clickable common values for list fields
   ============================================================ */
function VtoQuickPicks({ section, picks, currentItems, onAdd }) {
  if (!picks || picks.length === 0) return null;
  const isInList = (pick) => {
    return currentItems.some((c) => c && (c.value || c.name) === (pick.value || pick.name));
  };

  return (
    <div className="vqp">
      <div className="vqp__head">
        <span className="vqp__tag">Quick picks</span>
        <span className="vqp__sub">Tap to add — edit afterwards.</span>
      </div>
      <div className="vqp__chips">
        {picks.map((p, i) => {
          const used = isInList(p);
          return (
            <button
              key={i}
              type="button"
              className={"vqp__chip " + (used ? "is-used " : "")}
              onClick={() => onAdd(p)}
              disabled={used}
              title={p.descriptor || ""}
            >
              {used ? <span className="vqp__chip-check" aria-hidden="true">✓ </span> : <span className="vqp__chip-plus" aria-hidden="true">+ </span>}
              {p.value || p.name}
            </button>
          );
        })}
      </div>
      <style>{`
        .vqp {
          margin-bottom: 16px;
          padding: 14px 16px;
          background: var(--color-brand-ice);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
        }
        .vqp__head {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .vqp__tag {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: var(--tracking-eyebrow);
          text-transform: uppercase;
          color: var(--color-brand-blue);
        }
        .vqp__sub {
          font-size: 12.5px;
          color: var(--fg-2);
        }
        .vqp__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .vqp__chip {
          appearance: none;
          background: var(--color-white);
          color: var(--fg-1);
          border: 1px solid var(--border-subtle);
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--t-fast);
        }
        .vqp__chip:hover {
          border-color: var(--color-brand-blue);
          color: var(--color-brand-blue);
          background: var(--color-brand-blue-04);
        }
        .vqp__chip.is-used {
          background: var(--color-brand-blue);
          color: var(--color-white);
          border-color: var(--color-brand-blue);
          cursor: default;
          opacity: 0.7;
        }
        .vqp__chip-plus {
          color: var(--color-brand-blue);
          font-weight: 700;
          margin-right: 2px;
        }
        .vqp__chip.is-used .vqp__chip-plus { display: none; }
        .vqp__chip-check {
          color: var(--color-white);
          font-weight: 700;
          margin-right: 2px;
        }
      `}</style>
    </div>
  );
}

/* Build a 1-line summary of the user's context for the draft CTA */
function vtoContextSummary(answers) {
  const a = answers || {};
  const about = a.about || {};
  if (about.companyName && about.about) {
    return "what you told me about " + about.companyName;
  }
  if (about.companyName) {
    return about.companyName;
  }
  return "what you've shared so far";
}

Object.assign(window, { VtoSection, VtoWelcome, VtoTeachingAccordion, VtoQuickPicks, vtoContextSummary });
