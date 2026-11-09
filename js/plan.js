/*
 * plan.js — Plan logic: weekly/daily criteria, setup grades (A/B/C/X rules per phase), R and pip maths.
 */
/* ---------- plan logic ---------- */
const DCRIT = [
  ["fc", "FC"],
  ["dcc", "Last CC"],
  ["sd", "S&D zone"],
];
let dSel = {};
/* ---------- setup grades: rules per weekly phase (Settings → Forex → Grade rules) ---------- */
// For the trade's phase:  X = a requirement isn't "with" you · C = a red-flag item is marked "against"
//                         A = at least `min` extras are "with" you · B = otherwise.
// "Inner structure: at most B" turns an A on an inner structure into a B.
const GR_CRIT = [
  ["ms", "Weekly MS"],
  ["trend", "Market trend"],
  ["fibc", "FC"],
  ["fiba", "Fib active"],
  ["ic", "IC"],
  ["pattern", "Pattern"],
  ["whl", "High / Low"],
  ["sd", "S&D zone"],
  ["pz", "Proven zone"],
  ["lcc", "Last CC"],
  ["dMs", "Daily MS"],
  ["hMs", "4H MS"],
  ["d:fc", "Daily FC"],
  ["d:dcc", "Daily last CC"],
  ["d:sd", "Daily S&D zone"],
];
const GR_FLAGS = ["fibc", "fiba", "ic", "pattern", "whl", "sd", "pz", "lcc"];
const GR_DEF = {
  1: { req: [], extras: ["fibc", "lcc", "pz", "sd"], min: 1, flags: GR_FLAGS, inner: "" },
  2: { req: ["ms", "fiba"], extras: ["fibc", "lcc", "pz", "sd"], min: 1, flags: GR_FLAGS, inner: "" },
  3: { req: ["pz"], extras: ["fibc", "lcc", "sd", "whl"], min: 1, flags: GR_FLAGS, inner: "x" },
  4: { req: [], extras: ["fibc", "lcc", "pz", "sd"], min: 1, flags: GR_FLAGS, inner: "" },
};
const GR_KEYS = new Set(GR_CRIT.map(c => c[0]));
const grNorm = r => {
  const out = {};
  for (const ph of ["1", "2", "3", "4"]) {
    const d = GR_DEF[ph],
      x = (r && r[ph]) || {},
      list = (v, def) => (Array.isArray(v) ? v.filter(k => GR_KEYS.has(k)) : [...def]);
    out[ph] = {
      req: list(x.req, d.req),
      extras: list(x.extras, d.extras),
      flags: list(x.flags, d.flags),
      min: Number.isFinite(+x.min) && +x.min >= 0 ? Math.round(+x.min) : d.min,
      inner: ["", "b", "x"].includes(x.inner) ? x.inner : x.innerB === true ? "b" : d.inner,
    };
  }
  return out;
};
let GR = grNorm(null);
const dProsOf = t => (Array.isArray(t.dPros) ? t.dPros : t.dailyFib === "ja" ? ["fc"] : []);
const grLab = k => (GR_CRIT.find(c => c[0] === k) || [k, k])[1];
// "for" / "against" / "" for one criterion of a trade
const critV = (t, k) =>
  k === "dMs"
    ? t.dMs || ""
    : k === "hMs"
      ? t.hMs || ""
      : k.startsWith("d:")
        ? dProsOf(t).includes(k.slice(2))
          ? "for"
          : ""
        : (t.weekly || {})[k] || "";
// { g: "A" | "B" | "C" | "X", why } or null when grades are off or the trade has no phase / analysis
function gradeOf(t, rules) {
  if (!feat("grade")) return null;
  const P = (rules || GR)[String(t.fase || "")];
  if (!P) return null;
  if (!Object.keys(t.weekly || {}).length && !t.dMs && !t.hMs && !dProsOf(t).length) return null;
  if (P.inner === "x" && t.wStruct === "inner") return { g: "X", why: "Inner structure not valid in phase " + t.fase };
  const miss = P.req.filter(k => critV(t, k) !== "for");
  if (miss.length) return { g: "X", why: "Missing: " + miss.map(grLab).join(", ") };
  const ag = P.flags.filter(k => critV(t, k) === "against");
  if (ag.length) return { g: "C", why: "Against: " + ag.map(grLab).join(", ") };
  const ex = P.extras.filter(k => critV(t, k) === "for");
  if (ex.length >= P.min && P.min > 0) {
    if (P.inner === "b" && t.wStruct === "inner") return { g: "B", why: "Inner structure: at most B" };
    return { g: "A", why: ex.map(grLab).join(", ") };
  }
  return { g: "B", why: ex.length ? ex.map(grLab).join(", ") : "No extras" };
}
const tGrade = t => {
  const x = gradeOf(t);
  return x ? x.g : null;
};
const GRADES = ["A", "B", "C", "X"];
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
