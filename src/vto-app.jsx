/* V/TO Builder — root app.
   Manages state, navigation, autosave. */

const VTO_STATE_KEY = "vto-builder-v2";

/* Locked layout configuration (the design's Tweaks panel is not shipped in production).
   Side rail grouped by Vision/Traction · split teaching+inputs · progressive reveal ·
   inline drafting + conversational coach · coach as a slide-in drawer behind a floating button. */
const VTO_CONFIG = {
  navStyle: "siderail",
  contentTreatment: "split",
  aiMode: "both",
  flow: "progressive",
  groupedRail: true,
  coachPlacement: "drawer",
  coachButton: "bottom-right"
};

function vtoDefaultState() {
  return {
    currentId: "welcome",       // welcome | <section.id> | review
    answers: {},
    aiDrafted: {},              // { [sectionId]: { [fieldKey]: true } }
    visited: {},                // { [sectionId]: true } — used to apply smart defaults once
    startedAt: null
  };
}

function vtoLoadState() {
  try {
    const raw = localStorage.getItem(VTO_STATE_KEY);
    if (!raw) return vtoDefaultState();
    return Object.assign(vtoDefaultState(), JSON.parse(raw));
  } catch (e) {
    return vtoDefaultState();
  }
}

function vtoSaveState(state) {
  try { localStorage.setItem(VTO_STATE_KEY, JSON.stringify(state)); } catch (e) {}
}

