/* V/TO Builder — persistent AI Coach panel.
   Always-visible side panel (when aiMode === "coach" or "both") that:
   - Suggests drafts for the current section
   - Critiques the user's answers
   - Carries context from prior sections (the system "learns" as you go)

   Generation runs server-side via POST /api/coach (the API key stays off the client). */

function VtoCoachPanel({ activeSection, answers, sections, onApplyDraft, isOpen, onToggle, externalMsgs, placement }) {
  const [messages, setMessages] = React.useState([]);
  const [thinking, setThinking] = React.useState(false);
  const [inputText, setInputText] = React.useState("");
  const bodyRef = React.useRef(null);
  const externalSeen = React.useRef(0);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, thinking]);

  // Append any external messages (from inline suggest button) we haven't seen yet.
  React.useEffect(() => {
    if (!externalMsgs || externalMsgs.length <= externalSeen.current) return;
    const newOnes = externalMsgs.slice(externalSeen.current);
    externalSeen.current = externalMsgs.length;
    setMessages((m) => m.concat(newOnes));
  }, [externalMsgs && externalMsgs.length]);

  /* Seed an introductory hello once when first opened */
  React.useEffect(() => {
    if (isOpen && messages.length === 0) {
      const a = answers.about || {};
      const company = a.companyName ? "for " + a.companyName : "";
      setMessages([
        {
          role: "coach",
          text: "Hi! I'm your V/TO coach. I'll learn as you go — the more sections you fill in, the sharper my suggestions get. Try one of the prompts below, or ask me anything " + company + "."
        }
      ]);
    }
  }, [isOpen]); // eslint-disable-line

  const buildContext = () => {
    const a = answers.about || {};
    const lines = [];
    if (a.companyName) lines.push("Company: " + a.companyName);
    if (a.about)       lines.push("About: " + a.about);
    if (a.strengths)   lines.push("Strengths: " + a.strengths);
    if (a.workOns)     lines.push("Working on: " + a.workOns);
    const cf = answers["core-focus"] || {};
    if (cf.purpose)    lines.push("Purpose: " + cf.purpose);
    if (cf.niche)      lines.push("Niche: " + cf.niche);
    const tyt = answers["ten-year-target"] || {};
    if (tyt.target)    lines.push("10-Year Target: " + tyt.target);
    return lines.join("\n");
  };

  const ask = async (userText, intent) => {
    if (!userText.trim() && !intent) return;
    const newUserMsg = { role: "user", text: userText || intent.label };
    setMessages((m) => m.concat([newUserMsg]));
    setInputText("");
    setThinking(true);

    const sectionName = activeSection && activeSection.title ? activeSection.title : "the V/TO";
    const sectionDef = activeSection && activeSection.definition ? activeSection.definition : "";
    const context = buildContext();

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText || (intent && intent.label) || "",
          intent: intent ? intent.detail : null,
          section: { title: sectionName, purpose: sectionDef },
          context: context,
        }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || !data.reply) throw new Error("No reply");
      setMessages((m) => m.concat([{ role: "coach", text: data.reply }]));
    } catch (e) {
      setMessages((m) => m.concat([{ role: "coach", text: "Sorry — I couldn't reach my brain just now. Try again in a moment." }]));
    } finally {
      setThinking(false);
    }
  };

  /* Quick prompts adapt to current section */
  const quickPrompts = React.useMemo(() => {
    if (!activeSection) return [];
    const id = activeSection.id;
    if (id === "about") {
      return [
        { label: "What makes a strong 'About'?", detail: "Ask the coach to explain what 'About' should capture and what to avoid." },
        { label: "Help me phrase what we do", detail: "Coach should help phrase a 1–3 sentence description of what we do and who we do it for." }
      ];
    }
    if (id === "core-values") {
      return [
        { label: "How do I find our real Core Values?", detail: "Coach should walk through the 'top performers' exercise to surface Core Values." },
        { label: "Suggest 5 Core Values based on what we've shared", detail: "Coach should propose 5 plausible Core Values based on the user's context." }
      ];
    }
    if (id === "core-focus") {
      return [
        { label: "Draft a Purpose / Cause / Passion", detail: "Coach should propose 2-3 candidate Purpose statements (3-7 words each) based on context." },
        { label: "Sharpen our Niche", detail: "Coach should help phrase a one-sentence Niche statement." }
      ];
    }
    if (id === "ten-year-target") {
      return [
        { label: "Help me size a 10-Year Target", detail: "Coach should help calibrate ambition — challenging but believable — and suggest a measurable shape." }
      ];
    }
    if (id === "marketing-strategy") {
      return [
        { label: "Draft my Three Uniques", detail: "Coach should propose 3 specific uniques given the user's strengths." },
        { label: "Name our Proven Process", detail: "Coach should suggest 3-5 candidate names for the proven process." }
      ];
    }
    if (id === "three-year-picture") {
      return [
        { label: "What should a 3-Year Picture include?", detail: "Coach should explain the structure (financials + measurables + look-like bullets) and offer 5 sample bullets." }
      ];
    }
    if (id === "one-year-plan") {
      return [
        { label: "How many goals should we set?", detail: "Coach should explain why 3-7 with focus beats more, and how to right-size goals." },
        { label: "Suggest 1-Year goals from our 3-Year Picture", detail: "Coach should suggest 3-5 1-Year goals that ladder up from the 3-Year Picture." }
      ];
    }
    if (id === "rocks") {
      return [
        { label: "Turn my 1-Year goals into Rocks", detail: "Coach should propose 3-5 candidate 90-day Rocks from the 1-Year goals." },
        { label: "Why does each Rock need one owner?", detail: "Coach should explain single-owner accountability." }
      ];
    }
    if (id === "issues-list") {
      return [
        { label: "What goes on the Issues List?", detail: "Coach should explain what belongs vs. what doesn't (operational issues stay in weekly L10s)." }
      ];
    }
    return [
      { label: "What should I focus on next?", detail: "Coach should look at progress and suggest the highest-leverage next section to fill out." }
    ];
  }, [activeSection ? activeSection.id : null]);

  const p = placement || "docked";
  const showBackdrop = p === "drawer" || p === "modal" || p === "sheet";

  return (
    <React.Fragment>
      {showBackdrop ? <div className="vcoach-backdrop" onClick={onToggle} /> : null}
      <aside className={"vcoach vcoach--" + p + " " + (isOpen ? "is-open " : "is-collapsed ")}>
      <header className="vcoach__head">
        <span className="vcoach__head-left">
          <span className="vcoach__avatar" aria-hidden="true">✦</span>
          <span>
            <span className="vcoach__title">V/TO Coach</span>
            <span className="vcoach__sub">Trained on the EOS V/TO method</span>
          </span>
        </span>
        <button className="vcoach__toggle" onClick={onToggle} aria-label="Close coach">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      <div className="vcoach__body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div key={i} className={"vcoach__msg vcoach__msg--" + m.role}>
            {m.role === "coach" ? <span className="vcoach__msg-avatar" aria-hidden="true">✦</span> : null}
            <div className="vcoach__msg-body">{m.text}</div>
          </div>
        ))}
        {thinking ? (
          <div className="vcoach__msg vcoach__msg--coach">
            <span className="vcoach__msg-avatar" aria-hidden="true">✦</span>
            <div className="vcoach__msg-body vcoach__msg-body--thinking">
              <span className="vcoach__dot" /><span className="vcoach__dot" /><span className="vcoach__dot" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="vcoach__quick">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            type="button"
            className="vcoach__quick-btn"
            onClick={() => ask("", p)}
            disabled={thinking}
          >
            {p.label}
          </button>
        ))}
      </div>

      <form
        className="vcoach__input"
        onSubmit={(e) => { e.preventDefault(); ask(inputText, null); }}
      >
        <input
          type="text"
          placeholder="Ask the coach…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={thinking}
        />
        <button type="submit" disabled={thinking || !inputText.trim()} aria-label="Send">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path d="M3 8 L13 8 M8 3 L13 8 L8 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>

      <style>{`
        /* Shared coach panel chrome */
        .vcoach {
          display: flex;
          flex-direction: column;
          background: var(--color-white);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }

        /* Backdrop for overlay modes */
        .vcoach-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(38, 38, 38, 0.32);
          z-index: 90;
          animation: vcoach-fade-in 220ms var(--ease-out);
        }
        @keyframes vcoach-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* ─── Docked (in grid column, sticky) ─── */
        .vcoach--docked {
          position: sticky;
          top: calc(var(--header-h) + 24px);
          max-height: calc(100vh - var(--header-h) - 48px);
          box-shadow: var(--shadow-sm);
          align-self: start;
        }
        @media (max-width: 1080px) {
          .vcoach--docked { position: static; max-height: none; }
        }

        /* ─── Drawer (slides over from right, full height) ─── */
        .vcoach--drawer {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 420px;
          max-width: 92vw;
          z-index: 95;
          border-radius: 0;
          border-top: 0;
          border-bottom: 0;
          border-right: 0;
          box-shadow: -20px 0 50px rgba(0, 0, 0, 0.18);
          animation: vcoach-slide-right 280ms var(--ease-out);
        }
        @keyframes vcoach-slide-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }

        /* ─── Modal (centered floating dialog) ─── */
        .vcoach--modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 540px;
          max-width: 92vw;
          max-height: 80vh;
          z-index: 95;
          animation: vcoach-pop-in 280ms var(--ease-out);
        }
        @keyframes vcoach-pop-in {
          from { transform: translate(-50%, -50%) scale(0.96); opacity: 0; }
          to   { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
        }

        /* ─── Bottom sheet (slides up from bottom) ─── */
        .vcoach--sheet {
          position: fixed;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          width: 720px;
          max-width: 100vw;
          max-height: 75vh;
          z-index: 95;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          border-bottom: 0;
          box-shadow: 0 -20px 50px rgba(0, 0, 0, 0.18);
          animation: vcoach-slide-up 280ms var(--ease-out);
        }
        @keyframes vcoach-slide-up {
          from { transform: translateX(-50%) translateY(100%); }
          to   { transform: translateX(-50%) translateY(0); }
        }
        .vcoach--sheet::before {
          /* drag handle indicator */
          content: "";
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 4px;
          border-radius: 2px;
          background: var(--color-brand-stone);
          z-index: 1;
        }
        .vcoach--sheet .vcoach__head {
          padding-top: 22px;
        }

        /* In drawer/modal/sheet modes, allow more body height */
        .vcoach--drawer .vcoach__body,
        .vcoach--modal .vcoach__body,
        .vcoach--sheet .vcoach__body {
          max-height: none;
          flex: 1;
        }

        .vcoach__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .vcoach__head-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .vcoach__avatar {
          width: 32px; height: 32px;
          background: var(--color-brand-blue);
          color: var(--color-white);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 15px;
          font-weight: 700;
        }
        .vcoach__title {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--fg-1);
          letter-spacing: -0.005em;
        }
        .vcoach__sub {
          display: block;
          font-size: 11.5px;
          color: var(--fg-2);
        }
        .vcoach__toggle {
          appearance: none;
          background: transparent;
          border: 1px solid transparent;
          color: var(--fg-2);
          width: 26px; height: 26px;
          border-radius: 6px;
          cursor: pointer;
          display: grid;
          place-items: center;
        }
        .vcoach__toggle:hover {
          background: var(--color-brand-mist);
          color: var(--fg-1);
        }

        .vcoach__body {
          flex: 1;
          overflow-y: auto;
          padding: 14px 14px 6px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 200px;
          max-height: 420px;
        }
        @media (max-width: 1080px) {
          .vcoach__body { max-height: 320px; }
        }

        .vcoach__msg {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          max-width: 95%;
        }
        .vcoach__msg--user {
          align-self: flex-end;
        }
        .vcoach__msg-avatar {
          width: 22px; height: 22px;
          background: var(--color-brand-blue-08);
          color: var(--color-brand-blue);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .vcoach__msg-body {
          background: var(--color-brand-ice);
          padding: 9px 12px;
          border-radius: var(--radius-md);
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--fg-1);
          white-space: pre-wrap;
        }
        .vcoach__msg--user .vcoach__msg-body {
          background: var(--color-brand-blue);
          color: var(--color-white);
          font-weight: 500;
        }
        .vcoach__msg-body--thinking {
          display: inline-flex;
          gap: 4px;
          padding: 13px 14px;
        }
        .vcoach__dot {
          width: 6px; height: 6px;
          background: var(--color-brand-slate);
          border-radius: 50%;
          animation: vcoach-bounce 1.2s ease-in-out infinite;
        }
        .vcoach__dot:nth-child(2) { animation-delay: 0.15s; }
        .vcoach__dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes vcoach-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-3px); opacity: 1; }
        }

        .vcoach__quick {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px 14px 6px;
          border-top: 1px solid var(--color-brand-mist);
        }
        .vcoach__quick-btn {
          appearance: none;
          background: var(--color-white);
          border: 1px solid var(--border-subtle);
          color: var(--fg-1);
          padding: 6px 10px;
          border-radius: var(--radius-pill);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--t-fast);
        }
        .vcoach__quick-btn:hover {
          border-color: var(--color-brand-blue);
          color: var(--color-brand-blue);
          background: var(--color-brand-blue-04);
        }
        .vcoach__quick-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .vcoach__input {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px 12px;
          border-top: 1px solid var(--border-subtle);
        }
        .vcoach__input input {
          flex: 1;
          padding: 9px 12px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--fg-1);
          background: var(--color-brand-ice);
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          outline: none;
          transition: all var(--t-fast);
        }
        .vcoach__input input:focus {
          background: var(--color-white);
          border-color: var(--color-brand-blue);
          box-shadow: 0 0 0 3px var(--color-brand-blue-15);
        }
        .vcoach__input button {
          appearance: none;
          background: var(--color-brand-blue);
          color: var(--color-white);
          border: 0;
          width: 34px; height: 34px;
          border-radius: 50%;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: all var(--t-fast);
        }
        .vcoach__input button:hover { background: var(--color-brand-blue-heavy); }
        .vcoach__input button:disabled {
          background: var(--color-brand-slate);
          cursor: not-allowed;
        }
      `}</style>
    </aside>
    </React.Fragment>
  );
}

