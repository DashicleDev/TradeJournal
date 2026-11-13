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
let hSel = {}; // 4H pros: field -> "for"
/* ---------- setup grades: rules per weekly phase (Grading tab) ---------- */
// For the trade's phase:  C = a requirement isn't "with" you, or a red-flag item is marked "against"
//                         A = at least `min` extras are "with" you · B = otherwise.
// "Inner structure: at most B" turns an A on an inner structure into a B; the same per 4H entry type.
const GR_CRIT = [
  ["ms", "Weekly MS"],
  ["trend", "Market trend"],
  ["fibc", "FC"],
  ["fiba", "Fib active"],
  ["ic", "IC"],
  ["pattern", "Weekly pattern"],
  ["dPat", "Daily pattern"],
  ["whl", "High / Low"],
  ["sd", "S&D zone"],
  ["pz", "Proven zone"],
  ["lcc", "Last CC"],
  ["ec", "Weekly engulfing candle"],
  ["dMs", "Daily MS"],
  ["hMs", "4H MS"],
  ["chan", "4H channel"],
  ["d:fc", "Daily FC"],
  ["d:dcc", "Daily last CC"],
  ["d:sd", "Daily S&D zone"],
];
// Groups for the pick lists in the grade rules editor
const GR_GROUPS = [
  ["Weekly", ["ms", "trend", "fibc", "fiba", "ic", "pattern", "whl", "sd", "pz", "lcc", "ec"]],
  ["Daily", ["dPat", "dMs", "d:fc", "d:dcc", "d:sd"]],
  ["4H", ["hMs", "chan"]],
];
// criteria a trade can have marked "against"; the other weekly criteria are pros only (in 222 trades the
// rest were almost never logged as a con). Also in plan.json, so the extension offers the same cons.
const GR_AGAINST = ["ms", "trend", "fiba", "lcc", "dPat", "dMs", "hMs"];
const GR_CAN_AGAINST = new Set(GR_AGAINST);
// nothing set by default: everyone builds their own rules (empty extras = never A, so all B)
const GR_DEF = {
  1: { req: [], extras: [], min: 1, flags: [], inner: "", ent: {}, setup: {} },
  2: { req: [], extras: [], min: 1, flags: [], inner: "", ent: {}, setup: {} },
  3: { req: [], extras: [], min: 1, flags: [], inner: "", ent: {}, setup: {} },
  4: { req: [], extras: [], min: 1, flags: [], inner: "", ent: {}, setup: {} },
};
const GR_KEYS = new Set(GR_CRIT.map(c => c[0]));
// grade limits on the setup itself (the inner structure is stored separately as inner)
const GR_SETUP = [
  ["outer", "Outer structure", t => t.wStruct === "outer"],
  ["wd4h", "Weekly - Daily - 4H setup", t => !!t.concept && t.concept !== "Weekly - 4H"],
  ["w4h", "Weekly - 4H setup", t => t.concept === "Weekly - 4H"],
];
const grNorm = r => {
  const out = {};
  for (const ph of ["1", "2", "3", "4"]) {
    const d = GR_DEF[ph],
      x = (r && r[ph]) || {},
      list = (v, def) => (Array.isArray(v) ? v.filter(k => GR_KEYS.has(k)) : [...def]);
    out[ph] = {
      req: list(x.req, d.req),
      extras: list(x.extras, d.extras),
      flags: list(x.flags, d.flags).filter(k => GR_CAN_AGAINST.has(k)),
      min: Number.isFinite(+x.min) && +x.min >= 0 ? Math.round(+x.min) : d.min,
      inner: ["", "b", "x"].includes(x.inner) ? x.inner : x.innerB === true ? "b" : d.inner,
      // per 4H entry type: "" same rules · "b" at most B · "x" not valid (C)
      ent: Object.fromEntries(
        PLAN.entries.map(e => {
          const v = (x.ent || d.ent || {})[e];
          return [e, v === "b" || v === "x" ? v : ""];
        })
      ),
      // outer structure and setup type, same values as ent
      setup: Object.fromEntries(
        GR_SETUP.map(([k]) => {
          const v = (x.setup || d.setup || {})[k];
          return [k, v === "b" || v === "x" ? v : ""];
        })
      ),
    };
  }
  return out;
};
let GR = grNorm(null);
const dProsOf = t => (Array.isArray(t.dPros) ? t.dPros : t.dailyFib === "ja" ? ["fc"] : []);
const grLab = k => (GR_CRIT.find(c => c[0] === k) || [k, k])[1];
// "for" / "against" / "" for one criterion of a trade
// Daily pattern: every trade concept except "Weekly - 4H" is a pattern on the daily.
const critV = (t, k) =>
  k === "dPat"
    ? t.concept
      ? t.concept === "Weekly - 4H"
        ? "against"
        : "for"
      : ""
    : k === "chan"
      ? t.channel && chanOk(t.entry4h)
        ? "for"
        : ""
      : k === "dMs"
        ? t.dMs || ""
        : k === "hMs"
          ? t.hMs || ""
          : k.startsWith("d:")
            ? dProsOf(t).includes(k.slice(2))
              ? "for"
              : ""
            : (t.weekly || {})[k] || "";
// { g: "A" | "B" | "C", why } — C = outside your rules: a requirement missing or something marked against or null when grades are off or the trade has no phase / analysis
function gradeOf(t, rules) {
  if (!feat("grade")) return null;
  const P = (rules || GR)[String(t.fase || "")];
  if (!P) return null;
  if (!Object.keys(t.weekly || {}).length && !t.dMs && !t.hMs && !dProsOf(t).length) return null;
  // the limits this trade hits: [label, "b" | "x"]
  const lim = [
    ...(t.wStruct === "inner" && P.inner ? [["Inner structure", P.inner]] : []),
    ...GR_SETUP.filter(([k, , hit]) => (P.setup || {})[k] && hit(t)).map(([k, l]) => [l, P.setup[k]]),
    ...((P.ent || {})[t.entry4h] ? [[t.entry4h + " entry", P.ent[t.entry4h]]] : []),
  ];
  const notValid = lim.find(([, v]) => v === "x");
  if (notValid) return { g: "C", why: notValid[0] + " not valid in phase " + t.fase };
  const miss = P.req.filter(k => critV(t, k) !== "for");
  if (miss.length) return { g: "C", why: "Missing: " + miss.map(grLab).join(", ") };
  const ag = P.flags.filter(k => critV(t, k) === "against");
  if (ag.length) return { g: "C", why: "Against: " + ag.map(grLab).join(", ") };
  const ex = P.extras.filter(k => critV(t, k) === "for");
  if (ex.length >= P.min && P.min > 0) {
    if (lim.length) return { g: "B", why: lim[0][0] + ": at most B" };
    return { g: "A", why: ex.map(grLab).join(", ") };
  }
  return { g: "B", why: ex.length ? ex.map(grLab).join(", ") : "No extras" };
}
const tGrade = t => {
  const x = gradeOf(t);
  return x ? x.g : null;
};
const GRADES = ["A", "B", "C"];
// why a C: "missing" (a requirement or inner structure not valid in the phase) or "against" (a red flag)
const gradeWhy = t => {
  const x = gradeOf(t);
  return !x || x.g !== "C" ? null : /^Against/.test(x.why) ? "against" : "missing";
};
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