function VtoApp() {
  const t = VTO_CONFIG;
  const [state, setState] = React.useState(vtoLoadState);
  const [coachOpen, setCoachOpen] = React.useState(false);

  /* Sync the locked layout config to body for CSS attribute selectors */
  React.useEffect(() => {
    const b = document.body;
    b.setAttribute("data-nav-style", t.navStyle);
    b.setAttribute("data-content-treatment", t.contentTreatment);
    b.setAttribute("data-ai-mode", t.aiMode);
    b.setAttribute("data-flow", t.flow);
    b.setAttribute("data-coach-placement", t.coachPlacement || "drawer");
  }, []); // eslint-disable-line

  /* Sync screen state */
  React.useEffect(() => {
    document.body.setAttribute(
      "data-state",
      state.currentId === "welcome" ? "welcome" :
      state.currentId === "review" ? "review" : "section"
    );
  }, [state.currentId]);

  /* The coach starts closed — the floating button invites the user to open it,
     rather than the drawer sliding over the page on every load. */
  React.useEffect(() => {
    document.body.setAttribute("data-coach-open", coachOpen ? "true" : "false");
  }, [coachOpen]);

  /* Save on state change */
  React.useEffect(() => { vtoSaveState(state); }, [state]);

  /* Derived */
  const sections = window.VTO_SECTIONS;
  const groups = window.VTO_GROUPS;

  const currentSection = sections.find((s) => s.id === state.currentId);
  const isWelcome = state.currentId === "welcome";
  const isReview = state.currentId === "review";

  /* Navigation */
  const setActiveId = (id) => {
    setState((s) => Object.assign({}, s, { currentId: id }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const nextSection = () => {
    if (isWelcome) return setActiveId(sections[0].id);
    if (isReview) return; // nothing to do
    const i = sections.findIndex((s) => s.id === state.currentId);
    if (i < 0) return;
    if (i === sections.length - 1) return setActiveId("review");
    setActiveId(sections[i + 1].id);
  };
  const prevSection = () => {
    if (isReview) return setActiveId(sections[sections.length - 1].id);
    const i = sections.findIndex((s) => s.id === state.currentId);
    if (i <= 0) return setActiveId("welcome");
    setActiveId(sections[i - 1].id);
  };
  const hasPrev = !isWelcome;
  const hasNext = state.currentId !== "review";

  /* Set an answer */
  const setAnswer = (sectionId, key, value) => {
    setState((s) => {
      const next = Object.assign({}, s.answers);
      const sec = Object.assign({}, next[sectionId] || {});
      sec[key] = value;
      next[sectionId] = sec;
      // Clear the AI-drafted flag for this field — user has taken ownership.
      const aiDrafted = Object.assign({}, s.aiDrafted || {});
      if (aiDrafted[sectionId] && aiDrafted[sectionId][key]) {
        const secFlags = Object.assign({}, aiDrafted[sectionId]);
        delete secFlags[key];
        aiDrafted[sectionId] = secFlags;
      }
      return Object.assign({}, s, {
        answers: next,
        aiDrafted: aiDrafted,
        startedAt: s.startedAt || new Date().toISOString()
      });
    });
  };

  /* Apply smart defaults when first visiting a section */
  React.useEffect(() => {
    if (!currentSection || state.visited[currentSection.id]) return;
    const defaults = window.vtoSmartDefaults(currentSection, state.answers);
    const existing = state.answers[currentSection.id] || {};
    const additions = {};
    Object.keys(defaults).forEach((k) => {
      if (!existing[k]) additions[k] = defaults[k];
    });
    setState((s) => {
      const next = Object.assign({}, s.answers);
      next[currentSection.id] = Object.assign({}, next[currentSection.id] || {}, additions);
      const visited = Object.assign({}, s.visited, { [currentSection.id]: true });
      // Mark smart defaults as ai-drafted so user can see they're suggested.
      const aiDrafted = Object.assign({}, s.aiDrafted || {});
      const secFlags = Object.assign({}, aiDrafted[currentSection.id] || {});
      Object.keys(additions).forEach((k) => { secFlags[k] = true; });
      aiDrafted[currentSection.id] = secFlags;
      return Object.assign({}, s, { answers: next, visited: visited, aiDrafted: aiDrafted });
    });
  }, [currentSection ? currentSection.id : null]); // eslint-disable-line

  /* Draft entire section via AI */
  const [drafting, setDrafting] = React.useState({}); // { sectionId: true } while in flight
  const draftSection = async (section) => {
    if (!section) return;
    setDrafting((d) => Object.assign({}, d, { [section.id]: true }));
    try {
      const draft = await window.vtoDraftSection(section, state.answers);
      setState((s) => {
        const next = Object.assign({}, s.answers);
        const merged = window.vtoApplyDraft(section, draft, next[section.id] || {});
        next[section.id] = merged;
        const aiDrafted = Object.assign({}, s.aiDrafted || {});
        const secFlags = Object.assign({}, aiDrafted[section.id] || {});
        Object.keys(draft || {}).forEach((k) => { secFlags[k] = true; });
        aiDrafted[section.id] = secFlags;
        return Object.assign({}, s, { answers: next, aiDrafted: aiDrafted });
      });
    } finally {
      setDrafting((d) => {
        const next = Object.assign({}, d);
        delete next[section.id];
        return next;
      });
    }
  };

  /* Redraft a single field via AI */
  const draftField = async (section, fieldKey) => {
    if (!section) return;
    const field = section.fields.find((f) => f.key === fieldKey);
    if (!field) return;
    setDrafting((d) => Object.assign({}, d, { [section.id + ":" + fieldKey]: true }));
    try {
      const draft = await window.vtoDraftSection(section, state.answers);
      const merged = window.vtoApplyDraft(section, draft, {});
      const newVal = merged[fieldKey];
      if (newVal === undefined) return;
      setState((s) => {
        const next = Object.assign({}, s.answers);
        next[section.id] = Object.assign({}, next[section.id] || {}, { [fieldKey]: newVal });
        const aiDrafted = Object.assign({}, s.aiDrafted || {});
        const secFlags = Object.assign({}, aiDrafted[section.id] || {});
        secFlags[fieldKey] = true;
        aiDrafted[section.id] = secFlags;
        return Object.assign({}, s, { answers: next, aiDrafted: aiDrafted });
      });
    } finally {
      setDrafting((d) => {
        const next = Object.assign({}, d);
        delete next[section.id + ":" + fieldKey];
        return next;
      });
    }
  };

  /* The first build section after Setup (About now lives on the welcome page). */
  const firstBuildId = (sections.find((s) => s.group !== "setup") || sections[0]).id;

  /* Load demo seed — populates About with sample company, then jumps into the
     first build section so the prefill magic shows immediately. */
  const loadDemoSeed = () => {
    const seed = window.vtoDemoSeed();
    setState((s) => Object.assign({}, s, {
      answers: Object.assign({}, s.answers, seed),
      currentId: firstBuildId,
      startedAt: s.startedAt || new Date().toISOString()
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetAll = () => {
    if (!confirm("Start over? This clears your V/TO from this browser.")) return;
    localStorage.removeItem(VTO_STATE_KEY);
    setState(vtoDefaultState());
  };

  /* Render */
  const sectionAnswers = currentSection ? (state.answers[currentSection.id] || {}) : {};

  // Render side rail unless welcome
  const showNav = !isWelcome;

  return (
    <React.Fragment>
      <VtoFieldStyles />

      {showNav && t.navStyle === "siderail" ? (
        <VtoSideRail
          sections={sections}
          groups={groups}
          activeId={state.currentId}
          setActiveId={setActiveId}
          answers={state.answers}
          grouped={!!t.groupedRail}
        />
      ) : null}

      {showNav && t.navStyle === "topbar" ? (
        <div className="stage">
          <VtoTopStepper
            sections={sections}
            groups={groups}
            activeId={state.currentId}
            setActiveId={setActiveId}
            answers={state.answers}
            grouped={!!t.groupedRail}
          />
          {renderMainContent()}
        </div>
      ) : (
        <div className="stage">{renderMainContent()}</div>
      )}

      {/* Coach panel — visible when aiMode is "coach" or "both" AND user has it open */}
      {(t.aiMode === "coach" || t.aiMode === "both") && coachOpen ? (
        <VtoCoachWithEvents
          activeSection={currentSection}
          answers={state.answers}
          sections={sections}
          onApplyDraft={() => {}}
          isOpen={true}
          onToggle={() => setCoachOpen(false)}
          placement={t.coachPlacement || "drawer"}
        />
      ) : null}

      {/* Floating FAB when coach mode is active but panel collapsed */}
      {(t.aiMode === "coach" || t.aiMode === "both") && !coachOpen ? (
        <VtoCoachFab onOpen={() => setCoachOpen(true)} variant={t.coachButton || "bottom-right"} />
      ) : null}
    </React.Fragment>
  );

  function renderMainContent() {
    if (isWelcome) {
      // "Progress" means they've started a build section — typing into the
      // About form that now lives on this page doesn't count as leaving the start.
      const hasProgress = Object.keys(state.answers).some(
        (k) => k !== "about" && Object.keys(state.answers[k] || {}).length > 0
      );
      return (
        <VtoWelcome
          hasProgress={hasProgress}
          onStart={() => setActiveId(firstBuildId)}
          onReset={resetAll}
          onLoadDemo={loadDemoSeed}
          answers={state.answers}
          setAnswer={setAnswer}
          aboutSection={sections.find((s) => s.id === "about")}
        />
      );
    }
    if (isReview) {
      return (
        <VtoReview
          answers={state.answers}
          setAnswer={setAnswer}
          sections={sections}
          goToSection={setActiveId}
        />
      );
    }
    const idx = sections.findIndex((s) => s.id === state.currentId);
    return (
      <VtoSection
        section={currentSection}
        answers={state.answers}
        setAnswer={setAnswer}
        sectionAnswers={sectionAnswers}
        onNext={nextSection}
        onPrev={prevSection}
        hasPrev={hasPrev}
        hasNext={hasNext}
        idx={idx}
        total={sections.length}
        tweaks={t}
        aiDrafted={(state.aiDrafted && state.aiDrafted[currentSection.id]) || {}}
        drafting={drafting}
        onDraftSection={draftSection}
        onDraftField={draftField}
      />
    );
  }
}

/* ============================================================
   A small wrapper around the coach that listens for "vto:coach-message"
   events from the inline suggest button so messages show up in the panel.
   ============================================================ */
function VtoCoachWithEvents(props) {
  const [externalMsgs, setExternalMsgs] = React.useState([]);
  React.useEffect(() => {
    const handler = (e) => {
      setExternalMsgs((m) => m.concat([e.detail]));
    };
    window.addEventListener("vto:coach-message", handler);
    return () => window.removeEventListener("vto:coach-message", handler);
  }, []);

  return <VtoCoachPanel {...props} externalMsgs={externalMsgs} />;
}

/* ============================================================
   Bootstrap
   ============================================================ */
const __vtoRoot = document.getElementById("stage");
if (__vtoRoot) {
  ReactDOM.createRoot(__vtoRoot).render(<VtoApp />);
}

Object.assign(window, { VtoApp });
