/*
 * core.js — Shared basics: the trading plan (concepts, entries, exits), formatting and small DOM helpers.
 * Loaded first; every other file uses these.
 */
const APP_VERSION = "1.1.3";
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
  entries: ["Reversal", "Continuation", "Pattern in Pattern", "Deceleration", "Engulfing Candle"],
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
