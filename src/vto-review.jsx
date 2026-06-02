/* V/TO Builder — Review screen.
   1) A "ready to use" summary card at the top (mirrors how Rollout Journey shows the Rock).
   2) The full V/TO doc — two landscape "pages" (Vision side, Traction side) with inline editable text.
   3) Export actions — Copy V/TO text / Print / save as PDF. */

function VtoReview({ answers, setAnswer, sections, goToSection }) {
  const about = answers.about || {};
  const review = {};
  sections.forEach((s) => {review[s.id] = answers[s.id] || {};});

  /* Section completion summary */
  const total = sections.reduce((s, sec) => s + (sec.fields ? sec.fields.length : 0), 0);
  const done = sections.reduce((s, sec) => {
    const a = answers[sec.id] || {};
    return s + (sec.fields ? sec.fields.filter((f) => vtoFieldFilled(f, a[f.key])).length : 0);
  }, 0);
  const pct = Math.round(done / Math.max(total, 1) * 100);
  const isComplete = pct === 100;

  /* Lazy-derive list values as arrays. */
  const list = (sectionId, key) => {
    const v = (answers[sectionId] || {})[key];
    return Array.isArray(v) ? v : [];
  };

  return (
    <div className="vrev">
      {/* ------------ Send-to-Ninety Rock preview ------------ */}
      <VtoSendToNinety answers={answers} sections={sections} pct={pct} isComplete={isComplete} />

      {/* ------------ V/TO document ------------ */}
      <div className="vrev__doc">
        <header className="vrev__doc-head">
          <div>
            <span className="eyebrow eyebrow--muted">V/TO™ — Vision/Traction Organizer</span>
            <h2 className="vrev__doc-title">
              {about.companyName ? about.companyName : "Your company"}
            </h2>
            <p className="vrev__doc-meta">
              Drafted {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })} ·
              {" "}{pct}% complete · Click any field to edit
            </p>
          </div>
          <div className="vrev__doc-actions">
            <button className="btn btn--neutral btn--sm" onClick={() => window.print()}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                <path d="M4 6 V2 H12 V6 M4 12 H2 V6 H14 V12 H12 M4 9 H12 V14 H4 Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Print / PDF
            </button>
            <button className="btn btn--neutral btn--sm" onClick={() => copyVtoText(answers, sections)}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                <rect x="5" y="3" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 11 V5 a1.5 1.5 0 0 1 1.5 -1.5 H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copy
            </button>
          </div>
        </header>

        {/* Vision side page */}
        <section className="vrev__page">
          <header className="vrev__page-head">
            <span className="vrev__page-tag">VISION 
