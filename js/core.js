/*
 * core.js — Shared basics: the trading plan (concepts, entries, exits), formatting and small DOM helpers.
 * Loaded first; every other file uses these.
 */
const APP_VERSION = "1.3.40";
const PLAN = {
  concepts: {
    Continuation: ["First Structure", "100 level", "Fake Out", "New Action"],
    Reversal: ["S1 in 61.80% zone", "IC als S1 zone", "V-shape", "Push IC Push"],
    "Pattern in Pattern": ["Continuation", "Reversal"],
    "Daily Retrace": ["—"],
    "Push IC Push": ["Scenario 1", "Scenario 2"],
    "Weekly - 4H": ["Line Zone", "Liquidity Zone"],
  },
  faseConcepts: {
    1: ["Reversal", "Continuation", "Pattern in Pattern", "Push IC Push"],
    2: ["Reversal", "Continuation", "Pattern in Pattern", "Push IC Push", "Weekly - 4H", "Daily Retrace"],
    3: ["Reversal", "Continuation", "Pattern in Pattern", "Push IC Push", "Weekly - 4H", "Daily Retrace"],
    4: ["Continuation", "Pattern in Pattern", "Push IC Push"],
  },
  entries: ["Reversal", "Continuation", "Deceleration", "Engulfing Candle"],
  exits: [
    "Take profit",
    "Stop loss",
    "Break-even",
    "Trailing stop",
    "Closed for news",
    "Closed manually",
    "Invalid, cancelled",
  ],
};
const METHOD = { blind: "Bar replay, blind", replay: "Bar replay", scroll: "Chart scroll" };
const $ = s => document.querySelector(s);
const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
const fmtR = v =>
  v == null || isNaN(v) ? "—" : (v > 0 ? "+" : "") + (market === "stocks" ? v.toFixed(1) + "%" : v.toFixed(2) + "R");
const stLbl = h =>
  market !== "stocks"
    ? h
    : h
        .replace(/Average and total R\b/g, "Average and total ROI")
        .replace(/Average R\b/g, "Average ROI")
        .replace(/Avg R\b/g, "Avg ROI")
        .replace(/Total R\b/g, "Total ROI")
        .replace(/Cumulative R\b/g, "Cumulative ROI")
        .replace(/the R realised/g, "the ROI realised")
        .replace(/Avg return\b/g, "Avg ROI")
        .replace(/Total return\b/g, "Total ROI")
        .replace(/Start · 0R/g, "Start · 0%")
        .replace(/R per period/g, "ROI per period")
        .replace(/>R</g, ">ROI<")
        .replace(/ At 1% risk, 1R is about 1% of your account\./g, "");
const fmtP = v => (v == null || isNaN(v) || !isFinite(v) ? "—" : Math.round(v * 100) + "%");
// chart links are shown as clickable links, so keep only https ones (never javascript: and the like)
// market trend is picked as Bullish / Bearish / Ranging; grades and stats keep it as with/against the trade (weekly.trend) + wRange
const trendAbs = t => {
  const r = (t.weekly || {}).trend;
  if (t.wRange || r === "range") return "range";
  return r && t.dir ? ((r === "for") === (t.dir === "long") ? "bull" : "bear") : "";
};
const trendRel = (a, dir) => ((a === "bull" || a === "bear") && dir ? ((a === "bull") === (dir === "long") ? "for" : "against") : "");
const TREND_LAB = { bull: "↑ Bullish", bear: "↓ Bearish", range: "↔ Ranging" };
// 4H pros: Channel goes with Reversal, Continuation and Engulfing entries; the Engulfing candle pro goes with Reversal, Continuation and Deceleration; Room goes with SoM, Engulfing and Deceleration entries
const chanOk = e => e === "Reversal" || e === "Continuation" || e === "Engulfing Candle";
const engOk = e => e === "Reversal" || e === "Continuation" || e === "Deceleration";
const roomOk = (e, s) => s === "som" || e === "Engulfing Candle" || e === "Deceleration";
// the 4H pros, keyed by the trade field each one is saved in; hproOk: does the pro fit this entry (and structure)
const HPROS = [
  ["engulf", "Engulfing candle"],
  ["channel", "Channel"],
  ["room", "Room"],
];
const hproOk = (k, e, s) => (k === "engulf" ? engOk(e) : k === "channel" ? chanOk(e) : roomOk(e, s));
// 4H entry dropdown: Reversal and Continuation come with BoS or SoM; a trade still saves entry4h and struct as two fields
const ENTRY_OPTS = [
  ["Reversal|bos", "Reversal with BoS"],
  ["Reversal|som", "Reversal with SoM"],
  ["Continuation|bos", "Continuation with BoS"],
  ["Continuation|som", "Continuation with SoM"],
  ["Engulfing Candle", "Engulfing candle"],
  ["Deceleration", "Deceleration"],
];
const entryKey = (e, s) => (e || "") + (e && s ? "|" + s : "");
const entrySplit = v => {
  const [entry4h, struct] = String(v || "").split("|");
  return { entry4h, struct: struct || "" };
};
// a saved trade whose entry isn't one of the six (no BoS/SoM logged, Pattern in Pattern) still shows what it was
const entryOpts = k =>
  !k || ENTRY_OPTS.some(o => o[0] === k)
    ? ENTRY_OPTS
    : [...ENTRY_OPTS, [k, k.replace("|bos", " with BoS").replace("|som", " with SoM")]];
