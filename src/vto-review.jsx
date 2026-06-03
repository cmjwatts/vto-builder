/* V/TO Builder — Review screen.
   1) A "ready to use" summary card at the top (mirrors how Rollout Journey shows the Rock).
   2) The full V/TO doc — two landscape "pages" (Vision side, Traction side). Every value is
      editable in place: click any text to edit it, use + to add list items, hover to remove.
   3) Export actions — Copy V/TO text / Print / save as PDF. */

/* Click-to-edit text. Renders as plain text; clicking (or focusing) turns it into an input
   that commits on blur or Enter and cancels on Escape. */
function VtoEditable({ value, onCommit, placeholder, multiline }) {
  const cur = value == null ? "" : String(value);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(cur);
  React.useEffect(() => { setDraft(cur); }, [cur]);

  const commit = () => { setEditing(false); if (draft.trim() !== cur) onCommit(draft.trim()); };
  const cancel = () => { setDraft(cur); setEditing(false); };

  if (editing) {
    const props = {
      autoFocus: true,
      className: "vrev-edit__input",
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onBlur: commit,
    };
    return multiline
      ? <textarea {...props} rows={2} onKeyDown={(e) => { if (e.key === "Escape") cancel(); }} />
      : <input type="text" {...props} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } else if (e.key === "Escape") cancel(); }} />;
  }
  return (
    <span
      className={"vrev-edit" + (cur ? "" : " is-empty")}
      tabIndex={0}
      role="textbox"
      onClick={() => setEditing(true)}
      onFocus={() => setEditing(true)}
    >
      {cur || placeholder || "Click to add…"}
    </span>
  );
}

/* A list of single-value items (measurables, goals, issues, look-like bullets, process steps)
   with inline-editable rows, hover-to-remove, and a + Add button. */
