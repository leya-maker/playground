/* LPM Moves Management Framework — companion playbook
   Interactions: scrollspy, search, reading progress, weekly-review
   checklist (persisted), engagement gauge, mobile menu, print.
   Mirrors handbook.js so both documents behave identically. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Mobile menu ---------- */
  var app = $("#app"), menuBtn = $("#menuBtn"), scrim = $("#scrim");
  function closeNav() { app.classList.remove("nav-open"); }
  if (menuBtn) menuBtn.addEventListener("click", function () { app.classList.toggle("nav-open"); });
  if (scrim) scrim.addEventListener("click", closeNav);

  /* ---------- Reading progress ---------- */
  var fill = $("#progress");
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
    if (fill) fill.style.width = (Math.max(0, Math.min(1, p)) * 100) + "%";
  }

  /* ---------- Scrollspy ---------- */
  var sections = $$("section.doc");
  var links = $$("#nav a");
  var crumb = $("#crumbHere");
  var linkById = {};
  links.forEach(function (a) { linkById[a.getAttribute("href").slice(1)] = a; });

  function spy() {
    var pos = window.scrollY + 120;
    var current = sections[0];
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= pos) current = sections[i];
    }
    if (!current) return;
    var id = current.id;
    links.forEach(function (a) { a.classList.toggle("active", a === linkById[id]); });
    if (crumb) crumb.textContent = current.getAttribute("data-title") || "";
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(function () { onScroll(); spy(); ticking = false; }); ticking = true; }
  }, { passive: true });

  // smooth-scroll on nav click + close mobile drawer
  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        window.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
        history.replaceState(null, "", "#" + id);
        closeNav();
      }
    });
  });

  /* ---------- Search ---------- */
  var search = $("#search");
  function clearHits() {
    $$("mark.hit").forEach(function (m) {
      var t = document.createTextNode(m.textContent);
      m.parentNode.replaceChild(t, m);
      t.parentNode.normalize();
    });
  }
  function highlightIn(node, term) {
    if (node.nodeType === 3) {
      var idx = node.nodeValue.toLowerCase().indexOf(term);
      if (idx === -1) return null;
      var after = node.splitText(idx);
      after.splitText(term.length);
      var mark = document.createElement("mark");
      mark.className = "hit";
      mark.textContent = after.nodeValue;
      after.parentNode.replaceChild(mark, after);
      return mark;
    }
    if (node.nodeType === 1 && node.childNodes && !/^(SCRIPT|STYLE|MARK|INPUT)$/.test(node.tagName)) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var r = highlightIn(node.childNodes[i], term);
        if (r) return r;
      }
    }
    return null;
  }
  function runSearch() {
    var term = search.value.trim().toLowerCase();
    clearHits();
    if (term.length < 2) {
      links.forEach(function (a) { a.classList.remove("hidden"); });
      return;
    }
    var reader = $("#reader");
    var firstHitSection = null;
    sections.forEach(function (sec) {
      var match = sec.textContent.toLowerCase().indexOf(term) !== -1
        || (sec.getAttribute("data-title") || "").toLowerCase().indexOf(term) !== -1;
      var link = linkById[sec.id];
      if (link) link.classList.toggle("hidden", !match);
      if (match && !firstHitSection) firstHitSection = sec;
    });
    var mark = highlightIn(reader, term);
    if (mark) {
      var sec = mark.closest("section.doc") || firstHitSection;
      if (sec) window.scrollTo({ top: sec.offsetTop - 64, behavior: "smooth" });
    } else if (firstHitSection) {
      window.scrollTo({ top: firstHitSection.offsetTop - 64, behavior: "smooth" });
    }
  }
  if (search) {
    var t;
    search.addEventListener("input", function () { clearTimeout(t); t = setTimeout(runSearch, 180); });
    search.addEventListener("keydown", function (e) { if (e.key === "Escape") { search.value = ""; runSearch(); search.blur(); } });
  }

  /* ---------- Weekly-review checklist (persisted) ---------- */
  var KEY = "lpm-mmf-weekly-v1";
  var checks = $$("#weeklyTool .check");
  var wkFill = $("#wkFill"), wkCount = $("#wkCount"), wkReset = $("#wkReset");
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { state = {}; }

  function paintWeekly() {
    var done = 0;
    checks.forEach(function (c, i) {
      var on = !!state[i];
      c.classList.toggle("done", on);
      if (on) done++;
    });
    var pct = checks.length ? (done / checks.length) * 100 : 0;
    if (wkFill) wkFill.style.width = pct + "%";
    if (wkCount) wkCount.textContent = done + " / " + checks.length + " answered";
  }
  checks.forEach(function (c, i) {
    c.addEventListener("click", function (e) {
      e.preventDefault();
      state[i] = !state[i];
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e2) {}
      paintWeekly();
    });
  });
  if (wkReset) wkReset.addEventListener("click", function () {
    state = {};
    try { localStorage.removeItem(KEY); } catch (e) {}
    paintWeekly();
  });
  paintWeekly();

  /* ---------- Engagement gauge ---------- */
  var range = $("#daysRange");
  var gBig = $("#daysBig"), gTrack = $("#gTrack"), gFill = $("#gFill"), gGuide = $("#gGuide");
  var MAXD = 180; // scale max; the 90-day floor sits at the midpoint

  function paintGauge() {
    var d = parseInt(range.value, 10);
    var pct = Math.max(0, Math.min(100, (d / MAXD) * 100));
    gBig.textContent = d;
    gFill.style.width = pct + "%";
    var flagged = d >= 90;
    gTrack.classList.toggle("flag", flagged);
    if (flagged) {
      gGuide.classList.add("warn");
      gGuide.innerHTML = "<b>Flagged for immediate re-engagement.</b> Any donor not contacted in 90 or more days has dropped below the floor. A relationship that goes this long with no documented next step drifts. Schedule a qualifying contact now.";
    } else {
      gGuide.classList.remove("warn");
      gGuide.innerHTML = "<b>Within the floor.</b> Every portfolio donor gets a qualifying contact at least once per quarter. Keep a documented next step on the record so the relationship never stalls.";
    }
  }
  if (range) { range.addEventListener("input", paintGauge); paintGauge(); }

  /* ---------- Copy agenda template ---------- */
  var agendaCopy = $("#agendaCopy"), agendaSource = $("#agendaSource");
  if (agendaCopy && agendaSource) {
    var copyLabel = agendaCopy.querySelector("span");
    var revert;
    agendaCopy.addEventListener("click", function () {
      var text = agendaSource.textContent;
      function ok() {
        agendaCopy.classList.add("copied");
        if (copyLabel) copyLabel.textContent = "Copied";
        clearTimeout(revert);
        revert = setTimeout(function () {
          agendaCopy.classList.remove("copied");
          if (copyLabel) copyLabel.textContent = "Copy";
        }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { fallbackCopy(text, ok); });
      } else {
        fallbackCopy(text, ok);
      }
    });
  }
  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (e) {}
  }

  /* ---------- Print ---------- */
  var printBtn = $("#printBtn");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  /* ---------- Init ---------- */
  onScroll(); spy();
  if (location.hash) {
    var el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(function () { window.scrollTo({ top: el.offsetTop - 64 }); }, 60);
  }
})();
