/*
 * plan.js — Plan logic: weekly/daily criteria, setup score and A/B/C grade, R and pip maths.
 */
/* ---------- plan logic ---------- */
const DCRIT = [
  ["fc", "FC"],
  ["dcc", "Last CC"],
  ["sd", "S&D zone"],
];
let dSel = {};
const SW_DEF = {
  msr: [0, 0],
  ms: [2, -2],
  trend: [2, -2],
  fibc: [1, -1],
  fiba: [1, -1],
  ic: [1, -1],
  pattern: [1, -1],
  whl: [1, -1],
  sd: [1, -1],
  pz: [1, -1],
  lcc: [1, -1],
  dMs: [1, 0],
  hMs: [1, 0],
  "d:fc": [1, 0],
  "d:dcc": [1, 0],
  "d:sd": [1, 0],
  outer: [1, 0],
  inner: [0, 0],
};
let SW = { ...SW_DEF };
const swv = (k, v) => {
  const w = SW[k] || [1, -1];
  return v === "for" ? +w[0] || 0 : v === "against" ? +w[1] || 0 : 0;
};
const msV = v => (v === "for" ? 1 : v === "against" ? -1 : 0);
const tScore = t => {
  if (!feat("grade")) return null;
  const w = t.weekly || {},
    dp = dProsOf(t);
  if (!Object.keys(w).length && !t.dMs && !t.hMs && !dp.length && !t.wStruct) return null;
  const r =
    Object.entries(w).reduce(
      (a, [k, v]) =>
        a +
        (k === "ms" && v === "against" && (t.wRange || w.trend === "range") ? +(SW.msr || [0, 0])[1] || 0 : swv(k, v)),
      0
    ) +
    swv("dMs", t.dMs) +
    swv("hMs", t.hMs) +
    dp.reduce((a, k) => a + swv("d:" + k, "for"), 0) +
    (t.wStruct ? swv(t.wStruct, "for") : 0);
  return Math.round(r * 100) / 100;
};
let GRADE = { a: 4, b: 2 };
const tGrade = t => {
  const s = tScore(t);
  return s == null ? null : s >= GRADE.a ? "A" : s >= GRADE.b ? "B" : "C";
};
const dProsOf = t => (Array.isArray(t.dPros) ? t.dPros : t.dailyFib === "ja" ? ["fc"] : []);
function verdict(t) {
  if (!t.entry4h || !t.bos) return { v: "open", txt: "Answer the questions" };
  const rev = t.entry4h === "Reversal";
  if (t.bos === "ja") {
    if (!t.dfs) return { v: "open", txt: "DFS hit?" };
    return t.dfs === "ja" ? { v: "invalid", txt: "Invalid: DFS hit" } : { v: "nemen", txt: "Take" };
  }
  if (rev) {
    if (!t.som) return { v: "open", txt: "SoM?" };
    if (t.som === "nee") return { v: "invalid", txt: "Invalid: no SoM" };
    if (!t.room) return { v: "open", txt: "4H room?" };
    return t.room === "ja"
      ? { v: "nemen", txt: "Take, normal SL rules" }
      : { v: "nemen", txt: "Take, longest wick in SL" };
  }
  if (!t.room) return { v: "open", txt: "4H room?" };
  return t.room === "ja" ? { v: "nemen", txt: "Take" } : { v: "invalid", txt: "Invalid: no 4H room" };
}
function planWarnings(t) {
  const w = [];
  if (t.fase && t.concept && !PLAN.faseConcepts[t.fase].includes(t.concept))
    w.push(`${t.concept} is not in the plan for Phase ${t.fase}.`);
  if (t.status === "taken" && verdict(t).v === "invalid")
    w.push("The checklist says invalid, but you took the trade. Counts as forced.");
  if (t.status === "taken" && t.news === "ja") w.push("Entry within 1 hour of heavy news breaks the news rules.");
  return w;
}
const taken = l => l.filter(t => t.status === "taken" && t.r != null && !isNaN(t.r));
function stats(list) {
  const tk = taken(list),
    n = tk.length;
  const wins = tk.filter(t => t.r > 0),
    losses = tk.filter(t => t.r < 0);
  const sum = a => a.reduce((s, t) => s + t.r, 0);
  const gw = sum(wins),
    gl = Math.abs(sum(losses));
  const slips = tk.filter(t => t.slip != null && !isNaN(t.slip));
  const dec = wins.length + losses.length;
  return {
    n,
    wr: dec ? wins.length / dec : null,
    be: n ? (n - dec) / n : null,
    avg: n ? sum(tk) / n : null,
    total: sum(tk),
    avgWin: wins.length ? gw / wins.length : null,
    avgLoss: losses.length ? -gl / losses.length : null,
    pf: gl ? gw / gl : gw ? Infinity : null,
    slip: slips.length ? slips.reduce((s, t) => s + t.slip, 0) / slips.length : null,
    plan: n ? tk.filter(t => t.onPlan).length / n : null,
    blind: list.length ? list.filter(t => t.blind === "ja").length / list.length : null,
  };
}
const liveTrades = () => trades().filter(t => t.mode === "live");
const btTrades = (p = "all") =>
  trades().filter(
    t => t.mode === "backtest" && (p === "all" || (p === "none" ? !projName(t.project) : t.project === p))
  );