function VtoSingleList({ items, onChange, ulClass, placeholder, addLabel }) {
  const arr = Array.isArray(items) ? items : [];
  const text = (it) => (typeof it === "string" ? it : (it && it.name) || "");
  const setAt = (i, v) => { const a = arr.slice(); a[i] = v; onChange(a); };
  const removeAt = (i) => { const a = arr.slice(); a.splice(i, 1); onChange(a); };
  const add = () => { onChange(arr.concat([""])); };
  return (
    <React.Fragment>
      {arr.length > 0 ? (
        <ul className={ulClass}>
          {arr.map((it, i) => (
            <li key={i} className="vrev-li">
              <VtoEditable value={text(it)} placeholder={placeholder} onCommit={(v) => setAt(i, v)} />
              <button type="button" className="vrev-rm" onClick={() => removeAt(i)} aria-label="Remove">×</button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="vrev-add" onClick={add}>+ {addLabel}</button>
    </React.Fragment>
  );
}

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

  /* Inline-edit mutators — write straight back through setAnswer. */
  const setVal = (sectionId, key) => (v) => setAnswer(sectionId, key, v);
  const setListVal = (sectionId, key) => (arr) => setAnswer(sectionId, key, arr);
  const setPair = (sectionId, key, i, sub, v) => {
    const a = list(sectionId, key).slice();
    a[i] = Object.assign({}, a[i] || {}, { [sub]: v });
    setAnswer(sectionId, key, a);
  };
  const addPair = (sectionId, key, blank) => setAnswer(sectionId, key, list(sectionId, key).concat([blank]));
  const rmAt = (sectionId, key, i) => {
    const a = list(sectionId, key).slice();
    a.splice(i, 1);
    setAnswer(sectionId, key, a);
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
            {/* Left 2/3 — Core Values, Core Focus, 10-Year Target, Marketing Strategy stacked */}
            <div className="vrev__col">
              <VtoBlock title="Core Values" count={list("core-values", "items").length}>
                <ul className="vrev__list vrev__list--kv">
                  {list("core-values", "items").map((it, i) => (
                    <li key={i} className="vrev-li">
                      <span className="vrev__list-name">
                        <VtoEditable value={it.value} placeholder="Value" onCommit={(v) => setPair("core-values", "items", i, "value", v)} />
                      </span>
                      <span className="vrev__list-extra">
                        <VtoEditable value={it.descriptor} placeholder="What it looks like in practice" multiline onCommit={(v) => setPair("core-values", "items", i, "descriptor", v)} />
                      </span>
                      <button type="button" className="vrev-rm" onClick={() => rmAt("core-values", "items", i)} aria-label="Remove">×</button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="vrev-add" onClick={() => addPair("core-values", "items", { value: "", descriptor: "" })}>+ Add a Core Value</button>
              </VtoBlock>

              <VtoBlock title="Core Focus™">
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Purpose / Cause / Passion</div>
                  <div className="vrev__kv-val"><VtoEditable value={review["core-focus"].purpose} placeholder="Make life better." onCommit={setVal("core-focus", "purpose")} /></div>
                </div>
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Niche</div>
                  <div className="vrev__kv-val"><VtoEditable value={review["core-focus"].niche} placeholder="Who you serve + what you do" multiline onCommit={setVal("core-focus", "niche")} /></div>
                </div>
              </VtoBlock>

              <VtoBlock title="10-Year Target™">
                <p className="vrev__paragraph"><VtoEditable value={review["ten-year-target"].target} placeholder="A bold, measurable long-term goal." multiline onCommit={setVal("ten-year-target", "target")} /></p>
                <div className="vrev__chip">By <VtoEditable value={review["ten-year-target"].targetYear} placeholder="year" onCommit={setVal("ten-year-target", "targetYear")} /></div>
              </VtoBlock>

              <VtoBlock title="Marketing Strategy">
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Target Market</div>
                  <div className="vrev__kv-val"><VtoEditable value={review["marketing-strategy"].targetMarket} placeholder="Geography + demographics + psychographics" multiline onCommit={setVal("marketing-strategy", "targetMarket")} /></div>
                </div>
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Three Uniques™</div>
                  <div className="vrev__kv-val">
                    <ol className="vrev__inline-list">
                      {list("marketing-strategy", "threeUniques").map((u, i) => (
                        <li key={i} className="vrev-li">
                          <strong><VtoEditable value={u.name} placeholder="Unique" onCommit={(v) => setPair("marketing-strategy", "threeUniques", i, "name", v)} />.</strong>{" "}
                          <VtoEditable value={u.descriptor} placeholder="How you stand apart" onCommit={(v) => setPair("marketing-strategy", "threeUniques", i, "descriptor", v)} />
                          <button type="button" className="vrev-rm" onClick={() => rmAt("marketing-strategy", "threeUniques", i)} aria-label="Remove">×</button>
                        </li>
                      ))}
                    </ol>
                    <button type="button" className="vrev-add" onClick={() => addPair("marketing-strategy", "threeUniques", { name: "", descriptor: "" })}>+ Add a unique</button>
                  </div>
                </div>
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Proven Process</div>
                  <div className="vrev__kv-val">
                    <div className="vrev__pp-name"><strong><VtoEditable value={review["marketing-strategy"].provenProcessName} placeholder="Process name (e.g. The Acme Way)" onCommit={setVal("marketing-strategy", "provenProcessName")} /></strong></div>
                    <VtoSingleList items={list("marketing-strategy", "provenProcessSteps")} onChange={setListVal("marketing-strategy", "provenProcessSteps")} ulClass="vrev__list vrev__list--simple" placeholder="A named step" addLabel="Add a step" />
                  </div>
                </div>
                <div className="vrev__kv">
                  <div className="vrev__kv-label">Guarantee</div>
                  <div className="vrev__kv-val"><VtoEditable value={review["marketing-strategy"].guarantee} placeholder="A bold promise that takes the risk off the buyer" multiline onCommit={setVal("marketing-strategy", "guarantee")} /></div>
                </div>
              </VtoBlock>
            </div>

            {/* Right 1/3 — 3-Year Picture */}
            <div className="vrev__col">
              <VtoBlock title="3-Year Picture™">
                <div className="vrev__metric-stack">
                  <div className="vrev__metric">
                    <span className="vrev__metric-label">Date</span>
                    <span className="vrev__metric-val"><VtoEditable value={review["three-year-picture"].targetDate} placeholder="—" onCommit={setVal("three-year-picture", "targetDate")} /></span>
                  </div>
                  <div className="vrev__metric">
                    <span className="vrev__metric-label">Revenue</span>
                    <span className="vrev__metric-val"><VtoEditable value={review["three-year-picture"].revenue} placeholder="—" onCommit={setVal("three-year-picture", "revenue")} /></span>
                  </div>
                  <div className="vrev__metric">
                    <span className="vrev__metric-label">Profit</span>
                    <span className="vrev__metric-val"><VtoEditable value={review["three-year-picture"].profit} placeholder="—" onCommit={setVal("three-year-picture", "profit")} /></span>
                  </div>
                </div>
                <div className="vrev__sublist">
                  <span className="vrev__sublist-label">Measurables</span>
                  <VtoSingleList items={list("three-year-picture", "measurables")} onChange={setListVal("three-year-picture", "measurables")} ulClass="vrev__list vrev__list--simple" placeholder="A KPI" addLabel="Add a measurable" />
                </div>
                <div className="vrev__sublist">
                  <span className="vrev__sublist-label">What does it look like?</span>
                  <VtoSingleList items={list("three-year-picture", "lookLike")} onChange={setListVal("three-year-picture", "lookLike")} ulClass="vrev__list vrev__list--check" placeholder="A concrete, specific bullet" addLabel="Add a bullet" />
                </div>
              </VtoBlock>
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
            <VtoBlock title="1-Year Plan">
              <div className="vrev__metric-row">
                <div className="vrev__metric">
                  <span className="vrev__metric-label">Date</span>
                  <span className="vrev__metric-val"><VtoEditable value={review["one-year-plan"].targetDate} placeholder="—" onCommit={setVal("one-year-plan", "targetDate")} /></span>
                </div>
                <div className="vrev__metric">
                  <span className="vrev__metric-label">Revenue</span>
                  <span className="vrev__metric-val"><VtoEditable value={review["one-year-plan"].revenue} placeholder="—" onCommit={setVal("one-year-plan", "revenue")} /></span>
                </div>
                <div className="vrev__metric">
                  <span className="vrev__metric-label">Profit</span>
                  <span className="vrev__metric-val"><VtoEditable value={review["one-year-plan"].profit} placeholder="—" onCommit={setVal("one-year-plan", "profit")} /></span>
                </div>
              </div>
              <div className="vrev__sublist">
                <span className="vrev__sublist-label">Measurables</span>
                <VtoSingleList items={list("one-year-plan", "measurables")} onChange={setListVal("one-year-plan", "measurables")} ulClass="vrev__list vrev__list--simple" placeholder="A KPI" addLabel="Add a measurable" />
              </div>
              <div className="vrev__sublist">
                <span className="vrev__sublist-label">Goals for the year</span>
                <VtoSingleList items={list("one-year-plan", "goals")} onChange={setListVal("one-year-plan", "goals")} ulClass="vrev__list vrev__list--num" placeholder="A specific goal" addLabel="Add a goal" />
              </div>
            </VtoBlock>

            <VtoBlock title="90-Day Plan" subtitle="This quarter">
              <div className="vrev__metric-row">
                <div className="vrev__metric">
                  <span className="vrev__metric-label">Date</span>
                  <span className="vrev__metric-val"><VtoEditable value={review["rocks"].targetDate} placeholder="—" onCommit={setVal("rocks", "targetDate")} /></span>
                </div>
                <div className="vrev__metric">
                  <span className="vrev__metric-label">Revenue</span>
                  <span className="vrev__metric-val"><VtoEditable value={review["rocks"].revenue} placeholder="—" onCommit={setVal("rocks", "revenue")} /></span>
                </div>
                <div className="vrev__metric">
                  <span className="vrev__metric-label">Profit</span>
                  <span className="vrev__metric-val"><VtoEditable value={review["rocks"].profit} placeholder="—" onCommit={setVal("rocks", "profit")} /></span>
                </div>
              </div>
              <div className="vrev__sublist">
                <span className="vrev__sublist-label">Measurables</span>
                <VtoSingleList items={list("rocks", "measurables")} onChange={setListVal("rocks", "measurables")} ulClass="vrev__list vrev__list--simple" placeholder="A KPI" addLabel="Add a measurable" />
              </div>
              <div className="vrev__sublist">
                <span className="vrev__sublist-label">
                  Company Rocks{list("rocks", "items").length ? " · " + list("rocks", "items").length : ""}
                </span>
                <ol className="vrev__rocks">
                  {list("rocks", "items").map((r, i) => (
                    <li key={i} className="vrev-li">
                      <span className="vrev__rock-body"><VtoEditable value={r.rock} placeholder="A 90-day priority" multiline onCommit={(v) => setPair("rocks", "items", i, "rock", v)} /></span>
                      <span className="vrev__rock-owner"><VtoEditable value={r.owner} placeholder="Owner" onCommit={(v) => setPair("rocks", "items", i, "owner", v)} /></span>
                      <button type="button" className="vrev-rm" onClick={() => rmAt("rocks", "items", i)} aria-label="Remove">×</button>
                    </li>
                  ))}
                </ol>
                <button type="button" className="vrev-add" onClick={() => addPair("rocks", "items", { rock: "", owner: "" })}>+ Add a Rock</button>
              </div>
            </VtoBlock>

            <VtoBlock title="Issues List" subtitle="Parking lot" count={list("issues-list", "items").length}>
              <VtoSingleList items={list("issues-list", "items")} onChange={setListVal("issues-list", "items")} ulClass="vrev__list vrev__list--check" placeholder="A long-term issue, idea, or obstacle" addLabel="Add an issue" />
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

        /* Inline editing */
        .vrev-edit {
          cursor: text;
          border-radius: 4px;
          padding: 0 3px;
          margin: 0 -3px;
          outline: none;
          transition: background var(--t-fast), box-shadow var(--t-fast);
          white-space: pre-wrap;
        }
        .vrev-edit:hover { background: var(--color-brand-blue-04); box-shadow: inset 0 0 0 1px var(--color-brand-blue-15); }
        .vrev-edit:focus { background: var(--color-brand-blue-08); }
        .vrev-edit.is-empty { color: var(--color-brand-slate); font-style: italic; }
        .vrev-edit__input {
          font: inherit;
          color: var(--fg-1);
          width: 100%;
          min-width: 60px;
          border: 1px solid var(--color-brand-blue);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          background: var(--color-white);
          outline: none;
          box-shadow: 0 0 0 3px var(--color-brand-blue-15);
        }
        textarea.vrev-edit__input { resize: vertical; line-height: 1.55; min-height: 54px; }

        .vrev-li { position: relative; padding-right: 18px; }
        .vrev-rm {
          position: absolute;
          top: 2px;
          right: -6px;
          appearance: none;
          background: var(--color-white);
          border: 1px solid var(--border-subtle);
          color: var(--color-brand-slate);
          width: 18px; height: 18px;
          border-radius: 50%;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          display: grid;
          place-items: center;
          opacity: 0;
          transition: all var(--t-fast);
        }
        .vrev-li:hover .vrev-rm, .vrev-rm:focus { opacity: 1; }
        .vrev-rm:hover { color: var(--color-error); border-color: var(--color-error); }
        .vrev-add {
          appearance: none;
          background: transparent;
          border: 1px dashed var(--color-brand-blue);
          color: var(--color-brand-blue);
          border-radius: var(--radius-sm);
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background var(--t-fast);
        }
        .vrev-add:hover { background: var(--color-brand-blue-08); }
        .vrev__pp-name { margin-bottom: 4px; }

        @media print {
          .vrev-add, .vrev-rm { display: none !important; }
          .vrev-edit { background: none !important; box-shadow: none !important; padding: 0; margin: 0; }
          .vrev-edit.is-empty { visibility: hidden; }
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
          grid-template-columns: 2fr 1fr;
        }
        .vrev__metric-stack {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 2px 0 12px;
          border-bottom: 1px solid var(--color-brand-mist);
          margin-bottom: 8px;
        }
        .vrev__metric-stack .vrev__metric {
          flex-direction: row;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          padding: 4px 0;
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
   A reusable block — title + body (values are edited inline)
   ============================================================ */
function VtoBlock({ title, subtitle, count, children }) {
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

  const ninety = a.rocks || {};
  const rocks = ninety.items || [];
  if (ninety.targetDate || ninety.revenue || ninety.profit || (ninety.measurables && ninety.measurables.length) || rocks.length) {
    lines.push("90-DAY PLAN");
    if (ninety.targetDate) lines.push("  Date:    " + ninety.targetDate);
    if (ninety.revenue) lines.push("  Revenue: " + ninety.revenue);
    if (ninety.profit) lines.push("  Profit:  " + ninety.profit);
    if (ninety.measurables && ninety.measurables.length) {
      lines.push("  Measurables:");
      ninety.measurables.forEach((m) => {
        const v = typeof m === "string" ? m : m && m.name;
        if (v) lines.push("    - " + v);
      });
    }
    if (rocks.length) {
      lines.push("  Company Rocks:");
      rocks.forEach((r, i) => {
        if (r && r.rock) lines.push("    " + (i + 1) + ". " + r.rock + (r.owner ? " — Owner: " + r.owner : ""));
      });
    }
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