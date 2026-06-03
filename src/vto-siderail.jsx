/* V/TO Builder — side rail navigation.
   Grouped by Setup / Vision / Traction, with collapsible groups (Tweak: groupedRail).
   Tracks per-section progress with a journey-line on the left. */

function VtoSideRail({ sections, groups, activeId, setActiveId, answers, grouped }) {
  const [openGroups, setOpenGroups] = React.useState(() => {
    const init = {};
    groups.forEach((g) => { init[g.id] = true; });
    return init;
  });

  // Always ensure active group is open.
  React.useEffect(() => {
    const active = sections.find((s) => s.id === activeId);
    if (active && !openGroups[active.group]) {
      setOpenGroups((o) => Object.assign({}, o, { [active.group]: true }));
    }
  }, [activeId]); // eslint-disable-line

  const toggleGroup = (gid) => setOpenGroups((o) => Object.assign({}, o, { [gid]: !o[gid] }));

  // Setup ("About your company") is reached via a link in the progress card,
  // not the section list — so progress tracks the build sections only.
  const setupSection = sections.find((s) => s.group === "setup");
  const navSections = sections.filter((s) => s.group !== "setup");

  // Overall progress — uses proportional progress per section so the bar reflects partial work.
  const totalSections = navSections.length;
  const totalFields = navSections.reduce((s, sec) => s + (sec.fields ? sec.fields.length : 0), 0);
  const doneFields = navSections.reduce((s, sec) => {
    if (!sec.fields) return s;
    const a = answers[sec.id] || {};
    return s + sec.fields.filter((f) => vtoFieldFilled(f, a[f.key])).length;
  }, 0);
  const overallProgressSum = navSections.reduce((s, sec) => s + vtoSectionProgress(sec, answers[sec.id] || {}), 0);
  const overallPct = Math.round((overallProgressSum / Math.max(totalSections, 1)) * 100);

  function renderSection(sec, idx, group) {
    const a = answers[sec.id] || {};
    const totalF = sec.fields ? sec.fields.length : 0;
    const doneF = sec.fields ? sec.fields.filter((f) => vtoFieldFilled(f, a[f.key])).length : 0;
    const active = sec.id === activeId;
    const complete = totalF > 0 && doneF === totalF;
    const inProgress = doneF > 0 && !complete;
    return (
      <button
        key={sec.id}
        type="button"
        className={
          "vrail__item " +
          (active ? "is-active " : "") +
          (complete ? "is-done " : "") +
          (inProgress ? "is-progress " : "")
        }
        onClick={() => setActiveId(sec.id)}
        aria-current={active ? "page" : undefined}
      >
        <span className="vrail__node" aria-hidden="true">
          {complete ? (
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
              <path d="M3 8.5 L7 12 L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <span className="vrail__node-num">{idx + 1}</span>
          )}
        </span>
        <span className="vrail__body">
          <span className="vrail__name">{sec.title}</span>
          <span className="vrail__meta">
            {totalF > 0 ? <span>{doneF}/{totalF} done</span> : <span>—</span>}
          </span>
        </span>
      </button>
    );
  }

  // Number the build sections 1..8 (Setup is excluded from the list).
  const orderIndex = {};
  navSections.forEach((s, i) => { orderIndex[s.id] = i; });

  return (
    <aside className="vrail">
      {/* Overall progress card */}
      <div className="vrail__progress">
        <div className="vrail__progress-row">
          <span className="eyebrow eyebrow--muted">Your V/TO</span>
          <span className="vrail__pct">{overallPct}%</span>
        </div>
        <div className="vrail__bar"><span style={{ width: overallPct + "%" }} /></div>
        <div className="vrail__progress-meta">
          {doneFields} of {totalFields} fields filled
        </div>
        {setupSection ? (
          <button
            type="button"
            className={"vrail__setup-link " + (activeId === setupSection.id ? "is-active " : "")}
            onClick={() => setActiveId(setupSection.id)}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
              <path d="M2 12 L2 14 L4 14 L13 5 L11 3 L2 12 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <span>{setupSection.title}</span>
          </button>
        ) : null}
      </div>

      {/* Grouped or flat nav */}
      {grouped ? (
        <nav className="vrail__nav vrail__nav--grouped">
          {groups.filter((g) => g.id !== "setup").map((g) => {
            const groupSections = sections.filter((s) => s.group === g.id);
            const groupTotal = groupSections.reduce((acc, s) => acc + (s.fields ? s.fields.length : 0), 0);
            const groupDone = groupSections.reduce((acc, s) => {
              const a = answers[s.id] || {};
              return acc + (s.fields ? s.fields.filter((f) => vtoFieldFilled(f, a[f.key])).length : 0);
            }, 0);
            const groupPct = groupTotal ? Math.round((groupDone / groupTotal) * 100) : 0;
            const isOpen = !!openGroups[g.id];
            return (
              <div key={g.id} className={"vrail__group " + (isOpen ? "is-open " : "")}>
                <button
                  type="button"
                  className="vrail__group-head"
                  onClick={() => toggleGroup(g.id)}
                  aria-expanded={isOpen}
                >
                  <span className="vrail__group-chev" aria-hidden="true">
                    <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                      <path d="M3 5 L6 8 L9 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="vrail__group-label">{g.label}</span>
                  <span className="vrail__group-meta">{groupDone}/{groupTotal}</span>
                </button>
                {isOpen ? (
                  <div className="vrail__group-body">
                    {groupSections.map((sec) => renderSection(sec, orderIndex[sec.id], g))}
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* Review pseudo-item — always visible after the groups */}
          <button
            type="button"
            className={"vrail__review " + (activeId === "review" ? "is-active " : "") + (overallPct === 100 ? "is-ready " : "")}
            onClick={() => setActiveId("review")}
          >
            <span className="vrail__review-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 6 H11 M5 8.5 H11 M5 11 H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="vrail__review-body">
              <span className="vrail__review-title">Your V/TO</span>
              <span className="vrail__review-meta">Review · export</span>
            </span>
          </button>
        </nav>
      ) : (
        <nav className="vrail__nav vrail__nav--flat">
          {navSections.map((sec, i) => renderSection(sec, i))}
          <button
            type="button"
            className={"vrail__review " + (activeId === "review" ? "is-active " : "")}
            onClick={() => setActiveId("review")}
          >
            <span className="vrail__review-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 6 H11 M5 8.5 H11 M5 11 H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="vrail__review-body">
              <span className="vrail__review-title">Your V/TO</span>
              <span className="vrail__review-meta">Review · export</span>
            </span>
          </button>
        </nav>
      )}

      {/* Slot for coach button when variant="rail" — see vto-coach.jsx */}
      <div id="vrail-coach-slot" className="vrail__coach-slot" />

      <style>{`
        .vrail {
          position: sticky;
          top: calc(var(--header-h) + 24px);
          display: flex;
          flex-direction: column;
          gap: 18px;
          align-self: start;
        }
        @media (max-width: 1080px) {
          .vrail { position: static; }
        }

        /* progress card */
        .vrail__progress {
          background: var(--color-white);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 16px 18px 14px;
          box-shadow: var(--shadow-xs);
        }
        .vrail__progress-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .vrail__pct {
          font-size: 24px;
          font-weight: 700;
          color: var(--color-brand-blue);
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .vrail__bar {
          height: 6px;
          background: var(--color-brand-mist);
          border-radius: 99px;
          overflow: hidden;
        }
        .vrail__bar > span {
          display: block;
          height: 100%;
          background: var(--color-brand-blue);
          border-radius: 99px;
          transition: width 320ms var(--ease-out);
        }
        .vrail__progress-meta {
          margin-top: 8px;
          font-size: 12.5px;
          color: var(--fg-2);
        }
        .vrail__setup-link {
          appearance: none;
          margin-top: 12px;
          padding-top: 12px;
          border: 0;
          border-top: 1px solid var(--color-brand-mist);
          background: transparent;
          width: 100%;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--fg-2);
          text-align: left;
          transition: color var(--t-fast);
        }
        .vrail__setup-link:hover { color: var(--color-brand-blue); }
        .vrail__setup-link.is-active { color: var(--color-brand-blue-heavy); }
        .vrail__setup-link svg { flex-shrink: 0; color: var(--color-brand-blue); }

        /* nav (flat or grouped) */
        .vrail__nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* groups */
        .vrail__group {
          background: var(--color-white);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-xs);
        }
        .vrail__group + .vrail__group {
          margin-top: 10px;
        }
        .vrail__group-head {
          appearance: none;
          background: transparent;
          border: 0;
          width: 100%;
          padding: 12px 16px;
          display: grid;
          grid-template-columns: 16px 1fr auto;
          gap: 10px;
          align-items: center;
          text-align: left;
          cursor: pointer;
          color: var(--fg-1);
        }
        .vrail__group-head:hover { background: var(--color-brand-mist); }
        .vrail__group-chev {
          color: var(--fg-2);
          display: inline-flex;
          transform: rotate(-90deg);
          transition: transform var(--t-base) var(--ease-out);
        }
        .vrail__group.is-open .vrail__group-chev { transform: rotate(0); }
        .vrail__group-label {
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: var(--tracking-eyebrow);
          text-transform: uppercase;
          color: var(--fg-2);
        }
        .vrail__group-meta {
          font-size: 12px;
          color: var(--fg-3);
          font-variant-numeric: tabular-nums;
          font-weight: 600;
        }
        .vrail__group-body {
          padding: 4px 10px 10px;
          position: relative;
        }
        .vrail__group-body::before {
          content: "";
          position: absolute;
          left: 22px; top: 6px; bottom: 12px;
          width: 0;
          border-left: 1.5px solid var(--border-subtle);
        }

        /* items */
        .vrail__item {
          appearance: none;
          background: transparent;
          border: 0;
          padding: 9px 10px 9px 8px;
          display: grid;
          grid-template-columns: 26px 1fr;
          gap: 12px;
          align-items: start;
          text-align: left;
          cursor: pointer;
          width: 100%;
          border-radius: 8px;
          color: var(--fg-1);
          transition: background var(--t-fast);
          position: relative;
        }
        .vrail__nav--flat .vrail__item {
          padding-left: 14px;
        }
        .vrail__item:hover { background: var(--color-brand-blue-04); }
        .vrail__item.is-active { background: var(--color-brand-blue-08); }
        .vrail__item.is-active::after {
          content: "";
          position: absolute;
          right: 6px; top: 12px; bottom: 12px;
          width: 3px;
          background: var(--color-brand-blue);
          border-radius: 3px;
        }

        .vrail__node {
          position: relative;
          z-index: 1;
          width: 24px; height: 24px;
          border-radius: 50%;
          background: var(--color-white);
          border: 1.5px solid var(--border-strong);
          color: var(--fg-2);
          display: grid; place-items: center;
          font-weight: 700;
          font-size: 11px;
          margin-top: 1px;
          transition: all var(--t-base);
        }
        .vrail__node-num {
          font-size: 11.5px;
          font-weight: 700;
          line-height: 1;
        }
        .vrail__item.is-active .vrail__node {
          background: var(--color-brand-blue);
          border-color: var(--color-brand-blue);
          color: var(--color-white);
        }
        .vrail__item.is-progress:not(.is-active) .vrail__node {
          border-color: var(--color-brand-blue);
          color: var(--color-brand-blue);
        }
        .vrail__item.is-done .vrail__node {
          background: var(--color-brand-blue);
          border-color: var(--color-brand-blue);
          color: var(--color-white);
        }

        .vrail__body {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 1px;
          min-width: 0;
        }
        .vrail__name {
          font-weight: 600;
          font-size: 14px;
          color: var(--fg-1);
          letter-spacing: -0.005em;
          line-height: 1.3;
        }
        .vrail__item.is-active .vrail__name { color: var(--color-brand-blue-heavy); }
        .vrail__meta {
          font-size: 12px;
          color: var(--fg-2);
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .vrail__dot { color: var(--color-brand-slate); }
        .vrail__time { color: var(--fg-3); }

        /* review pseudo-item */
        .vrail__review {
          appearance: none;
          margin-top: 12px;
          background: var(--color-white);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 12px;
          align-items: center;
          text-align: left;
          cursor: pointer;
          width: 100%;
          color: var(--fg-1);
          box-shadow: var(--shadow-xs);
          transition: all var(--t-fast);
        }
        .vrail__review:hover {
          border-color: var(--color-brand-blue);
          color: var(--color-brand-blue);
        }
        .vrail__review.is-active {
          border-color: var(--color-brand-blue);
          background: var(--color-brand-blue-08);
          color: var(--color-brand-blue-heavy);
        }
        .vrail__review.is-ready {
          border-color: var(--color-brand-blue);
        }
        .vrail__review-icon {
          width: 28px; height: 28px;
          background: var(--color-brand-blue-08);
          color: var(--color-brand-blue);
          border-radius: 50%;
          display: grid; place-items: center;
        }
        .vrail__review-title {
          display: block;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: -0.005em;
        }
        .vrail__review-meta {
          display: block;
          font-size: 12px;
          color: var(--fg-2);
          margin-top: 1px;
        }
      `}</style>
    </aside>
  );
}

/* ============================================================
   Top stepper — alternative nav for narrow viewports or as a tweak
   ============================================================ */
function VtoTopStepper({ sections, groups, activeId, setActiveId, answers, grouped }) {
  const total = sections.length + 1; // +1 for review

  return (
    <nav className="vstep" aria-label="V/TO sections">
      <div className="vstep__scroll">
        {sections.map((sec, i) => {
          const a = answers[sec.id] || {};
          const doneF = sec.fields ? sec.fields.filter((f) => vtoFieldFilled(f, a[f.key])).length : 0;
          const totalF = sec.fields ? sec.fields.length : 0;
          const active = sec.id === activeId;
          const complete = totalF > 0 && doneF === totalF;
          const groupColor = sec.group === "vision" ? "vision" : sec.group === "traction" ? "traction" : "setup";
          return (
            <button
              key={sec.id}
              type="button"
              className={"vstep__item vstep__item--" + groupColor + " " + (active ? "is-active " : "") + (complete ? "is-done " : "")}
              onClick={() => setActiveId(sec.id)}
            >
              <span className="vstep__num">
                {complete ? (
                  <svg viewBox="0 0 16 16" width="11" height="11" fill="none">
                    <path d="M3 8.5 L7 12 L13 4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (i + 1)}
              </span>
              <span className="vstep__label">{sec.title}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={"vstep__item vstep__item--review " + (activeId === "review" ? "is-active " : "")}
          onClick={() => setActiveId("review")}
        >
          <span className="vstep__num">✓</span>
          <span className="vstep__label">Your V/TO</span>
        </button>
      </div>

      <style>{`
        .vstep {
          background: var(--color-white);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 10px 12px;
          margin-bottom: 24px;
          box-shadow: var(--shadow-xs);
        }
        .vstep__scroll {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          padding: 2px;
          scrollbar-width: thin;
        }
        .vstep__item {
          appearance: none;
          background: transparent;
          border: 1px solid transparent;
          padding: 6px 12px 6px 8px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          border-radius: var(--radius-pill);
          color: var(--fg-2);
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          flex: 0 0 auto;
          transition: all var(--t-fast);
        }
        .vstep__item:hover { background: var(--color-brand-mist); color: var(--fg-1); }
        .vstep__item.is-active {
          background: var(--color-brand-blue);
          color: var(--color-white);
          border-color: var(--color-brand-blue);
        }
        .vstep__item.is-done {
          color: var(--color-brand-blue);
        }
        .vstep__item.is-done.is-active { color: var(--color-white); }
        .vstep__num {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: var(--color-brand-mist);
          color: var(--fg-2);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11.5px;
          font-weight: 700;
          flex: 0 0 auto;
        }
        .vstep__item.is-active .vstep__num {
          background: rgba(255,255,255,0.25);
          color: var(--color-white);
        }
        .vstep__item.is-done .vstep__num {
          background: var(--color-brand-blue);
          color: var(--color-white);
        }
        .vstep__item.is-done.is-active .vstep__num {
          background: rgba(255,255,255,0.25);
          color: var(--color-white);
        }
        .vstep__label { line-height: 1; }
      `}</style>
    </nav>
  );
}

Object.assign(window, { VtoSideRail, VtoTopStepper });
