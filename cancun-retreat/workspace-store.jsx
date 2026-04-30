// workspace-store.jsx
// localStorage-backed store for workspace state.
// Exposes a useStore() hook returning [state, actions].

const STORAGE_KEY = "lpm-cancun-retreat-v1";

const DEFAULT_STATE = {
  tripPhase: "pre",                    // "pre" | "during" | "post"
  currentVoice: "leya",                // who's adding things right now
  pickedPrompts: [],                   // [{id, day, topic, text, addedBy, ts, status}]
  decisions: [],                       // [{id, text, author, day, ts}]
  threads: [],                         // [{id, text, author, due, ts, resolved}]
  journal: [],                         // [{id, author, text, ts}]
  uploads: [],                         // [{id, name, kind, size, author, ts}]
  commitments: { leya: {}, kelly: {} },// {decision, openThread, commitment, friendship}
  hasSeeded: false
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
}
function uid() { return Math.random().toString(36).slice(2, 9); }
function nowStamp() {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hh = d.getHours().toString().padStart(2,"0");
  const mm = d.getMinutes().toString().padStart(2,"0");
  return `${months[d.getMonth()]} ${d.getDate()} · ${hh}:${mm}`;
}

function useStore() {
  const [state, setState] = React.useState(() => {
    const stored = loadState();
    if (stored) return stored;
    // first run — seed
    return {
      ...DEFAULT_STATE,
      decisions: [...window.TRIP.seedDecisions],
      threads:   [...window.TRIP.seedThreads],
      journal:   [...window.TRIP.seedJournal],
      hasSeeded: true
    };
  });

  React.useEffect(() => { saveState(state); }, [state]);

  const update = (fn) => setState(prev => fn(prev));

  const actions = React.useMemo(() => ({
    setPhase: (phase) => update(s => ({ ...s, tripPhase: phase })),
    setVoice: (v)     => update(s => ({ ...s, currentVoice: v })),

    pickPrompt: (prompt) => update(s => {
      if (s.pickedPrompts.find(p => p.id === prompt.id)) return s;
      return { ...s, pickedPrompts: [{ ...prompt, addedBy: s.currentVoice, ts: nowStamp(), status: "open" }, ...s.pickedPrompts] };
    }),
    unpickPrompt: (id) => update(s => ({ ...s, pickedPrompts: s.pickedPrompts.filter(p => p.id !== id) })),
    markPromptDone: (id) => update(s => ({
      ...s,
      pickedPrompts: s.pickedPrompts.map(p => p.id === id ? { ...p, status: p.status === "done" ? "open" : "done" } : p)
    })),

    addDecision: (text) => update(s => text.trim()
      ? { ...s, decisions: [{ id: uid(), text: text.trim(), author: s.currentVoice, day: s.tripPhase, ts: nowStamp() }, ...s.decisions] }
      : s),
    removeDecision: (id) => update(s => ({ ...s, decisions: s.decisions.filter(d => d.id !== id) })),

    addThread: (text, due) => update(s => text.trim()
      ? { ...s, threads: [{ id: uid(), text: text.trim(), author: s.currentVoice, due: due || "—", ts: nowStamp(), resolved: false }, ...s.threads] }
      : s),
    toggleThread: (id) => update(s => ({
      ...s,
      threads: s.threads.map(t => t.id === id ? { ...t, resolved: !t.resolved } : t)
    })),
    removeThread: (id) => update(s => ({ ...s, threads: s.threads.filter(t => t.id !== id) })),

    addJournal: (text) => update(s => text.trim()
      ? { ...s, journal: [{ id: uid(), author: s.currentVoice, text: text.trim(), ts: nowStamp() }, ...s.journal] }
      : s),
    removeJournal: (id) => update(s => ({ ...s, journal: s.journal.filter(j => j.id !== id) })),

    addUpload: (file) => update(s => ({
      ...s,
      uploads: [{ id: uid(), name: file.name, kind: file.kind || "doc", size: file.size || "—", author: s.currentVoice, ts: nowStamp() }, ...s.uploads]
    })),
    removeUpload: (id) => update(s => ({ ...s, uploads: s.uploads.filter(u => u.id !== id) })),

    setCommitment: (person, key, value) => update(s => ({
      ...s,
      commitments: { ...s.commitments, [person]: { ...s.commitments[person], [key]: value } }
    })),

    resetAll: () => update(s => ({
      ...DEFAULT_STATE,
      decisions: [...window.TRIP.seedDecisions],
      threads:   [...window.TRIP.seedThreads],
      journal:   [...window.TRIP.seedJournal],
      hasSeeded: true
    }))
  }), []);

  return [state, actions];
}

window.useStore = useStore;
window.uid = uid;
window.nowStamp = nowStamp;