</span>
            <span className="vrev__page-sub">Where are we going?</span>
          </header>

          <div className="vrev__page-grid vrev__page-grid--vision">
            {/* Left column — Core Values + Core Focus */}
            <div className="vrev__col">
              <VtoBlock title="Core Values" count={list("core-values", "items").length} onEdit={() => goToSection("core-values")}>
                {list("core-values", "items").length === 0 ? <span className="vrev__empty">No Core Values yet — click to add.</span> :

                <ul className="vrev__list vrev__list--kv">
                    {list("core-values", "items").map((it, i) =>
                  <li key={i}>
                        <span className="vrev__list-name">{it.value || <em>—</em>}</span>
                        <span className="vrev__list-extra">{it.descriptor || ""}</span>
                      </li>
                  )}
                  </ul>
                }
              </VtoBlock>

              <VtoBlock title="Core Focus™" onEdit={() => goToSection("core-focus")}>
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Purpose / Cause / Passion</div>
                  <div className="vrev__kv-val">{review["core-focus"].purpose || <em>Not set</em>}</div>
                </div>
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Niche</div>
                  <div className="vrev__kv-val">{review["core-focus"].niche || <em>Not set</em>}</div>
                </div>
              </VtoBlock>
            </div>

            {/* Right column — 10-Year Target on top, then Marketing Strategy (2/3) + 3-Year Picture (1/3) */}
            <div className="vrev__col">
              <VtoBlock title="10-Year Target™" onEdit={() => goToSection("ten-year-target")}>
                <p className="vrev__paragraph">{review["ten-year-target"].target || <em className="vrev__empty">Bold long-term goal goes here.</em>}</p>
                {review["ten-year-target"].targetYear ?
                <div className="vrev__chip">By {review["ten-year-target"].targetYear}</div> :
                null}
              </VtoBlock>

              <div className="vrev__subgrid">
                <VtoBlock title="Marketing Strategy" onEdit={() => goToSection("marketing-strategy")}>
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Target Market</div>
                  <div className="vrev__kv-val">{review["marketing-strategy"].targetMarket || <em>Not set</em>}</div>
                </div>
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Three Uniques™</div>
                  <div className="vrev__kv-val">
                    {list("marketing-strategy", "threeUniques").length === 0 ? <em>Not set</em> :
                    <ol className="vrev__inline-list">
                        {list("marketing-strategy", "threeUniques").map((u, i) =>
                      <li key={i}><strong>{u.name || "—"}.</strong> {u.descriptor || ""}</li>
                      )}
                      </ol>
                    }
                  </div>
                </div>
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Proven Process</div>
                  <div className="vrev__kv-val">
                    {review["marketing-strategy"].provenProcessName ?
                    <span><strong>{review["marketing-strategy"].provenProcessName}</strong> · </span> :
                    null}
                    {list("marketing-strategy", "provenProcessSteps").length > 0 ?
                    list("marketing-strategy", "provenProcessSteps").map((s, i) => {
                      const v = typeof s === "string" ? s : s && s.name;
                      return <span key={i} className="vrev__step">{v}{i < list("marketing-strategy", "provenProcessSteps").length - 1 ? " → " : ""}</span>;
                    }) :
                    <em>Not set</em>}
                  </div>
                </div>
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Guarantee</div>
                  <div className="vrev__kv-val">{review["marketing-strategy"].guarantee || <em>Not set</em>}</div>
                </div>
              </VtoBlock>

                <VtoBlock title="3-Year Picture™" onEdit={() => goToSection("three-year-picture")}>
                <div className="vrev__metric-row">
                  <div className="vrev__metric">
                    <span className="vrev__metric-label">Date</span>
                    <span className="vrev__metric-val">{review["three-year-picture"].targetDate || "—"}</span>
                  </div>
                  <div className="vrev__metric">
                    <span className="vrev__metric-label">Revenue</span>
                    <span className="vrev__metric-val">{review["three-year-picture"].revenue || "—"}</span>
                  </div>
                  <div className="vrev__metric">
                    <span className="vrev__metric-label">Profit</span>
                    <span className="vrev__metric-val">{review["three-year-picture"].profit || "—"}</span>
                  </div>
                </div>
                {list("three-year-picture", "measurables").length > 0 ?
                <div className="vrev__sublist">
                    <span className="vrev__sublist-label">Measurables</span>
                    <ul className="vrev__list vrev__list--simple">
                      {list("three-year-picture", "measurables").map((m, i) => {
                      const v = typeof m === "string" ? m : m && m.name;
                      return v ? <li key={i}>{v}</li> : null;
                    })}
                    </ul>
                  </div> :
                null}
                {list("three-year-picture", "lookLike").length > 0 ?
                <div className="vrev__sublist">
                    <span className="vrev__sublist-label">What does it look like?</span>
                    <ul className="vrev__list vrev__list--check">
                      {list("three-year-picture", "lookLike").map((m, i) => {
                      const v = typeof m === "string" ? m : m && m.name;
                      return v ? <li key={i}>{v}</li> : null;
                    })}
                    </ul>
                  </div> :
                null}
                </VtoBlock>
              </div>
            </div>
          </div>
        </section>

        {/* Traction side page */}
        <section className="vrev__page">
          <header className="vrev__page-head">
            <span className="vrev__page-tag vrev__page-tag--traction">TRACTION®</span>
            <span className="vrev__page-sub">How do we get there?</span>
          </header>

          <div className="vrev__page-grid vrev__page-grid--traction">
            <VtoBlock title="1-Year Plan" onEdit={() => goToSection("one-year-plan")}>
              <div className="vrev__metric-row">
                <div className="vrev__metric">
                  <span className="vrev__metric-label">Date</span>
                  <span className="vrev__metric-val">{review["one-year-plan"].targetDate || "—"}</span>
                </div>
                <div className="vrev__metric">
                  <span className="vrev__metric-label">Revenue</span>
                  <span className="vrev__metric-val">{review["one-year-plan"].revenue || "—"}</span>
                </div>
                <div className="vrev__metric">
                  <span className="vrev__metric-label">Profit</span>
                  <span className="vrev__metric-val">{review["one-year-plan"].profit || "—"}</span>
                </div>
              </div>
              {list("one-year-plan", "measurables").length > 0 ?
              <div className="vrev__sublist">
                  <span className="vrev__sublist-label">Measurables</span>
                  <ul className="vrev__list vrev__list--simple">
                    {list("one-year-plan", "measurables").map((m, i) => {
                    const v = typeof m === "string" ? m : m && m.name;
                    return v ? <li key={i}>{v}</li> : null;
                  })}
                  </ul>
                </div> :
              null}
              {list("one-year-plan", "goals").length > 0 ?
              <div className="vrev__sublist">
                  <span className="vrev__sublist-label">Goals for the year</span>
                  <ul className="vrev__list vrev__list--num">
                    {list("one-year-plan", "goals").map((m, i) => {
                    const v = typeof m === "string" ? m : m && m.name;
                    return v ? <li key={i}>{v}</li> : null;
                  })}
                  </ul>
                </div> :
              null}
            </VtoBlock>

            <VtoBlock title="Rocks" subtitle="Next 90 days" count={list("rocks", "items").length} onEdit={() => goToSection("rocks")}>
              {list("rocks", "items").length === 0 ?
              <span className="vrev__empty">No Rocks yet.</span> :

              <ol className="vrev__rocks">
                  {list("rocks", "items").map((r, i) =>
                <li key={i}>
                      <span className="vrev__rock-body">{r.rock || <em>—</em>}</span>
                      {r.owner ? <span className="vrev__rock-owner">{r.owner}</span> : null}
                    </li>
                )}
                </ol>
              }
            </VtoBlock>

            <VtoBlock title="Issues List" subtitle="Parking lot" count={list("issues-list", "items").length} onEdit={() => goToSection("issues-list")}>
              {list("issues-list", "items").length === 0 ?
              <span className="vrev__empty">No issues captured. That's OK.</span> :

              <ul className="vrev__list vrev__list--check">
                  {list("issues-list", "items").map((m, i) => {
                  const v = typeof m === "string" ? m : m && m.name;
                  return v ? <li key={i}>{v}</li> : null;
                })}
                </ul>
              }
            </VtoBlock>
          </div>
        </section>
      </div>

      <style>{`
        .vrev {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* Document */
        .vrev__doc {
          background: var(--color-white);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 28px 32px 32px;
          box-shadow: var(--shadow-xs);
        }
        .vrev__doc-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          padding-bottom: 22px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .vrev__doc-title {
          margin: 6px 0 4px;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .vrev__doc-meta {
          margin: 0;
          color: var(--fg-2);
          font-size: 13px;
        }
        .vrev__doc-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Page */
        .vrev__page {
          margin-bottom: 28px;
        }
        .vrev__page:last-child { margin-bottom: 0; }
        .vrev__page-head {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 18px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--color-brand-blue);
        }
        .vrev__page-tag {
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: var(--tracking-eyebrow);
          text-transform: uppercase;
          color: var(--color-brand-blue);
        }
        .vrev__page-tag--traction {
          color: var(--color-brand-black);
        }
        .vrev__page-sub {
          font-size: 12.5px;
          color: var(--fg-2);
          font-style: italic;
        }

        .vrev__page-grid {
          display: grid;
          gap: 16px;
        }
        .vrev__page-grid--vision {
          grid-template-columns: 0.85fr 1.6fr;
        }
        .vrev__subgrid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .vrev__subgrid { grid-template-columns: 1fr; }
        }
        .vrev__page-grid--traction {
          grid-template-columns: 1.2fr 1fr 1fr;
        }
        @media (max-width: 900px) {
          .vrev__page-grid--vision,
          .vrev__page-grid--traction { grid-template-columns: 1fr; }
        }
        .vrev__col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Empty placeholder */
        .vrev__empty {
          color: var(--color-brand-slate);
          font-size: 13px;
          font-style: italic;
        }

        /* Lists */
        .vrev__list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .vrev__list--kv li {
          display: grid;
          grid-template-columns: minmax(110px, 0.42fr) 1fr;
          gap: 12px;
          padding: 6px 0;
          border-top: 1px solid var(--color-brand-mist);
        }
        .vrev__list--kv li:first-child { border-top: 0; }
        .vrev__list-name {
          font-weight: 600;
          color: var(--fg-1);
          font-size: 14px;
        }
        .vrev__list-extra {
          font-size: 13.5px;
          color: var(--fg-2);
          line-height: 1.5;
        }
        .vrev__list--simple li {
          padding: 4px 0;
          font-size: 13.5px;
          color: var(--fg-1);
          border-top: 1px solid var(--color-brand-mist);
        }
        .vrev__list--simple li:first-child { border-top: 0; }

        .vrev__list--check li,
        .vrev__list--num li {
          display: grid;
          grid-template-columns: 18px 1fr;
          gap: 8px;
          align-items: start;
          font-size: 13.5px;
          color: var(--fg-1);
          padding: 4px 0;
          border-top: 1px solid var(--color-brand-mist);
        }
        .vrev__list--check li:first-child,
        .vrev__list--num li:first-child { border-top: 0; }
        .vrev__list--check li::before {
          content: "";
          width: 12px;
          height: 12px;
          border: 1.5px solid var(--color-brand-slate);
          border-radius: 3px;
          margin-top: 4px;
        }
        .vrev__list--num {
          counter-reset: num;
        }
        .vrev__list--num li {
          counter-increment: num;
        }
        .vrev__list--num li::before {
          content: counter(num);
          color: var(--color-brand-blue);
          font-weight: 700;
          font-size: 12px;
          padding-top: 2px;
        }

        .vrev__inline-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .vrev__inline-list li {
          font-size: 13.5px;
          color: var(--fg-1);
          line-height: 1.55;
        }
        .vrev__inline-list strong {
          color: var(--color-brand-blue-heavy);
          font-weight: 700;
        }

        /* Key-value display */
        .vrev__kv {
          padding: 8px 0;
          border-top: 1px solid var(--color-brand-mist);
        }
        .vrev__kv:first-child { border-top: 0; padding-top: 2px; }
        .vrev__kv-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--fg-2);
          margin-bottom: 4px;
        }
        .vrev__kv-val {
          font-size: 14px;
          color: var(--fg-1);
          line-height: 1.55;
        }
        .vrev__kv-val em { color: var(--color-brand-slate); font-style: italic; }
        .vrev__step {
          font-size: 13px;
          color: var(--fg-1);
        }

        /* Paragraph + chip */
        .vrev__paragraph {
          margin: 0 0 8px;
          font-size: 14.5px;
          line-height: 1.55;
          color: var(--fg-1);
        }
        .vrev__chip {
          display: inline-block;
          padding: 3px 10px;
          background: var(--color-brand-blue-08);
          color: var(--color-brand-blue-heavy);
          border-radius: var(--radius-pill);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        /* Metric row */
        .vrev__metric-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding: 8px 0 12px;
          border-bottom: 1px solid var(--color-brand-mist);
          margin-bottom: 8px;
        }
        .vrev__metric {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .vrev__metric-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--fg-2);
        }
        .vrev__metric-val {
          font-size: 15px;
          font-weight: 600;
          color: var(--fg-1);
        }
        .vrev__sublist {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid var(--color-brand-mist);
        }
        .vrev__sublist-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--fg-2);
          margin-bottom: 6px;
        }

        /* Rocks display */
        .vrev__rocks {
          list-style: none;
          padding: 0;
          margin: 0;
          counter-reset: rock;
        }
        .vrev__rocks li {
          counter-increment: rock;
          display: grid;
          grid-template-columns: 22px 1fr auto;
          gap: 10px;
          padding: 8px 0;
          border-top: 1px solid var(--color-brand-mist);
          align-items: start;
        }
        .vrev__rocks li:first-child { border-top: 0; }
        .vrev__rocks li::before {
          content: counter(rock);
          background: var(--color-brand-blue-08);
          color: var(--color-brand-blue-heavy);
          width: 22px; height: 22px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 11.5px;
          font-weight: 700;
          margin-top: 2px;
        }
        .vrev__rock-body {
          font-size: 14px;
          color: var(--fg-1);
          line-height: 1.5;
        }
        .vrev__rock-owner {
          background: var(--color-brand-blue);
          color: var(--color-white);
          font-size: 11.5px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: var(--radius-pill);
          white-space: nowrap;
          margin-top: 2px;
        }
      `}</style>
    </div>);

}

