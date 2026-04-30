// workspace-views.jsx
// Notebook modality (tabbed sections).

const { useState: useStateV, useMemo: useMemoV } = React;

// ─── NOTEBOOK (tabbed) ─────────────────────────────────────────────────
function NotebookView({ state, actions }) {
  const r = window.TRIP;
  const tabs = [
    { id: "overview",    label: "Overview",    badge: 0 },
    { id: "prompts",     label: "Prompts",     badge: state.pickedPrompts.length },
    { id: "decisions",   label: "Decisions",   badge: state.decisions.length },
    { id: "threads",     label: "Open threads", badge: state.threads.filter(t => !t.resolved).length },
    { id: "journal",     label: "Notes",       badge: state.journal.length },
    { id: "library",     label: "Library",     badge: state.uploads.length + r.library.length },
    { id: "commitments", label: "Commitments", badge: 0 }
  ];
  const [active, setActive] = useStateV("overview");

  return (
    <div className="notebook">
      <div style={{ marginTop: 16 }}>
        <div className="eyebrow">Cancun retreat · workspace</div>
        <h1 className="h-display" style={{ margin: "8px 0 0" }}>Leya <em>&</em> Kelly</h1>
        <div className="muted serif" style={{ fontStyle: "italic", marginTop: 8, fontSize: 17 }}>
          {r.location} · {r.dateRange}
        </div>
      </div>

      <div className="notebook-tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.id} className="notebook-tab"
            aria-selected={active === t.id} onClick={() => setActive(t.id)}>
            {t.label}
            {t.badge > 0 && <span className="badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="notebook-section">
        {active === "overview" && (
          <>
            <h1 className="h-display" style={{ margin: 0 }}>What we're <em>here for</em></h1>
            <p className="lede">Three things, in this order. Every business question this week is in service of the third.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, margin: "0 0 32px" }}>
              {r.intentions.map((it, i) => (
                <div key={i} className="card">
                  <div className="eyebrow" style={{ marginBottom: 8 }}>0{i+1}</div>
                  <div className="h-2" style={{ marginBottom: 6 }}>{it.title}</div>
                  <div className="card-body muted">{it.body}</div>
                </div>
              ))}
            </div>
            <div className="eyebrow">Days at a glance</div>
            <DaysStrip phase={state.tripPhase} />
            <div className="card joy-pin" style={{ background: "var(--accent-soft)", borderColor: "#DDB7A0", padding: 24 }}>
              <div className="pin-text serif" style={{ fontStyle: "italic", fontSize: 21, lineHeight: 1.4, color: "var(--accent-deep)" }}>
                "{r.joyQuote.text}"
              </div>
              <div style={{ marginTop: 12 }}><Who id={r.joyQuote.author} /></div>
            </div>
          </>
        )}
        {active === "prompts" && (
          <>
            <h1 className="h-display" style={{ margin: 0 }}>Prompts</h1>
            <p className="lede">Pick what's alive. Optional, never required. {state.pickedPrompts.length} on the board.</p>
            <div style={{ marginBottom: 24 }}>
              {state.pickedPrompts.length === 0
                ? <div className="empty">Nothing picked yet. Try the shelf below.</div>
                : <div className="notebook-list">
                    {state.pickedPrompts.map(p => {
                      const topic = r.topics.find(t => t.id === p.topic);
                      return (
                        <div key={p.id} className="card">
                          <div className="card-head">
                            <span className="tag" data-tint={topic?.tint || "ink"}>{topic?.label}</span>
                            <button className="btn btn-ghost btn-danger" onClick={() => actions.unpickPrompt(p.id)}><Icon name="x" size={12} /></button>
                          </div>
                          <div className="serif" style={{ fontStyle: "italic", fontSize: 17, lineHeight: 1.4 }}>"{p.text}"</div>
                          <div className="card-foot"><Who id={p.addedBy} time={p.ts} /><span className="muted" style={{ fontSize: 11 }}>{p.status}</span></div>
                        </div>
                      );
                    })}
                  </div>}
            </div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>The library</div>
            <PromptShelf state={state} actions={actions} />
          </>
        )}
        {active === "decisions"  && (<><h1 className="h-display" style={{ margin: 0 }}>Decisions</h1><p className="lede">A running ledger. Anything we agreed on, written down.</p><DecisionList state={state} actions={actions} /></>)}
        {active === "threads"    && (<><h1 className="h-display" style={{ margin: 0 }}>Open <em>threads</em></h1><p className="lede">What's not closed. With a date for when we come back to it.</p><ThreadList state={state} actions={actions} /></>)}
        {active === "journal"    && (<><h1 className="h-display" style={{ margin: 0 }}>Notes</h1><p className="lede">Voice notes, reflections, quick captures. Private to us.</p><JournalList state={state} actions={actions} /></>)}
        {active === "library"    && (<><h1 className="h-display" style={{ margin: 0 }}>Library</h1><p className="lede">Briefs, photos, context docs. Drop in what we want shared.</p><UploadZone state={state} actions={actions} /></>)}
        {active === "commitments"&& (<><h1 className="h-display" style={{ margin: 0 }}>Closing <em>commitments</em></h1><p className="lede">Wednesday night, over dinner. Each of us, four lines.</p><CommitmentsTracker state={state} actions={actions} /></>)}
      </div>
    </div>
  );
}

// ─── App shell ──────────────────────────────────────────────────────────
function App() {
  const [state, actions] = useStore();

  return (
    <>
      <TopBar state={state} actions={actions} />
      <NotebookView state={state} actions={actions} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Trip phase" />
        <TweakRadio label="Phase" value={state.tripPhase}
          options={[
            { value: "pre",    label: "Pre"    },
            { value: "during", label: "During" },
            { value: "post",   label: "Post"   }
          ]}
          onChange={(v) => actions.setPhase(v)} />

        <TweakSection label="Voice" />
        <TweakRadio label="Acting as" value={state.currentVoice}
          options={[
            { value: "leya",  label: "Leya"  },
            { value: "kelly", label: "Kelly" }
          ]}
          onChange={(v) => actions.setVoice(v)} />

        <TweakSection label="Data" />
        <TweakButton label="Reset workspace" onClick={() => {
          if (confirm("Clear all picked prompts, decisions, threads, notes, uploads?")) actions.resetAll();
        }} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