/* ============================================================
   Coach button — variants render in different positions.
   ============================================================ */
function VtoCoachFab({ onOpen, variant }) {
  const v = variant || "bottom-right";
  // Force a re-render after mount so portal targets exist in DOM.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  // Portal-rendered variants: header (into #brandstrip-actions), rail (into #vrail-coach-slot)
  if (v === "header") {
    if (!mounted) return null;
    const target = document.getElementById("brandstrip-actions");
    if (!target) return null;
    return ReactDOM.createPortal(
      <button className="vcoach-pill vcoach-pill--header" onClick={onOpen} aria-label="Open coach">
        <span className="vcoach-pill__icon" aria-hidden="true">✦</span>
        <span>Ask the coach</span>
        <style>{`
          .vcoach-pill--header {
            appearance: none;
            background: var(--color-brand-blue-08);
            color: var(--color-brand-blue-heavy);
            border: 1px solid var(--color-brand-blue);
            padding: 7px 14px 7px 10px;
            border-radius: var(--radius-pill);
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 13.5px;
            cursor: pointer;
            transition: all var(--t-fast);
          }
          .vcoach-pill--header:hover {
            background: var(--color-brand-blue);
            color: var(--color-white);
          }
          .vcoach-pill__icon {
            width: 20px; height: 20px;
            background: var(--color-brand-blue);
            color: var(--color-white);
            border-radius: 50%;
            display: grid;
            place-items: center;
            font-size: 11px;
            font-weight: 700;
          }
          .vcoach-pill--header:hover .vcoach-pill__icon {
            background: var(--color-white);
            color: var(--color-brand-blue);
          }
        `}</style>
      </button>,
      target
    );
  }

  if (v === "rail") {
    if (!mounted) return null;
    const target = document.getElementById("vrail-coach-slot");
    if (!target) {
      // Fall back to fixed bottom-right when there's no rail to portal into.
      return <VtoCoachFab onOpen={onOpen} variant="bottom-right" />;
    }
    return ReactDOM.createPortal(
      <button className="vcoach-rail-card" onClick={onOpen} aria-label="Open coach">
        <span className="vcoach-rail-card__icon" aria-hidden="true">✦</span>
        <span className="vcoach-rail-card__body">
          <span className="vcoach-rail-card__title">Ask the coach</span>
          <span className="vcoach-rail-card__sub">Stuck? I'll help draft.</span>
        </span>
        <style>{`
          .vcoach-rail-card {
            appearance: none;
            width: 100%;
            background: var(--color-brand-blue-08);
            border: 1px solid var(--color-brand-blue);
            border-radius: var(--radius-lg);
            padding: 14px 16px;
            display: grid;
            grid-template-columns: 32px 1fr;
            gap: 12px;
            align-items: center;
            cursor: pointer;
            text-align: left;
            transition: all var(--t-fast);
          }
          .vcoach-rail-card:hover {
            background: var(--color-brand-blue);
            border-color: var(--color-brand-blue);
          }
          .vcoach-rail-card:hover .vcoach-rail-card__title,
          .vcoach-rail-card:hover .vcoach-rail-card__sub { color: var(--color-white); }
          .vcoach-rail-card:hover .vcoach-rail-card__icon {
            background: var(--color-white);
            color: var(--color-brand-blue);
          }
          .vcoach-rail-card__icon {
            width: 32px;
            height: 32px;
            background: var(--color-brand-blue);
            color: var(--color-white);
            border-radius: 50%;
            display: grid;
            place-items: center;
            font-size: 14px;
            font-weight: 700;
          }
          .vcoach-rail-card__body {
            display: flex;
            flex-direction: column;
            gap: 1px;
            min-width: 0;
          }
          .vcoach-rail-card__title {
            font-weight: 600;
            font-size: 14px;
            color: var(--color-brand-blue-heavy);
            letter-spacing: -0.005em;
          }
          .vcoach-rail-card__sub {
            font-size: 12px;
            color: var(--fg-2);
          }
        `}</style>
      </button>,
      target
    );
  }

  // Fixed-position variants: bottom-right, bottom-center
  const posClass =
    v === "bottom-center" ? "vcoach-fab--bc" :
    v === "bottom-left"   ? "vcoach-fab--bl" :
    "vcoach-fab--br";

  return (
    <button className={"vcoach-fab " + posClass} onClick={onOpen} aria-label="Open coach">
      <span className="vcoach-fab__icon" aria-hidden="true">✦</span>
      <span className="vcoach-fab__label">Ask the coach</span>

      <style>{`
        .vcoach-fab {
          appearance: none;
          background: var(--color-brand-blue);
          color: var(--color-white);
          border: 0;
          position: fixed;
          padding: 12px 18px 12px 14px;
          border-radius: var(--radius-pill);
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(47, 139, 170, 0.4);
          z-index: 80;
          transition: all var(--t-fast);
        }
        .vcoach-fab--br { bottom: 24px; right: 24px; }
        .vcoach-fab--bl { bottom: 24px; left: 24px; }
        .vcoach-fab--bc {
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
        }
        .vcoach-fab:hover {
          background: var(--color-brand-blue-heavy);
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(47, 139, 170, 0.45);
        }
        .vcoach-fab--bc:hover {
          transform: translateX(-50%) translateY(-2px);
        }
        .vcoach-fab__icon {
          width: 26px;
          height: 26px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 14px;
        }
      `}</style>
    </button>
  );
}

Object.assign(window, { VtoCoachPanel, VtoCoachFab });
