// workspace-data.jsx
// Shared trip workspace — content + types.
// Static seed data; user-generated state lives in localStorage (see workspace-store.jsx).

const TRIP = {
  title: "Leya & Kelly · Cancun",
  location: "Le Blanc Cancun",
  dateRange: "May 4 — 7, 2026",
  startISO: "2026-05-04",
  endISO:   "2026-05-07",

  people: [
    { id: "leya",  name: "Leya",  initials: "L", tint: "ink"   },
    { id: "kelly", name: "Kelly", initials: "K", tint: "warm"  }
  ],

  joyQuote: {
    text: "There is nothing that brings me more joy than working on ALDF together. So how do we do more of it?",
    author: "kelly"
  },

  intentions: [
    { title: "Rest, in our bodies",        body: "Stillness, sun, ocean, real sleep, walks, yoga if we want it, long meals with no laptops in sight." },
    { title: "Each other",                  body: "Friendship, hard things, soft things, conversations that don't happen on Zoom." },
    { title: "The work we love, together", body: "Kelly's question is the throughline. Every business question is in service of that one." }
  ],

  days: [
    {
      id: "mon", num: "01", date: "Mon · May 4", name: "Arrive",          tagline: "Reconnect",
      blocks: [
        { tod: "Afternoon", title: "Travel, check in, settle",   body: "Walk the property. Unpack slowly. Pool or balcony with a drink." },
        { tod: "Sunset",    title: "Sunset walk on the beach",   body: "Just us. No prompts. Talk about anything except work." },
        { tod: "Dinner",    title: "Welcome dinner",             body: "What we want from this week. What we don't want to miss. What we're each carrying in." }
      ]
    },
    {
      id: "tue", num: "02", date: "Tue · May 5", name: "The work we love", tagline: "CRM migration & the ALDF fork",
      blocks: [
        { tod: "Slow morning",  title: "Movement, breakfast outside",         body: "Walk, yoga, gym. Whatever feels right." },
        { tod: "Late morning",  title: "CRM migration product, V1",           meta: "~2 hrs · Working block",
          body: "Synthesis brief is read. This block is for arguing it through and making decisions." },
        { tod: "Afternoon",     title: "Pool. Beach. Books. Nap.",            meta: "3–4 hrs · Open",
          body: "Spa if we want it. Lunch whenever, wherever." },
        { tod: "Late afternoon",title: "The ALDF fork",                       meta: "~90 min",
          body: "If ALDF signed → Moves Mgmt Dashboard roadmap. If not → AI for consultants like us." },
        { tod: "Dinner",        title: "Friendship night",                    body: "Hard things. Family. Life. No business unless it bubbles up." }
      ]
    },
    {
      id: "wed", num: "03", date: "Wed · May 6", name: "How we do this together", tagline: "Kelly's question, answered", isCenterpiece: true,
      blocks: [
        { tod: "Slow morning",  title: "Movement, breakfast outside",     body: "No rush." },
        { tod: "Late morning",  title: "How we do more of the work we love together", meta: "~2 hrs · Centerpiece",
          body: "Notebooks more likely than laptops. The question isn't \"should we partner\" — it's what does the partnership look like, so we get more of this and less of everything else." },
        { tod: "Afternoon",     title: "A real break",                    meta: "2–3 hrs · Non-negotiable",
          body: "Spa, beach, solo time, nap. The afternoon block needs us rested." },
        { tod: "Late afternoon",title: "Visioning",                       meta: "~1 hr",
          body: "Light, reflective. Maybe 20 min solo, then come back together." },
        { tod: "Dinner",        title: "Closing dinner — partnership ritual",
          body: "We close tonight. Each of us names: a decision, an open thread, a commitment, one thing about this friendship." }
      ]
    },
    {
      id: "thu", num: "04", date: "Thu · May 7", name: "Departure", tagline: "Coffee, hug, go",
      blocks: [
        { tod: "Early morning", title: "~7:30am hotel checkout", body: "10:30am flight. Coffee on the balcony. Hug. Go." }
      ]
    }
  ],

  // Conversation prompt library — tagged by day & topic. Pickable cards.
  prompts: [
    // Monday — opening
    { id: "p01", day: "mon", topic: "opening",     text: "One thing I want to say out loud before we start." },
    { id: "p02", day: "mon", topic: "opening",     text: "One thing I don't want us to skip talking about." },
    { id: "p03", day: "mon", topic: "opening",     text: "One thing I want for myself this week that isn't about work." },

    // Tuesday — CRM
    { id: "p10", day: "tue", topic: "crm",         text: "Is F&E Refugee really V1, or are we kidding ourselves about the deadline?" },
    { id: "p11", day: "tue", topic: "crm",         text: "$50K+ board-approved or sub-$25K CDO discretionary — which posture do we want to live inside?" },
    { id: "p12", day: "tue", topic: "crm",         text: "What's actually in V1 base scope vs. add-ons?" },
    { id: "p13", day: "tue", topic: "crm",         text: "What's the smallest thing we could pitch ALDF in two weeks?" },
    { id: "p14", day: "tue", topic: "crm",         text: "Where are we still genuinely unsure, and what would unstick us?" },

    // Tuesday — ALDF fork
    { id: "p20", day: "tue", topic: "aldf",        text: "If we ship Moves Mgmt to Susan's team — what's the smallest first version?" },
    { id: "p21", day: "tue", topic: "aldf",        text: "Productized for the field, or bespoke for ALDF? Why?" },
    { id: "p22", day: "tue", topic: "aldf",        text: "If ALDF didn't sign — who's the buyer for AI for consultants?" },
    { id: "p23", day: "tue", topic: "aldf",        text: "Six-month regret check: if we never built this, would we miss it?" },

    // Wednesday — partnership (the centerpiece)
    { id: "p30", day: "wed", topic: "partnership", text: "What does \"working together more\" look like, concretely?" },
    { id: "p31", day: "wed", topic: "partnership", text: "Joint entity, contract-based, or LPM-and-KBC-as-allies?" },
    { id: "p32", day: "wed", topic: "partnership", text: "Which work flows where — ALDF, CRM, Moves Mgmt, future things — and why?" },
    { id: "p33", day: "wed", topic: "partnership", text: "Money: revenue share, fee split, project-by-project? What feels clean?" },
    { id: "p34", day: "wed", topic: "partnership", text: "What feels resentful in 2 years if we set it up this way?" },
    { id: "p35", day: "wed", topic: "partnership", text: "Decision rights — what do we each own, what needs both of us?" },
    { id: "p36", day: "wed", topic: "partnership", text: "What would make either of us want out in 2 years, and how do we design against that now?" },
    { id: "p37", day: "wed", topic: "partnership", text: "First 90 days back home: what do we actually do — not \"discuss,\" do?" },

    // Wednesday — visioning (added a few in same voice)
    { id: "p40", day: "wed", topic: "vision",      text: "What am I building toward in three years? What does \"I made it\" look like?" },
    { id: "p41", day: "wed", topic: "vision",      text: "What am I saying yes to this year? What am I saying no to?" },
    { id: "p42", day: "wed", topic: "vision",      text: "Leftover threads — Josh, multi-function AI firm, hiring, KBC's next chapter. Which is alive, which do we park?" },
    { id: "p43", day: "wed", topic: "vision",      text: "What's the smallest version of \"I made it\" that I'd actually believe?" },

    // Friendship night (Tue)
    { id: "p50", day: "tue", topic: "friendship",  text: "What's been quietly heavy that I haven't said out loud yet?" },
    { id: "p51", day: "tue", topic: "friendship",  text: "Where in my life do I feel most like myself right now?" },
    { id: "p52", day: "tue", topic: "friendship",  text: "What do I need from this friendship that I haven't asked for?" },

    // Closing (Wed dinner)
    { id: "p60", day: "wed", topic: "closing",     text: "One decision we made this week." },
    { id: "p61", day: "wed", topic: "closing",     text: "One thing still open, and when we'll come back to it." },
    { id: "p62", day: "wed", topic: "closing",     text: "One commitment to the other, with a date." },
    { id: "p63", day: "wed", topic: "closing",     text: "One thing about this friendship I want to say out loud." }
  ],

  topics: [
    { id: "opening",     label: "Opening",        tint: "warm"  },
    { id: "crm",         label: "CRM migration",  tint: "ink"   },
    { id: "aldf",        label: "ALDF fork",      tint: "ink"   },
    { id: "partnership", label: "Partnership",    tint: "accent"},
    { id: "vision",      label: "Vision",         tint: "warm"  },
    { id: "friendship",  label: "Friendship",     tint: "warm"  },
    { id: "closing",     label: "Closing ritual", tint: "accent"}
  ],

  // Library — real docs in the Drive folder "Retreat - Cancun May 2026"
  libraryFolder: {
    name: "Retreat - Cancun May 2026",
    url:  "https://drive.google.com/drive/folders/168U7e9ey6BcutFKzBBHwYmZ4Mi8r3WtS"
  },
  library: [
    { id: "doc-00", name: "00 — READ FIRST — Product V1 Synthesis Brief", kind: "doc", author: "leya", added: "Apr 21",
      url: "https://drive.google.com/file/d/1hJLvxOV-4Uyt6JM0mCbGJFg4I92O3BtW/view" },
    { id: "doc-01", name: "01 — Retreat Agenda", kind: "doc", author: "leya", added: "Apr 21",
      url: "https://drive.google.com/file/d/12aTpoEqBEbCx74scDHOIm_RuPdPLgJsF/view" },
    { id: "doc-02", name: "02 — Product V1 Canvas (Tuesday session)", kind: "doc", author: "leya", added: "Apr 21",
      url: "https://drive.google.com/file/d/1VvImYkAqg6r_tYMy1ElKKM7KVXVeZlet/view" },
    { id: "doc-03", name: "03 — Partnership Structure Decision Tree (Wednesday)", kind: "doc", author: "leya", added: "Apr 21",
      url: "https://drive.google.com/file/d/1lESB-4dU4hISX1A8PS4LMG7H6xkQpxOx/view" },
    { id: "doc-10", name: "10 — Research Brief", kind: "doc", author: "leya", added: "Apr 21",
      url: "https://drive.google.com/file/d/1OzTo3SuXcApP681tkbno8NBeKorSrN5-/view" },
    { id: "doc-11", name: "11 — Research v1 — Vendor Scan", kind: "doc", author: "leya", added: "Apr 21",
      url: "https://drive.google.com/file/d/1w2MTOMPos2cJnhmG0dT5OX_dIDzVkxRM/view" },
    { id: "doc-12", name: "12 — Research v2 — Why Now (The Collision)", kind: "doc", author: "leya", added: "Apr 21",
      url: "https://drive.google.com/file/d/1GturjfHS1jiQvzxbUJBoU2aChAZKv7NR/view" },
    { id: "doc-13", name: "13 — Research v2 — Buyer & GTM", kind: "doc", author: "leya", added: "Apr 21",
      url: "https://drive.google.com/file/d/154-fz2gp2iSI32fwgiqGjJBjtjg_7UWc/view" },
    { id: "doc-14", name: "14 — Research v2 — Fundraising Data (the Moat)", kind: "doc", author: "leya", added: "Apr 21",
      url: "https://drive.google.com/file/d/1ZlICs_uA7AxtMlcd6EaDR7FFNqdd80ZC/view" },
    { id: "doc-15", name: "15 — Research v2 — Risks, Pricing, Competition", kind: "doc", author: "leya", added: "Apr 21",
      url: "https://drive.google.com/file/d/1QSU0Jb1avEIzRiiP0Zz-qVUXt9BuIwnM/view" }
  ],

  // Pre-seeded examples — make the workspace feel populated, not empty.
  seedDecisions: [
    { id: "seed-d1", day: "pre", text: "Wednesday is the relationship day. Hardest convo, freshest brain.",
      author: "leya",  ts: "Apr 28" },
    { id: "seed-d2", day: "pre", text: "No second hard work block in the afternoon. Picked rest.",
      author: "kelly", ts: "Apr 28" }
  ],
  seedThreads: [
    { id: "seed-t1", text: "Josh as a real workstream — flag and park, revisit June 1.",
      author: "leya",  due: "Jun 1",  ts: "Apr 28" },
    { id: "seed-t2", text: "Multi-function AI firm — alive or parked? Decide Wed afternoon.",
      author: "kelly", due: "May 6",  ts: "Apr 29" }
  ],
  seedJournal: [
    { id: "seed-j1", author: "leya",  ts: "Apr 30 · morning",
      text: "I keep coming back to the question of what I actually want from this trip beyond the work. Some of it is just being still. Some of it is hearing myself think without seven Slack threads underneath." }
  ],
  seedCommitments: [
    // empty until Wed dinner ritual
  ]
};

window.TRIP = TRIP;