const entryOptHtml = k =>
  `<option value="">Choose…</option>${entryOpts(k).map(([v, l]) => `<option value="${esc(v)}"${v === k ? " selected" : ""}>${esc(l)}</option>`).join("")}`;
// The pair's 4H OANDA chart on TradingView; the extension reads #tj-replay and starts bar replay at the trade's close date (else its date)
const tvReplayUrl = t => {
  const p = String((t && t.pair) || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  // replay jumps to 00:00 UTC of the date: the close date jumps to the day after, so the whole close day shows;
  // the open date stays at its start, so the entry isn't shown yet
  const close = /^\d{4}-\d{2}-\d{2}$/.test(t.closeDate || "") ? new Date(Date.parse(t.closeDate + "T00:00:00Z") + 864e5) : null,
    day = close ? close.toISOString().slice(0, 10) : t.date;
  // &tj-trade: the extension (1.4.22+) also opens the trade in its panel for editing
  const id = /^[A-Za-z0-9_-]{1,40}$/.test(t.id || "") ? `&tj-trade=${t.id}` : "";
  return p && day ? `https://www.tradingview.com/chart/?symbol=OANDA:${p}&interval=240#tj-replay=${day}${id}` : "";
};
const tvReplayBtn = t =>
  tvReplayUrl(t)
    ? `<a class="btn small ghost tvrp" href="${esc(tvReplayUrl(t))}" target="_blank" rel="noopener" title="Open the 4H chart on TradingView; with the extension, bar replay starts at the trade's date">Replay ↗</a>`
    : "";
// Replay opens a chart window of its own (the next Replay reuses it). The extension's panel there loads the trade from the
// address and the window closes when you save it. This goes first, so no extension script has to catch the click.
// While that window is open the journal is locked; closing it unlocks again.
function replayLock(win) {
  const o = document.createElement("div");
  o.className = "rplock";
  o.innerHTML = `<div class="rpbox"><b>Replay window is open</b><p>The trade is being edited there. This unlocks when you close that window.</p><div class="row" style="gap:8px"><button type="button" class="btn small" data-rpshow>Show window</button><button type="button" class="btn small ghost" data-rpoff>Unlock</button></div></div>`;
  const off = () => {
    clearInterval(iv);
    o.remove();
    document.body.inert = false;
    const t = typeof editingId !== "undefined" && docs.find(x => x.id === editingId);
    if (t) f2Remote(t); // an open form shows what was saved in the window
  };
  const iv = setInterval(() => win.closed && off(), 500);
  o.addEventListener("keydown", e => e.stopPropagation());
  o.onclick = e => {
    const b = e.target.closest("button");
    if (b && "rpshow" in b.dataset) win.focus();
    if (b && "rpoff" in b.dataset) off();
  };
  document.documentElement.appendChild(o);
  document.body.inert = true;
  o.querySelector("button").focus();
}
addEventListener(
  "click",
  e => {
    const a = e.target.closest && e.target.closest('a[href*="#tj-replay="]');
    if (!a || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const inForm = a.id === "f2Replay";
    if (inForm && !$("#tradeForm2").reportValidity()) return;
    const w = Math.min(1400, screen.availWidth),
      h = Math.min(900, screen.availHeight),
      // opened now (inside the click), pointed at the chart once the form is saved
      win = window.open("", "tjreplay", `popup=yes,width=${w},height=${h},left=${(screen.availWidth - w) / 2},top=${(screen.availHeight - h) / 2}`);
    if (!win) return void window.open(a.href, "_blank"); // pop-ups blocked: a normal tab
    win.focus();
    replayLock(win);
    (async () => {
      // a trade open in the form: save what's in it first, so the extension starts from your changes
      if (inForm) await f2Submit(true).catch(() => {});
      win.location.href = (inForm && tvReplayUrl(docs.find(x => x.id === editingId))) || a.href;
    })();
  },
  true
);
const httpsOnly = u => (/^https:\/\//i.test(u || "") ? u : "");
const httpsLinks = o => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => httpsOnly(v)));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
/* ---------- small DOM helpers ---------- */
function seg(id, name, opts) {
  $("#" + id).innerHTML = opts
    .map(
      ([v, l]) =>
        `<label class="seg"><input type="radio" name="${name}" id="${name}-${v}" value="${v}"><span>${l}</span></label>`
    )
    .join("");
}
const radio = n => document.querySelector(`input[name="${n}"]:checked`)?.value || "";
const setRadio = (n, v) => {
  document.querySelectorAll(`input[name="${n}"]`).forEach(i => (i.checked = i.value === String(v ?? "")));
};
const num = id => {
  const v = $("#" + id).value;
  return v === "" ? null : Number(v);
};
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove("on"), 2200);
}