/* ============================================================
   A reusable block — title + edit affordance + body
   ============================================================ */
function VtoBlock({ title, subtitle, count, onEdit, children }) {
  return (
    <div className="vrev__block">
      <header className="vrev__block-head">
        <div>
          <h3 className="vrev__block-title">
            {title}
            {count !== undefined ? <span className="vrev__block-count"> · {count}</span> : null}
          </h3>
          {subtitle ? <span className="vrev__block-sub">{subtitle}</span> : null}
        </div>
        <button type="button" className="vrev__block-edit" onClick={onEdit} aria-label={"Edit " + title}>
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
            <path d="M2 12 L2 14 L4 14 L13 5 L11 3 L2 12 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          Edit
        </button>
      </header>
      <div className="vrev__block-body">{children}</div>

      <style>{`
        .vrev__block {
          background: var(--color-white);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px 18px 14px;
          display: flex;
          flex-direction: column;
        }
        .vrev__block-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
          padding-bottom: 10px;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--color-brand-mist);
        }
        .vrev__block-title {
          margin: 0;
          font-size: 15.5px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .vrev__block-count {
          color: var(--fg-2);
          font-weight: 500;
          font-size: 13.5px;
        }
        .vrev__block-sub {
          font-size: 11.5px;
          color: var(--fg-3);
          font-style: italic;
          margin-left: 2px;
        }
        .vrev__block-edit {
          appearance: none;
          background: transparent;
          border: 0;
          color: var(--fg-3);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          padding: 3px 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all var(--t-fast);
        }
        .vrev__block-edit:hover {
          color: var(--color-brand-blue);
          background: var(--color-brand-blue-04);
        }
        .vrev__block-body {
          flex: 1;
        }
      `}</style>
    </div>);

}

