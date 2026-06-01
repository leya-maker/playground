/* LPM Major Gifts Portfolio Management — Internal Playbook
   Interactions: scrollspy, search, reading progress, diagnostic
   checklist (persisted), composition checker, mobile menu, print. */
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
    // filter nav by section text match
    var firstHitSection = null;
    sections.forEach(function (sec) {
      var match = sec.textContent.toLowerCase().indexOf(term) !== -1
        || (sec.getAttribute("data-title") || "").toLowerCase().indexOf(term) !== -1;
      var link = linkById[sec.id];
      if (link) link.classList.toggle("hidden", !match);
      if (match && !firstHitSection) firstHitSection = sec;
    });
    // highlight first occurrence and scroll to it
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

  /* ---------- Diagnostic checklist (persisted) ---------- */
  var KEY = "lpm-mgpm-diagnostic-v1";
  var checks = $$("#diagTool .check");
  var diagFill = $("#diagFill"), diagCount = $("#diagCount"), diagReset = $("#diagReset");
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { state = {}; }

  function paintDiag() {
    var done = 0;
    checks.forEach(function (c, i) {
      var on = !!state[i];
      c.classList.toggle("done", on);
      if (on) done++;
    });
    var pct = checks.length ? (done / checks.length) * 100 : 0;
    if (diagFill) diagFill.style.width = pct + "%";
    if (diagCount) diagCount.textContent = done + " / " + checks.length + " covered";
  }
  checks.forEach(function (c, i) {
    c.addEventListener("click", function (e) {
      e.preventDefault();
      state[i] = !state[i];
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e2) {}
      paintDiag();
    });
  });
  if (diagReset) diagReset.addEventListener("click", function () {
    state = {};
    try { localStorage.removeItem(KEY); } catch (e) {}
    paintDiag();
  });
  paintDiag();

  /* ---------- Composition checker ---------- */
  var range = $("#qualRange");
  var segCult = $("#segCult"), segStew = $("#segStew"), segQual = $("#segQual");
  var vCult = $("#vCult"), vStew = $("#vStew"), vQual = $("#vQual"), qualPct = $("#qualPct");
  var guidance = $("#compGuidance");

  function paintComp() {
    var q = parseInt(range.value, 10);          // qualification %
    var rest = 100 - q;
    var cult = Math.round(rest * 0.5);
    var stew = rest - cult;                       // keeps total at 100
    segQual.style.width = q + "%";
    segCult.style.width = cult + "%";
    segStew.style.width = stew + "%";
    vCult.textContent = cult + "%";
    vStew.textContent = stew + "%";
    vQual.textContent = q + "%";
    qualPct.textContent = q + "%";
    // hide labels on very small segments
    segCult.querySelector("span").style.opacity = cult < 14 ? 0 : 1;
    segStew.querySelector("span").style.opacity = stew < 14 ? 0 : 1;
    segQual.querySelector("span").style.opacity = q < 14 ? 0 : 1;

    if (q > 50) {
      guidance.classList.add("warn");
      guidance.innerHTML = "<b>Over half in qualification.</b> The next move is to deepen those relationships and advance them into active cultivation. Qualification is the on-ramp, not the destination.";
    } else if (q >= 28 && q <= 40) {
      guidance.classList.remove("warn");
      guidance.innerHTML = "<b>Balanced.</b> This portfolio sits close to the one-third benchmark: roughly a third in active cultivation or solicitation, a third in stewardship, a third in qualification.";
    } else if (q < 28) {
      guidance.classList.remove("warn");
      guidance.innerHTML = "<b>Light on qualification.</b> The portfolio leans toward existing relationships. Keep new prospects flowing in from the research engine so the pipeline does not thin out.";
    } else {
      guidance.classList.remove("warn");
      guidance.innerHTML = "<b>Qualification-heavy, but workable.</b> Approaching half the portfolio. Prioritize advancing the strongest prospects into active cultivation.";
    }
  }
  if (range) { range.addEventListener("input", paintComp); paintComp(); }

  /* ---------- Print ---------- */
  var printBtn = $("#printBtn");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  /* ---------- Init ---------- */
  onScroll(); spy();
  // honor an incoming hash on load
  if (location.hash) {
    var el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(function () { window.scrollTo({ top: el.offsetTop - 64 }); }, 60);
  }
})();
