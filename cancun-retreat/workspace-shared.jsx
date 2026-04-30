// workspace-shared.jsx
// Shared primitives.
// Exports: Icon, Who, PhasePills, VoicePills, TopBar,
//          PromptShelf, DecisionList, ThreadList, JournalList,
//          UploadZone, FileList, CommitmentsTracker, DaysStrip, JoyQuotePin

const { useState, useEffect, useRef } = React;

// ─── Icons (Lucide-style inline SVG) ───────────────────────────────────
function Icon({ name, size = 14 }) {
  const paths = {
    plus:    <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    x:       <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    check:   <polyline points="20 6 9 17 4 12"/>,
    pin:     <><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></>,
    upload:  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    book:    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>,
    pen:     <><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></>,
    arrow:   <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    trash:   <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
    file:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    spark:   <><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/></>,
    quote:   <path d="M3 21c3 0 6-2 6-6V8H3v7h3c0 2-1 3-3 3v3zM15 21c3 0 6-2 6-6V8h-6v7h3c0 2-1 3-3 3v3z"/>
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// ─── Author chip ───────────────────────────────────────────────────────
function Who({ id, time }) {
  const person = window.TRIP.people.find(p => p.id === id) || window.TRIP.people[0];
  return (
    <span className="who" data-who={person.id}>
      <span className="who-dot">{person.initials}</span>
      <span className="who-name">{person.name}</span>
      {time && <span className="who-time">· {time}</span>}
    </span>
  );
}

// ─── Phase pills ───────────────────────────────────────────────────────
function PhasePills({ value, onChange }) {
  const phases = [
    { id: "pre",    label: "Pre-trip" },
    { id: "during", label: "On trip" },
    { id: "post",   label: "After" }
  ];
  return (
    <div className="phase-pills" role="tablist" aria-label="Trip phase">
      {phases.map(p => (
        <button key={p.id} className="phase-pill"
          aria-pressed={value === p.id}
          onClick={() => onChange(p.id)}>{p.label}</button>
      ))}
    </div>
  );
}

// ─── Voice pills ───────────────────────────────────────────────────────
function VoicePills({ value, onChange }) {
  return (
    <div className="voice-toggle">
      <span className="lbl">Acting as</span>
      <div className="voice-pills">
        {window.TRIP.people.map(p => (
          <button key={p.id} className="voice-pill" data-who={p.id}
            aria-pressed={value === p.id}
            onClick={() => onChange(p.id)}>
            <span className="voice-dot">{p.initials}</span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Top bar ───────────────────────────────────────────────────────────
function TopBar({ state, actions }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">{window.TRIP.title}</span>
        <span className="topbar-meta">{window.TRIP.location} · {window.TRIP.dateRange}</span>
      </div>
      <div className="topbar-right">
        <PhasePills value={state.tripPhase} onChange={actions.setPhase} />
        <VoicePills value={state.currentVoice} onChange={actions.setVoice} />
      </div>
    </div>
  );
}

// ─── Days strip / day tiles ────────────────────────────────────────────
function dayState(dayId, phase) {
  if (phase === "pre")  return "future";
  if (phase === "post") return "past";
  // during: mock "today" as Tuesday for demo
  const order = ["mon","tue","wed","thu"];
  const todayIdx = 1; // Tue
  const idx = order.indexOf(dayId);
  if (idx < todayIdx) return "past";
  if (idx === todayIdx) return "now";
  return "future";
}
function DaysStrip({ phase, onPickDay }) {
  return (
    <div className="days-strip">
      {window.TRIP.days.map(d => (
        <div key={d.id} className="day-tile" data-state={dayState(d.id, phase)}
             onClick={() => onPickDay && onPickDay(d.id)}>
          <span className="num">{d.num}</span>
          <span className="name">{d.name}</span>
          <span className="tag-line">{d.date} · {d.tagline}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Prompt shelf (pickable cards) ─────────────────────────────────────
function PromptShelf({ state, actions, dayFilter, topicFilter }) {
  const picked = new Set(state.pickedPrompts.map(p => p.id));
  let prompts = window.TRIP.prompts;
  if (dayFilter)   prompts = prompts.filter(p => p.day === dayFilter);
  if (topicFilter) prompts = prompts.filter(p => p.topic === topicFilter);

  const toggle = (p) => picked.has(p.id) ? actions.unpickPrompt(p.id) : actions.pickPrompt(p);
  return (
    <div className="prompt-shelf">
      {prompts.map(p => {
        const topic = window.TRIP.topics.find(t => t.id === p.topic);
        return (
          <button key={p.id} className="prompt-card" data-picked={picked.has(p.id)}
                  onClick={() => toggle(p)}>
            <div className="text">{p.text}</div>
            <div className="meta">
              <span>{p.day === "mon" ? "Mon" : p.day === "tue" ? "Tue" : p.day === "wed" ? "Wed" : "Thu"}</span>
              <span>·</span>
              <span>{topic ? topic.label : p.topic}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Inline composer ───────────────────────────────────────────────────
function Composer({ placeholder, onAdd, multiline = true, withDue = false, voice }) {
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    if (withDue) onAdd(text, due);
    else onAdd(text);
    setText(""); setDue("");
  };
  return (
    <div className="composer">
      {multiline
        ? <textarea rows={2} placeholder={placeholder} value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey||e.ctrlKey)) submit(); }} />
        : <input type="text" placeholder={placeholder} value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />}
      <div className="composer-row">
        <div className="composer-meta">
          <Who id={voice} />
          {withDue && (
            <input type="text" placeholder="when? (e.g. Jun 1)"
              value={due} onChange={(e) => setDue(e.target.value)}
              style={{ border: "1px solid var(--rule)", borderRadius: 999, padding: "3px 10px", fontSize: 11, background: "var(--bg)" }} />
          )}
        </div>
        <button className="btn btn-primary" onClick={submit}><Icon name="plus" size={12} />Add</button>
      </div>
    </div>
  );
}

// ─── Decision list ─────────────────────────────────────────────────────
function DecisionList({ state, actions }) {
  return (
    <div className="notebook-list">
      <Composer placeholder="A decision we made…"
        voice={state.currentVoice}
        onAdd={(t) => actions.addDecision(t)} />
      {state.decisions.length === 0
        ? <div className="empty">No decisions yet. Make one this week.</div>
        : state.decisions.map((d, i) => (
            <div key={d.id} className="card decision-card">
              <span className="decision-num">{String(state.decisions.length - i).padStart(2, "0")}</span>
              <div className="decision-text">
                <div>{d.text}</div>
                <div className="card-foot" style={{ marginTop: 8 }}>
                  <Who id={d.author} time={d.ts} />
                  <button className="btn btn-ghost btn-danger" onClick={() => actions.removeDecision(d.id)}><Icon name="trash" size={12} /></button>
                </div>
              </div>
            </div>
          ))}
    </div>
  );
}

// ─── Thread list ───────────────────────────────────────────────────────
function ThreadList({ state, actions }) {
  return (
    <div className="notebook-list">
      <Composer placeholder="An open thread we'll come back to…"
        withDue={true}
        voice={state.currentVoice}
        onAdd={(t, due) => actions.addThread(t, due)} />
      {state.threads.length === 0
        ? <div className="empty">No open threads. Add what's still hanging.</div>
        : state.threads.map(t => (
            <div key={t.id} className="card thread-card">
              <button className="thread-check" data-resolved={t.resolved}
                aria-label="toggle resolved"
                onClick={() => actions.toggleThread(t.id)} />
              <div className="thread-text" data-resolved={t.resolved}>
                <div>{t.text}</div>
                <div className="card-foot" style={{ marginTop: 8 }}>
                  <Who id={t.author} time={t.ts} />
                  <button className="btn btn-ghost btn-danger" onClick={() => actions.removeThread(t.id)}><Icon name="trash" size={12} /></button>
                </div>
              </div>
              <span className="thread-due">{t.due}</span>
            </div>
          ))}
    </div>
  );
}

// ─── Journal ───────────────────────────────────────────────────────────
function JournalList({ state, actions }) {
  return (
    <div className="notebook-list">
      <Composer placeholder="A note to myself, or to us…"
        voice={state.currentVoice}
        onAdd={(t) => actions.addJournal(t)} />
      {state.journal.length === 0
        ? <div className="empty">No notes yet. Write something only you'd say.</div>
        : state.journal.map(j => (
            <div key={j.id} className="card journal-card">
              <div className="card-head">
                <Who id={j.author} time={j.ts} />
                <button className="btn btn-ghost btn-danger" onClick={() => actions.removeJournal(j.id)}><Icon name="trash" size={12} /></button>
              </div>
              <div className="body">{j.text}</div>
            </div>
          ))}
    </div>
  );
}

// ─── Uploads (mocked drag-drop) ────────────────────────────────────────
function UploadZone({ state, actions }) {
  const [active, setActive] = useState(false);
  const inputRef = useRef(null);
  const handle = (files) => {
    Array.from(files).forEach(f => {
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      const kind = ["png","jpg","jpeg","gif","webp"].includes(ext) ? "image"
                 : ext === "pdf" ? "pdf" : "doc";
      const sizeKB = f.size / 1024;
      const size = sizeKB > 1024 ? `${(sizeKB/1024).toFixed(1)} MB` : `${Math.round(sizeKB)} KB`;
      actions.addUpload({ name: f.name, kind, size });
    });
  };
  // pre-seeded library + user uploads, merged
  const all = [...state.uploads, ...window.TRIP.library];
  return (
    <div className="notebook-list">
      <div className="dropzone" data-active={active}
        onDragOver={(e) => { e.preventDefault(); setActive(true); }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => { e.preventDefault(); setActive(false); handle(e.dataTransfer.files); }}
        onClick={() => inputRef.current && inputRef.current.click()}
      >
        <input ref={inputRef} type="file" multiple style={{ display: "none" }}
          onChange={(e) => handle(e.target.files)} />
        <div className="label">Drop notes, briefs, photos here</div>
        <div className="hint">Or click to choose. Mock storage — files don't actually upload.</div>
      </div>
      {all.map(f => (
        <div key={f.id} className="file-row">
          <div className="file-icon" data-kind={f.kind}>{f.kind === "pdf" ? "PDF" : f.kind === "image" ? "IMG" : "DOC"}</div>
          <div>
            <div className="file-name">{f.name}</div>
            <div className="file-meta">{f.author && `Added by ${f.author === "leya" ? "Leya" : "Kelly"} · `}{f.added || f.ts || ""}{f.size ? ` · ${f.size}` : ""}</div>
          </div>
          <span className="tag" data-tint="ink">{f.kind}</span>
          {state.uploads.find(u => u.id === f.id)
            ? <button className="btn btn-ghost btn-danger" onClick={() => actions.removeUpload(f.id)}><Icon name="trash" size={12} /></button>
            : <span className="btn btn-ghost" style={{ opacity: 0.5, fontSize: 11 }}>seed</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Commitments tracker (the closing ritual) ─────────────────────────
function CommitmentsTracker({ state, actions }) {
  const fields = [
    { key: "decision",   label: "One decision we made" },
    { key: "openThread", label: "One thing still open (and when we'll return)" },
    { key: "commitment", label: "One commitment to the other (with a date)" },
    { key: "friendship", label: "One thing about this friendship I want to say out loud" }
  ];
  return (
    <div className="commit-grid">
      {window.TRIP.people.map(p => (
        <div key={p.id} className="commit-col">
          <h3>
            <Who id={p.id} />
          </h3>
          {fields.map(f => (
            <div key={f.key} className="commit-row">
              <div className="lbl">{f.label}</div>
              <textarea
                rows={2}
                placeholder="—"
                value={state.commitments[p.id]?.[f.key] || ""}
                onChange={(e) => actions.setCommitment(p.id, f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Joy quote — used as a pinboard centerpiece
function JoyQuotePin() {
  const q = window.TRIP.joyQuote;
  return (
    <div className="pin joy-pin" data-kind="quote">
      <div className="pin-text">
        "{q.text}"
      </div>
      <div className="pin-foot">
        <Who id={q.author} />
        <span className="tag" data-tint="accent">throughline</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  Icon, Who, PhasePills, VoicePills, TopBar,
  PromptShelf, DecisionList, ThreadList, JournalList,
  UploadZone, FileList: UploadZone, CommitmentsTracker, DaysStrip,
  Composer, JoyQuotePin, dayState
});