/* ============================================================
   Send-to-Ninety card — Rock-preview style.
   ============================================================ */
function VtoSendToNinety({ answers, sections, pct, isComplete }) {
  const about = answers.about || {};
  const tyt = answers["ten-year-target"] || {};
  const oneYear = answers["one-year-plan"] || {};

  const [copied, setCopied] = React.useState(false);
  const onCopy = () => {
    const text = buildVtoText(answers, sections);
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <section className="vsend">
      <header className="vsend__head">
        <div className="vsend__brand">
          <img className="vsend__brand-logo" src="assets/90-logo-black.png" alt="Ninety" />
          <div>
            <span className="vsend__kicker">Your V/TO · ready to use</span>
            <span className="vsend__title">
              {isComplete ? "🎉 Your V/TO is complete." : "Your V/TO is ready to use."}
            </span>
          </div>
        </div>
        <div className="vsend__meter">
          <span className="vsend__meter-num">{pct}<span>%</span></span>
          <span className="vsend__meter-label">drafted</span>
          <div className="vsend__meter-bar"><span style={{ width: pct + "%" }} /></div>
        </div>
      </header>

      <div className="vsend__body">
        <p className="vsend__lead">
          When you're ready, copy your V/TO into your Ninety account — it becomes the home for your Vision, Quarterly Rocks, and Issues List.
          {!isComplete ? <span className="vsend__lead-note"> You can send a partial draft and finish in Ninety, or keep editing here.</span> : null}
        </p>

        <div className="vsend__meta">
          <div>
            <span className="vsend__meta-label">Company</span>
            <span className="vsend__meta-val">{about.companyName || <em>— add a company name —</em>}</span>
          </div>
          <div>
            <span className="vsend__meta-label">10-Year Target</span>
            <span className="vsend__meta-val">{tyt.target ? truncate(tyt.target, 80) : <em>— add a 10-Year Target —</em>}</span>
          </div>
          <div>
            <span className="vsend__meta-label">1-Year Plan</span>
            <span className="vsend__meta-val">{oneYear.revenue || oneYear.targetDate ? `${oneYear.revenue || ""}${oneYear.revenue && oneYear.targetDate ? " · " : ""}${oneYear.targetDate || ""}` : <em>— set 1-Year metrics —</em>}</span>
          </div>
        </div>

        <div className="vsend__actions">
          <button className={"btn " + (copied ? "is-copied " : "")} onClick={onCopy}>
            {copied ?
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                  <path d="M3 8.5 L7 12 L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copied!
              </span> :

            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                  <rect x="5" y="3" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 11 V5 a1.5 1.5 0 0 1 1.5 -1.5 H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copy V/TO text
              </span>
            }
          </button>
          <button className="btn btn--text" onClick={() => window.print()}>
            Print / save as PDF
          </button>
        </div>
      </div>

      <style>{`
        .vsend {
          background: var(--color-white);
          border: 1.5px solid var(--color-brand-blue);
          border-radius: var(--radius-lg);
          padding: 22px 28px 26px;
          box-shadow: 0 8px 24px rgba(47, 139, 170, 0.10);
        }
        .vsend__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .vsend__brand {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .vsend__brand-logo {
          height: 30px;
          width: auto;
        }
        .vsend__kicker {
          display: block;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: var(--tracking-eyebrow);
          color: var(--color-brand-blue);
        }
        .vsend__title {
          display: block;
          font-size: 22px;
          font-weight: 700;
          color: var(--fg-1);
          letter-spacing: -0.015em;
          margin-top: 4px;
        }
        .vsend__meter {
          display: grid;
          grid-template-columns: auto auto;
          align-items: baseline;
          column-gap: 8px;
          row-gap: 4px;
          min-width: 160px;
        }
        .vsend__meter-num {
          font-size: 36px;
          font-weight: 700;
          color: var(--color-brand-blue);
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .vsend__meter-num span { font-size: 18px; font-weight: 600; }
        .vsend__meter-label {
          color: var(--fg-2);
          font-size: 13px;
          align-self: end;
        }
        .vsend__meter-bar {
          grid-column: 1 / -1;
          height: 5px;
          background: var(--color-brand-mist);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 4px;
        }
        .vsend__meter-bar > span {
          display: block;
          height: 100%;
          background: var(--color-brand-blue);
          border-radius: 99px;
          transition: width 320ms var(--ease-out);
        }

        .vsend__lead {
          font-size: 14.5px;
          color: var(--fg-2);
          margin: 0 0 16px;
          line-height: 1.55;
          max-width: 65ch;
        }
        .vsend__lead-note {
          color: var(--fg-3);
          font-style: italic;
        }

        .vsend__meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          padding: 14px 0;
          border-top: 1px solid var(--color-brand-mist);
          border-bottom: 1px solid var(--color-brand-mist);
          margin-bottom: 18px;
        }
        @media (max-width: 700px) { .vsend__meta { grid-template-columns: 1fr; } }
        .vsend__meta > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .vsend__meta-label {
          font-size: 11px;
          color: var(--fg-2);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }
        .vsend__meta-val {
          font-size: 14px;
          font-weight: 600;
          color: var(--fg-1);
          line-height: 1.45;
        }
        .vsend__meta-val em { color: var(--color-brand-slate); font-style: italic; font-weight: 400; }

        .vsend__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
      `}</style>
    </section>);

}

/* ============================================================
   Plain-text export of the full V/TO — used by Copy buttons
   ============================================================ */
function buildVtoText(answers, sections) {
  const lines = [];
  const a = answers || {};
  const company = a.about && a.about.companyName || "Your company";
  lines.push(company + " — V/TO");
  lines.push("Drafted " + new Date().toLocaleDateString());
  lines.push("");
  lines.push("===== VISION SIDE =====");
  lines.push("");

  const cv = a["core-values"] && a["core-values"].items || [];
  if (cv.length) {
    lines.push("CORE VALUES");
    cv.forEach((it, i) => {
      if (it && it.value) lines.push("  " + (i + 1) + ". " + it.value + (it.descriptor ? " — " + it.descriptor : ""));
    });
    lines.push("");
  }

  const cf = a["core-focus"] || {};
  if (cf.purpose || cf.niche) {
    lines.push("CORE FOCUS");
    if (cf.purpose) lines.push("  Purpose: " + cf.purpose);
    if (cf.niche) lines.push("  Niche:   " + cf.niche);
    lines.push("");
  }

  const tyt = a["ten-year-target"] || {};
  if (tyt.target) {
    lines.push("10-YEAR TARGET");
    lines.push("  " + tyt.target + (tyt.targetYear ? " (by " + tyt.targetYear + ")" : ""));
    lines.push("");
  }

  const ms = a["marketing-strategy"] || {};
  if (ms.targetMarket || ms.threeUniques && ms.threeUniques.length || ms.provenProcessName || ms.guarantee) {
    lines.push("MARKETING STRATEGY");
    if (ms.targetMarket) lines.push("  Target Market: " + ms.targetMarket);
    if (ms.threeUniques && ms.threeUniques.length) {
      lines.push("  Three Uniques:");
      ms.threeUniques.forEach((u) => {
        if (u && u.name) lines.push("    - " + u.name + (u.descriptor ? ": " + u.descriptor : ""));
      });
    }
    if (ms.provenProcessName) {
      let pp = "  Proven Process: " + ms.provenProcessName;
      if (ms.provenProcessSteps && ms.provenProcessSteps.length) {
        const steps = ms.provenProcessSteps.map((s) => typeof s === "string" ? s : s && s.name).filter(Boolean);
        if (steps.length) pp += " — " + steps.join(" → ");
      }
      lines.push(pp);
    }
    if (ms.guarantee) lines.push("  Guarantee: " + ms.guarantee);
    lines.push("");
  }

  const typ = a["three-year-picture"] || {};
  if (typ.targetDate || typ.revenue || typ.profit || typ.lookLike && typ.lookLike.length) {
    lines.push("3-YEAR PICTURE");
    if (typ.targetDate) lines.push("  Date:    " + typ.targetDate);
    if (typ.revenue) lines.push("  Revenue: " + typ.revenue);
    if (typ.profit) lines.push("  Profit:  " + typ.profit);
    if (typ.measurables && typ.measurables.length) {
      lines.push("  Measurables:");
      typ.measurables.forEach((m) => {
        const v = typeof m === "string" ? m : m && m.name;
        if (v) lines.push("    - " + v);
      });
    }
    if (typ.lookLike && typ.lookLike.length) {
      lines.push("  What does it look like:");
      typ.lookLike.forEach((m) => {
        const v = typeof m === "string" ? m : m && m.name;
        if (v) lines.push("    - " + v);
      });
    }
    lines.push("");
  }

  lines.push("===== TRACTION SIDE =====");
  lines.push("");

  const oyp = a["one-year-plan"] || {};
  if (oyp.targetDate || oyp.revenue || oyp.goals && oyp.goals.length) {
    lines.push("1-YEAR PLAN");
    if (oyp.targetDate) lines.push("  Date:    " + oyp.targetDate);
    if (oyp.revenue) lines.push("  Revenue: " + oyp.revenue);
    if (oyp.profit) lines.push("  Profit:  " + oyp.profit);
    if (oyp.goals && oyp.goals.length) {
      lines.push("  Goals:");
      oyp.goals.forEach((m, i) => {
        const v = typeof m === "string" ? m : m && m.name;
        if (v) lines.push("    " + (i + 1) + ". " + v);
      });
    }
    lines.push("");
  }

  const rocks = a.rocks && a.rocks.items || [];
  if (rocks.length) {
    lines.push("ROCKS (next 90 days)");
    rocks.forEach((r, i) => {
      if (r && r.rock) lines.push("  " + (i + 1) + ". " + r.rock + (r.owner ? " — Owner: " + r.owner : ""));
    });
    lines.push("");
  }

  const issues = a["issues-list"] && a["issues-list"].items || [];
  if (issues.length) {
    lines.push("ISSUES LIST");
    issues.forEach((m, i) => {
      const v = typeof m === "string" ? m : m && m.name;
      if (v) lines.push("  " + (i + 1) + ". " + v);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function copyVtoText(answers, sections) {
  const text = buildVtoText(answers, sections);
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => {
    const el = document.getElementById("toast");
    if (el) {
      el.textContent = "V/TO copied to clipboard";
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 1800);
    }
  });
}

function truncate(s, n) {
  if (!s) return s;
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

Object.assign(window, { VtoReview, VtoBlock, VtoSendToNinety, buildVtoText, copyVtoText });