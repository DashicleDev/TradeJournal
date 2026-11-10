/*
 * analyze.js — Analyze tab: filters, comparisons, drill-down splits and charts, with separate definitions
 * for forex (R-based) and invest (return-based). Also the journal/backtest desks (KPIs, calendar).
 */
/* ---------- analyze ---------- */
function niceStep(r) {
  const p = Math.pow(10, Math.floor(Math.log10(r || 1)));
  const m = r / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
function equitySVG(lists) {
  const cum = l => {
    let s = 0;
    return taken(l)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map(t => (s += t.r));
  };
  const cs = lists.map(([l, c]) => [cum(l), c]);
  const W = 720,
    H = 240,
    L = 46,
    R = 12,
    T = 14,
    B = 28;
  const n = Math.max(2, ...cs.map(([d]) => d.length));
  const all = [0, ...cs.flatMap(([d]) => d)];
  let lo = Math.min(...all),
    hi = Math.max(...all);
  if (hi - lo < 1) {
    hi += 1;
    lo -= 1;
  }
  const step = niceStep((hi - lo) / 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const x = i => L + (i / (n - 1)) * (W - L - R),
    y = v => T + ((hi - v) / (hi - lo)) * (H - T - B);
  let g = "";
  for (let v = lo; v <= hi + 1e-9; v += step) {
    g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" ${Math.abs(v) < 1e-9 ? 'stroke-width="1.5"' : ""}/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v > 0 ? "+" : ""}${+v.toFixed(1)}R</text>`;
  }
  const path = (d, c) =>
    d.length
      ? `<polyline fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" points="${[[0, 0], ...d.map((v, i) => [i + 1, v])].map(([i, v]) => `${x((i * (n - 1)) / Math.max(d.length, 1))},${y(v)}`).join(" ")}"/><circle cx="${x(n - 1)}" cy="${y(d[d.length - 1])}" r="4" fill="${c}" stroke="var(--surface)" stroke-width="2"/>`
      : "";
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Cumulative R per set, each scaled to full width">${g}<text x="${L}" y="${H - 8}">start</text><text x="${W - R}" y="${H - 8}" text-anchor="end">latest</text>${cs.map(([d, c]) => path(d, c)).join("")}</svg>`;
}
function findings(bt, lv, S, T) {
  const f = [];
  if (!T.n) {
    f.push([
      "warn",
      "No live trades yet",
      "Log your live trades with the same fields as your backtest. Only then can the gap be measured.",
    ]);
    return f;
  }
  if (T.n < 30)
    f.push([
      "warn",
      `Only ${T.n} live trades`,
      "Below 30 to 50 trades, a normal losing streak can look like a broken system. Read the numbers as direction, not proof.",
    ]);
  if (S.n && S.wr != null && T.wr != null) {
    const d = (S.wr - T.wr) * 100;
    if (d > 10)
      f.push([
        "bad",
        `Live win rate ${Math.round(d)} points lower`,
        "This usually points to hindsight in the backtest (phase or concept picked after the fact) or to selection. Split by phase or concept below to find where.",
      ]);
    else if (S.avgWin && T.avgWin && T.avgWin < S.avgWin * 0.75)
      f.push([
        "bad",
        "Same win rate, smaller winners",
        `Average win ${fmtR(T.avgWin)} live versus ${fmtR(S.avgWin)} in backtest. That is management or execution: closing early, BE too soon, trailing too tight.`,
      ]);
  }
  if (S.avgLoss && T.avgLoss && T.avgLoss < S.avgLoss * 1.15)
    f.push([
      "bad",
      "Losers bigger than in backtest",
      `Average loss ${fmtR(T.avgLoss)} versus ${fmtR(S.avgLoss)}. Check slippage and whether you ever widen your SL.`,
    ]);
  const tk = taken(lv),
    on = tk.filter(t => t.onPlan),
    off = tk.filter(t => !t.onPlan);
  if (off.length) {
    const a = on.length ? on.reduce((s, t) => s + t.r, 0) / on.length : null,
      b = off.reduce((s, t) => s + t.r, 0) / off.length;
    f.push([
      b < (a ?? 0) ? "bad" : "warn",
      `${off.length} live trades not according to plan`,
      `Average ${fmtR(b)} on trades not according to plan${a != null ? `, ${fmtR(a)} on trades according to plan` : ""}.`,
    ]);
  }
  const bad = tk.filter(t => t.fase && t.concept && !PLAN.faseConcepts[t.fase].includes(t.concept));
  if (bad.length)
    f.push([
      "warn",
      `${bad.length} trades with a concept outside the phase`,
      `Combined ${fmtR(bad.reduce((s, t) => s + t.r, 0))}.`,
    ]);
  if (T.slip != null && T.slip > 0.5)
    f.push([
      "warn",
      `Average ${T.slip.toFixed(1)} pips slippage live`,
      "With a 10 to 20 pip SL, that eats a big part of your R. Include it in your backtest.",
    ]);
  const missed = lv.filter(t => t.status === "missed");
  if (missed.length) {
    const r = taken(missed.map(t => ({ ...t, status: "taken" })));
    f.push([
      "warn",
      `${missed.length} missed live setups`,
      r.length
        ? `Hypothetically ${fmtR(r.reduce((s, t) => s + t.r, 0))} left on the table.`
        : "Fill in the hypothetical R to see what this costs.",
    ]);
  }
  if (f.length === (T.n < 30 ? 1 : 0))
    f.push(["good", "No clear leak found", "Backtest and live are close on the measured points. Keep logging."]);
  return f;
}
const WLAB = k =>
  ({
    ms: "Market structure",
    trend: "Market trend",
    fibc: "FC",
    fiba: "Fib active",
    ic: "IC",
    pattern: "Pattern",
    whl: "High / Low",
    sd: "S&D zone",
    lcc: "Last CC",
    pz: "Proven zone",
    ec: "Engulfing candle",
  })[k] || k;
const WKEYS = ["ms", "trend", "fibc", "fiba", "ic", "pattern", "whl", "sd", "pz", "lcc", "ec"];
const hasStruct = e => e === "Reversal" || e === "Continuation" || e === "Pattern in Pattern";
const structOf = t => t.struct || (t.bos === "ja" ? "bos" : t.bos === "nee" && hasStruct(t.entry4h) ? "som" : "");
const rrOf = t => (t.slPips > 0 && t.tpPips != null ? t.tpPips / t.slPips : null);
const daysOpen = t => (t.date && t.closeDate ? Math.round((new Date(t.closeDate) - new Date(t.date)) / 864e5) : null);
const bucket = (v, edges, labels) => {
  if (v == null || isNaN(v)) return null;
  for (let i = 0; i < edges.length; i++) if (v < edges[i]) return labels[i];
  return labels[labels.length - 1];
};
let SPLITS = {
  fase: ["Weekly phase", t => (t.fase ? "Phase " + t.fase : null), ["Phase 1", "Phase 2", "Phase 3", "Phase 4"]],
  wpat: ["Weekly pattern", t => t.wPat || null, ["Continuation", "Reversal", "Pattern in Pattern"]],
  wpatsub: ["Weekly pattern variant", t => (t.wPat && t.wPatSub ? t.wPat + " · " + t.wPatSub : null)],
  wstruct: [
    "Weekly structure",
    t => (t.wStruct === "inner" ? "Inner" : t.wStruct === "outer" ? "Outer" : null),
    ["Inner", "Outer"],
  ],
  wtrend: [
    "Market trend",
    t => ({ for: "With", against: "Against" })[(t.weekly || {}).trend] || null,
    ["With", "Against"],
  ],
  wrange: [
    "Ranging",
    t => (t.wRange || (t.weekly || {}).trend === "range" ? "Ranging" : "Not ranging"),
    ["Ranging", "Not ranging"],
  ],
  wms: [
    "Weekly market structure",
    t => {
      const v = (t.weekly || {}).ms;
      return v === "for" ? "With" : v === "against" ? "Against" : null;
    },
    ["With", "Against"],
  ],
  dpro: [
    "Daily pros (each pro)",
    t => dProsOf(t).map(k => (DCRIT.find(c => c[0] === k) || [, k])[1]),
    DCRIT.map(c => c[1]),
  ],
  wpro: [
    "Weekly pros (each pro)",
    t =>
      Object.entries(t.weekly || {})
        .filter(([k, v]) => v === "for" && k !== "ms")
        .map(([k]) => WLAB(k)),
    WKEYS.filter(k => k !== "ms").map(WLAB),
  ],
  wcon: [
    "Weekly cons (each con)",
    t =>
      Object.entries(t.weekly || {})
        .filter(([k, v]) => v === "against" && k !== "ms")
        .map(([k]) => WLAB(k)),
    WKEYS.filter(k => k !== "ms").map(WLAB),
  ],
  grade: ["Setup grade", t => tGrade(t), GRADES],
  wscore: [
    "Weekly score (pros − cons)",
    t => {
      const v = wcScore(t.weekly);
      return t.weekly && Object.keys(t.weekly).length ? (v > 0 ? "+" : "") + v : null;
    },
  ],
  align: [
    "Structure alignment (W · D · 4H)",
    t => {
      const v = [(t.weekly || {}).ms, t.dMs, t.hMs].filter(Boolean);
      return v.length ? `${v.filter(x => x === "for").length}/${v.length} with` : null;
    },
    ["3/3 with", "2/3 with", "1/3 with", "0/3 with", "2/2 with", "1/2 with", "0/2 with", "1/1 with", "0/1 with"],
  ],
  scale: ["Scale-in", t => (t.scaleIn ? "Scale-in" : "Not a scale-in"), ["Scale-in", "Not a scale-in"]],
  chan: [
    "Channel (reversal)",
    t => (t.entry4h === "Reversal" ? (t.channel ? "Channel" : "No channel") : null),
    ["Channel", "No channel"],
  ],
  dms: [
    "Daily market structure",
    t => (t.dMs === "for" ? "With" : t.dMs === "against" ? "Against" : null),
    ["With", "Against"],
  ],
  hms: [
    "4H market structure",
    t => (t.hMs === "for" ? "With" : t.hMs === "against" ? "Against" : null),
    ["With", "Against"],
  ],
  concept: ["Trade concept", t => t.concept || null, Object.keys(PLAN.concepts)],
  sub: ["Daily variant", t => (t.concept && t.sub && t.sub !== "—" ? t.concept + " · " + t.sub : null)],
  dfib: [
    "Daily Fib completion",
    t => (t.dailyFib === "ja" ? "Yes" : t.dailyFib === "nee" ? "No" : null),
    ["Yes", "No"],
  ],
  entry4h: ["4H entry", t => t.entry4h || null, PLAN.entries],
  struct: ["4H structure", t => ({ bos: "BoS", som: "SoM" })[structOf(t)] || null, ["BoS", "SoM"]],
  room: [
    "4H room",
    t => (structOf(t) === "som" && t.room ? (t.room === "ja" ? "Room" : "No room") : null),
    ["Room", "No room"],
  ],
  ectf: [
    "Reversal timeframe (engulfing)",
    t => (t.entry4h === "Engulfing Candle" && t.ecTf ? t.ecTf.toUpperCase() : null),
    ["1H", "2H"],
  ],
  maxr: [
    "Max R reached",
    t => bucket(t.maxR, [0.5, 1, 1.5, 2, 3], ["< 0.5R", "0.5 – 1R", "1 – 1.5R", "1.5 – 2R", "2 – 3R", "3R +"]),
    ["< 0.5R", "0.5 – 1R", "1 – 1.5R", "1.5 – 2R", "2 – 3R", "3R +"],
  ],
  rr: [
    "Planned R:R",
    t => bucket(rrOf(t), [1.5, 2.5, 3.5], ["< 1.5", "1.5 – 2.5", "2.5 – 3.5", "3.5 +"]),
    ["< 1.5", "1.5 – 2.5", "2.5 – 3.5", "3.5 +"],
  ],
  sl: [
    "Stop loss size (pips)",
    t => bucket(t.slPips, [10, 20, 30], ["< 10", "10 – 20", "20 – 30", "30 +"]),
    ["< 10", "10 – 20", "20 – 30", "30 +"],
  ],
  pair: ["Pair", t => t.pair || null],
  dir: ["Direction", t => (t.dir ? (t.dir === "long" ? "Long" : "Short") : null)],
  status: ["Status", t => ({ taken: "Taken", missed: "Missed" })[t.status] || null, ["Taken", "Missed"]],
  outcome: [
    "Outcome",
    t =>
      ({ win: "Win", be: "BE", loss: "Loss", open: "Open" })[t.outcome] ||
      (t.r > 0 ? "Win" : t.r < 0 ? "Loss" : t.r === 0 ? "BE" : null),
    ["Win", "BE", "Loss", "Open"],
  ],
  evaluation: ["According to plan", t => (t.evaluation === "plan" ? "Yes" : t.evaluation ? "No" : null), ["Yes", "No"]],
  exit: ["Exit reason", t => t.exitReason || null, PLAN.exits],
  days: [
    "Days in trade",
    t => bucket(daysOpen(t), [1, 2, 4, 8], ["Same day", "1 day", "2 – 3 days", "4 – 7 days", "8 + days"]),
    ["Same day", "1 day", "2 – 3 days", "4 – 7 days", "8 + days"],
  ],
  weekday: [
    "Entry weekday",
    t => (t.date ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(t.date + "T12:00:00").getDay()] : null),
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ],
  month: ["Month", t => (t.date ? t.date.slice(0, 7) : null)],
  account: ["Account", t => acKey(t)],
  btmonth: ["Backtested in (month)", t => (t.mode === "backtest" && t.btDate ? t.btDate.slice(0, 7) : null)],
  btlag: [
    "Time between trade and backtest",
    t =>
      t.mode === "backtest" && t.btDate && t.date
        ? bucket(
            daysBetween(t.date, t.btDate),
            [30, 90, 180, 365],
            ["< 1 month", "1–3 months", "3–6 months", "6–12 months", "1 year +"]
          )
        : null,
    ["< 1 month", "1–3 months", "3–6 months", "6–12 months", "1 year +"],
  ],
  actype: ["Account type", t => ACTYPE[(acOf(t.account) || {}).type] || null, Object.values(ACTYPE)],
  project: ["Project", t => (t.mode === "live" ? "Live" : projName(t.project) || "No project")],
};
function splitRowsN(lists, key) {
  const [, fn, order] = SPLITS[key],
    vals = t => [].concat(fn(t) ?? []).filter(Boolean);
  const keys = [...new Set(taken(lists.flat()).flatMap(vals))].sort((x, y) =>
    order && order.includes(x) && order.includes(y) ? order.indexOf(x) - order.indexOf(y) : String(x).localeCompare(y)
  );
  return keys.map(k => ({ k, st: lists.map(l => stats(l.filter(t => vals(t).includes(k)))) }));
}
const blankSet = mode => ({
  mode,
  grade: "",
  wpat: "",
  project: "all",
  status: "",
  actype: "",
  fase: "",
  wstruct: "",
  wms: "",
  wtrend: "",
  wrange: "",
  scale: "",
  align: "",
  dms: "",
  hms: "",
  pro: "",
  con: "",
  concept: "",
  sub: "",
  dfib: "",
  dpro: "",
  entry4h: "",
  struct: "",
  room: "",
  ectf: "",
  pair: "",
  dir: "",
  outcome: "",
  eval: "",
  rev: "",
  exit: "",
  account: "",
  from: "",
  to: "",
});
let SPLITGROUPS = [
  ["Weekly", ["fase", "wpat", "wpatsub", "wstruct", "wms", "wtrend", "wrange", "align", "wpro", "wcon", "wscore"]],
  ["Daily", ["dms", "concept", "sub", "dpro"]],
  ["4H", ["hms", "entry4h", "struct", "room", "chan", "scale", "ectf", "rr", "sl"]],
  [
    "Context",
    ["grade", "pair", "dir", "status", "weekday", "month", "account", "actype", "project", "btmonth", "btlag"],
  ],
  ["Result", ["outcome", "evaluation", "exit", "maxr", "days"]],
];
const MAXSETS = 8;
function newSet(f) {
  const used = new Set(sets.map(x => x.c));
  let c = 0;
  while (used.has(c)) c++;
  return { id: uid(), c, f: { ...blankSet("all"), ...f } };
}
let sets = [],
  split = "fase";
sets = [newSet({ mode: "backtest" })];
sets.push(newSet({ mode: "live" }));
const scol = st => `var(--s${st.c + 1})`;
let PRESETS = [
  ["Backtest vs live", { mode: "backtest" }, { mode: "live" }],
  [
    "By weekly phase",
    { mode: "live", fase: "1" },
    { mode: "live", fase: "2" },
    { mode: "live", fase: "3" },
    { mode: "live", fase: "4" },
  ],
  ["Long vs short", { mode: "live", dir: "long" }, { mode: "live", dir: "short" }],
  ["A vs B vs C setups", { mode: "live", grade: "A" }, { mode: "live", grade: "B" }, { mode: "live", grade: "C" }],
  ["Graded vs outside your rules (X)", { mode: "live", grade: ["A", "B", "C"] }, { mode: "live", grade: "X" }],
  ["With vs against weekly structure", { mode: "live", wms: "for" }, { mode: "live", wms: "against" }],
  ["All timeframes with vs mixed", { mode: "live", align: "all" }, { mode: "live", align: ["mixed", "none"] }],
  ["To plan vs not", { mode: "live", eval: "plan" }, { mode: "live", eval: "off" }],
  ["Taken vs missed", { mode: "live", status: "taken" }, { mode: "live", status: "missed" }],
  ["4H reversal vs continuation", { mode: "live", entry4h: "Reversal" }, { mode: "live", entry4h: "Continuation" }],
];
let FDEF = [
  [
    "grade",
    "Setup grade",
    () => [
      ["", "Any"],
      ["A", "A (rules met, extras)"],
      ["B", "B (rules met)"],
      ["C", "C (something against)"],
      ["X", "X (a requirement missing)"],
    ],
    t => tGrade(t),
  ],
  [
    "status",
    "Status",
    () => [
      ["", "Taken and missed"],
      ["taken", "Taken"],
      ["missed", "Missed (hypothetical R)"],
    ],
    t => t.status,
  ],
  [
    "fase",
    "Weekly phase",
    () => [
      ["", "Any"],
      ["1", "Phase 1"],
      ["2", "Phase 2"],
      ["3", "Phase 3"],
      ["4", "Phase 4"],
    ],
    t => String(t.fase ?? ""),
  ],
  [
    "wpat",
    "Weekly pattern",
    () => [
      ["", "Any"],
      ["none", "No pattern"],
      ["Continuation", "Continuation"],
      ["Reversal", "Reversal"],
      ["Pattern in Pattern", "Pattern in Pattern"],
    ],
    (t, v) => (v === "none" ? !t.wPat : t.wPat === v),
  ],
  [
    "wstruct",
    "Weekly structure",
    () => [
      ["", "Any"],
      ["inner", "Inner"],
      ["outer", "Outer"],
    ],
    t => t.wStruct,
  ],
  [
    "wms",
    "Weekly market structure",
    () => [
      ["", "Any"],
      ["for", "With"],
      ["against", "Against"],
    ],
    t => (t.weekly || {}).ms,
  ],
  [
    "wtrend",
    "Market trend",
    () => [
      ["", "Any"],
      ["for", "With"],
      ["against", "Against"],
    ],
    t => (t.weekly || {}).trend || "",
  ],
  [
    "wrange",
    "Ranging",
    () => [
      ["", "Any"],
      ["yes", "Ranging"],
      ["no", "Not ranging"],
    ],
    t => (t.wRange || (t.weekly || {}).trend === "range" ? "yes" : "no"),
  ],
  [
    "pro",
    "Weekly pros",
    () => [["", "Any"], ...WKEYS.filter(k => k !== "ms").map(k => [k, WLAB(k)])],
    (t, v) => (t.weekly || {})[v] === "for",
  ],
  [
    "con",
    "Weekly cons",
    () => [["", "Any"], ...WKEYS.filter(k => k !== "ms").map(k => [k, WLAB(k)])],
    (t, v) => (t.weekly || {})[v] === "against",
  ],
  [
    "align",
    "Structure alignment",
    () => [
      ["", "Any"],
      ["all", "All with"],
      ["mixed", "Mixed"],
      ["none", "All against"],
    ],
    t => {
      const v = [(t.weekly || {}).ms, t.dMs, t.hMs].filter(Boolean);
      if (!v.length) return "";
      const f = v.filter(x => x === "for").length;
      return f === v.length ? "all" : f ? "mixed" : "none";
    },
  ],
  [
    "scale",
    "Scale-in",
    () => [
      ["", "Any"],
      ["yes", "Scale-in"],
      ["no", "Not a scale-in"],
    ],
    t => (t.scaleIn ? "yes" : "no"),
  ],
  [
    "chan",
    "Channel (reversal)",
    () => [
      ["", "Any"],
      ["yes", "Channel"],
      ["no", "No channel"],
    ],
    t => (t.entry4h === "Reversal" ? (t.channel ? "yes" : "no") : ""),
  ],
  [
    "dms",
    "Daily market structure",
    () => [
      ["", "Any"],
      ["for", "With"],
      ["against", "Against"],
    ],
    t => t.dMs,
  ],
  [
    "hms",
    "4H market structure",
    () => [
      ["", "Any"],
      ["for", "With"],
      ["against", "Against"],
    ],
    t => t.hMs,
  ],
  ["concept", "Trade concept", () => [["", "Any"], ...Object.keys(PLAN.concepts).map(c => [c, c])], t => t.concept],
  [
    "sub",
    "Daily variant",
    () => [["", "Any"], ...[...new Set(Object.values(PLAN.concepts).flat())].filter(x => x !== "—").map(c => [c, c])],
    t => t.sub,
  ],
  ["dpro", "Daily pros", () => [["", "Any"], ...DCRIT], (t, v) => dProsOf(t).includes(v)],
  ["entry4h", "4H entry", () => [["", "Any"], ...PLAN.entries.map(c => [c, c])], t => t.entry4h],
  [
    "struct",
    "4H structure",
    () => [
      ["", "Any"],
      ["bos", "BoS"],
      ["som", "SoM"],
    ],
    t => structOf(t),
  ],
  [
    "room",
    "4H room",
    () => [
      ["", "Any"],
      ["ja", "Room"],
      ["nee", "No room"],
    ],
    t => t.room,
  ],
  [
    "ectf",
    "Reversal timeframe",
    () => [
      ["", "Any"],
      ["1h", "1H"],
      ["2h", "2H"],
    ],
    t => t.ecTf,
  ],
  [
    "pair",
    "Pair",
    () => [
      ["", "Any"],
      ...[
        ...new Set(
          trades()
            .map(t => t.pair)
            .filter(Boolean)
        ),
      ]
        .sort()
        .map(c => [c, c]),
    ],
    t => t.pair,
  ],
  [
    "dir",
    "Direction",
    () => [
      ["", "Any"],
      ["long", "Long"],
      ["short", "Short"],
    ],
    t => t.dir,
  ],
  [
    "outcome",
    "Outcome",
    () => [
      ["", "Any"],
      ["win", "Win"],
      ["be", "BE"],
      ["loss", "Loss"],
      ["open", "Open"],
    ],
    t => t.outcome || (t.r > 0 ? "win" : t.r < 0 ? "loss" : t.r === 0 ? "be" : ""),
  ],
  [
    "eval",
    "According to plan",
    () => [
      ["", "Any"],
      ["plan", "Yes"],
      ["off", "No"],
    ],
    t => (t.evaluation === "plan" ? "plan" : t.evaluation ? "off" : ""),
  ],
  [
    "rev",
    "Reviewed",
    () => [
      ["", "Any"],
      ["yes", "Re-evaluated"],
      ["no", "Not yet"],
    ],
    t => (t.reviews && t.reviews.length ? "yes" : "no"),
  ],
  ["exit", "Exit", () => [["", "Any"], ...PLAN.exits.map(c => [c, c])], t => t.exitReason],
  [
    "account",
    "Account",
    () => [
      ["", "Any"],
      ...[...new Set(trades().map(acKey).filter(Boolean))]
        .sort((a, b) => (a === "Removed account") - (b === "Removed account") || a.localeCompare(b))
        .map(c => [c, c]),
    ],
    t => acKey(t),
  ],
  ["actype", "Account type", () => [["", "Any"], ...Object.entries(ACTYPE)], t => (acOf(t.account) || {}).type || ""],
];
const FMAIN = [
  "status",
  "fase",
  "pro",
  "con",
  "concept",
  "entry4h",
  "struct",
  "room",
  "pair",
  "dir",
  "outcome",
  "eval",
];
const fvals = v => (Array.isArray(v) ? v : v ? [v] : []);
function applySet(f, list) {
  const out = list.filter(
    t =>
      (f.mode === "all" || t.mode === f.mode) &&
      (f.project === "all" ||
        t.mode !== "backtest" ||
        (f.project === "none" ? !projName(t.project) : t.project === f.project)) &&
      FDEF.every(([k, , , get]) => {
        const vs = fvals(f[k]);
        if (!vs.length || (k === "grade" && !feat("grade"))) return true;
        return get.length === 2 ? vs.some(v => get(t, v)) : vs.includes(String(get(t) ?? ""));
      }) &&
      (!f.from || (t.date || "") >= f.from) &&
      (!f.to || (t.date || "") <= f.to)
  );
  return fvals(f.status).includes("missed") ? out.map(t => ({ ...t, status: "taken" })) : out;
}
function describe(f) {
  const p = [];
  p.push(f.mode === "all" ? "All trades" : f.mode === "live" ? "Live" : "Backtest");
  if (f.mode !== "live" && f.project !== "all")
    p.push(f.project === "none" ? "No project" : projName(f.project) || "Project");
  FDEF.forEach(([k, label, opts]) => {
    const vs = fvals(f[k]);
    if (!vs.length) return;
    const O = opts();
    const l = vs
      .map(v => {
        const o = O.find(x => x[0] === v);
        return o ? o[1] : v;
      })
      .join(k === "fase" ? " & " : " / ");
    p.push(
      k === "pro"
        ? "Pro: " + l
        : k === "dpro"
          ? "Daily pro: " + l
          : k === "con"
            ? "Con: " + l
            : ["fase", "pair", "concept", "sub", "outcome", "status", "sphase", "swpat", "sstate"].includes(k)
              ? l
              : label + ": " + l
    );
  });
  if (f.from || f.to) p.push((f.from || "…") + " → " + (f.to || "…"));
  return p.join(" · ");
}
let FGROUPS = [
  ["Weekly", ["fase", "wpat", "wstruct", "wms", "wtrend", "wrange", "align", "pro", "con"]],
  ["Daily", ["dms", "concept", "sub", "dpro"]],
  ["4H", ["hms", "entry4h", "struct", "room", "chan", "scale", "ectf"]],
  ["Context", ["status", "grade", "pair", "dir", "account", "actype", "dates"]],
  ["Result", ["outcome", "eval", "rev", "exit"]],
];
/* ---------- Analyze definitions per market ---------- */
const FX_DEFS = { FDEF, FGROUPS, SPLITS, SPLITGROUPS, PRESETS, split: "fase" };
const MSO = () => [
  ["", "Any"],
  ["for", "With"],
  ["against", "Against"],
];
const msL = v => (v === "for" ? "With" : v === "against" ? "Against" : null);
const sHows = t => [...new Set((t.sExits || []).flatMap(x => (Array.isArray(x.hows) ? x.hows : x.how ? [x.how] : [])))];
const sState = t =>
  t.status === "missed" ? "missed" : typeof sIsOpen === "function" && sIsOpen(t) ? "open" : "closed";
const sAlign = t => {
  const v = [t.s12Ms, t.s6Ms, t.s3Ms, t.s1Ms, t.swMs].filter(Boolean);
  return v.length ? `${v.filter(x => x === "for").length}/${v.length} with` : null;
};
const ST_DEFS = {
  FDEF: [
    [
      "status",
      "Status",
      () => [
        ["", "Taken and missed"],
        ["taken", "Taken"],
        ["missed", "Missed"],
      ],
      t => t.status,
    ],
    [
      "sstate",
      "Open / closed",
      () => [
        ["", "Any"],
        ["open", "Open"],
        ["closed", "Closed"],
      ],
      t => sState(t),
    ],
    [
      "sphase",
      "Phase",
      () => [
        ["", "Any"],
        ["A", "Phase A"],
        ["B", "Phase B"],
      ],
      t => t.sPhase || "",
    ],
    [
      "salign",
      "Structure alignment",
      () => [
        ["", "Any"],
        ["all", "All with"],
        ["mixed", "Mixed"],
        ["none", "All against"],
      ],
      t => {
        const v = [t.s12Ms, t.s6Ms, t.s3Ms, t.s1Ms, t.swMs].filter(Boolean);
        if (!v.length) return "";
        const f = v.filter(x => x === "for").length;
        return f === v.length ? "all" : f ? "mixed" : "none";
      },
    ],
    ["s12ms", "12M market structure", MSO, t => t.s12Ms || ""],
    ["s6ms", "6M market structure", MSO, t => t.s6Ms || ""],
    [
      "s6bm",
      "6M BM",
      () => [
        ["", "Any"],
        ["FS", "FS"],
        ["100", "100"],
        ["PinP", "PinP"],
      ],
      t => t.s6bm || "",
    ],
    ["s3ms", "3M market structure", MSO, t => t.s3Ms || ""],
    [
      "s3room",
      "3M room",
      () => [
        ["", "Any"],
        ["yes", "Room"],
        ["no", "No room"],
      ],
      t => ((t.sPhase === "B" ? t.s3roomB : t.s3room) ? "yes" : "no"),
    ],
    ["s1ms", "Monthly market structure", MSO, t => t.s1Ms || ""],
    [
      "s1cc",
      "Monthly bullish CC",
      () => [
        ["", "Any"],
        ["yes", "Bullish CC"],
        ["no", "No bullish CC"],
      ],
      t => (t.s1cc ? "yes" : "no"),
    ],
    ["swms", "Weekly market structure", MSO, t => t.swMs || ""],
    [
      "swpat",
      "Weekly pattern",
      () => [
        ["", "Any"],
        ["BM", "BM"],
        ["IHS", "IHS"],
      ],
      t => t.swPat || "",
    ],
    [
      "exit",
      "Exit strategy used",
      () => [
        ["", "Any"],
        ...[
          ...new Set([
            ...Object.values(EXITS)
              .flat()
              .map(x => x[0]),
            ...EXOTHER,
          ]),
        ].map(x => [x, x]),
      ],
      (t, v) => sHows(t).includes(v),
    ],
    [
      "pair",
      "Ticker",
      () => [
        ["", "Any"],
        ...[
          ...new Set(
            trades()
              .map(t => t.ticker || t.pair)
              .filter(Boolean)
          ),
        ]
          .sort()
          .map(c => [c, c]),
      ],
      t => t.ticker || t.pair,
    ],
    [
      "account",
      "Account",
      () => [
        ["", "Any"],
        ...[...new Set(trades().map(acKey).filter(Boolean))]
          .sort((a, b) => (a === "Removed account") - (b === "Removed account") || a.localeCompare(b))
          .map(c => [c, c]),
      ],
      t => acKey(t),
    ],
    [
      "outcome",
      "Outcome",
      () => [
        ["", "Any"],
        ["win", "Win"],
        ["be", "BE"],
        ["loss", "Loss"],
        ["open", "Open"],
      ],
      t => t.outcome || "",
    ],
  ],
  FGROUPS: [
    ["Higher timeframes", ["sphase", "salign", "s12ms", "s6ms", "s6bm", "s3ms", "s3room"]],
    ["Monthly & weekly", ["s1ms", "s1cc", "swms", "swpat"]],
    ["Context", ["status", "sstate", "pair", "account", "dates"]],
    ["Result", ["outcome", "exit"]],
  ],
  SPLITS: {
    sphase: ["Phase", t => (t.sPhase ? "Phase " + t.sPhase : null), ["Phase A", "Phase B"]],
    salign: ["Structure alignment (12M · 6M · 3M · M · W)", sAlign],
    s12ms: ["12M market structure", t => msL(t.s12Ms), ["With", "Against"]],
    s6ms: ["6M market structure", t => msL(t.s6Ms), ["With", "Against"]],
    s6bm: ["6M BM", t => (t.sPhase === "B" ? (t.s6ret ? "Back to " + t.s6ret : null) : t.s6bm || null)],
    s3ms: ["3M market structure", t => msL(t.s3Ms), ["With", "Against"]],
    s1ms: ["Monthly market structure", t => msL(t.s1Ms), ["With", "Against"]],
    s1cc: ["Monthly bullish CC", t => (t.s1cc ? "Bullish CC" : "No bullish CC")],
    swms: ["Weekly market structure", t => msL(t.swMs), ["With", "Against"]],
    swpat: ["Weekly pattern", t => t.swPat || null, ["BM", "IHS"]],
    exit: ["Exit strategy (each)", t => sHows(t)],
    hold: [
      "Holding time",
      t =>
        t.date && t.closeDate
          ? bucket(
              daysBetween(t.date, t.closeDate),
              [30, 90, 180, 365],
              ["< 1 month", "1–3 months", "3–6 months", "6–12 months", "1 year +"]
            )
          : null,
      ["< 1 month", "1–3 months", "3–6 months", "6–12 months", "1 year +"],
    ],
    pair: ["Ticker", t => t.ticker || t.pair || null],
    account: ["Account", t => acKey(t)],
    status: ["Status", t => (t.status === "missed" ? "Missed" : "Taken"), ["Taken", "Missed"]],
    outcome: [
      "Outcome",
      t => ({ win: "Win", be: "BE", loss: "Loss", open: "Open" })[t.outcome] || null,
      ["Win", "BE", "Loss", "Open"],
    ],
    month: ["Entry month", t => (t.date ? t.date.slice(0, 7) : null)],
    btmonth: ["Backtested in (month)", t => (t.mode === "backtest" && t.btDate ? t.btDate.slice(0, 7) : null)],
  },
  SPLITGROUPS: [
    ["Higher timeframes", ["sphase", "salign", "s12ms", "s6ms", "s6bm", "s3ms"]],
    ["Monthly & weekly", ["s1ms", "s1cc", "swms", "swpat"]],
    ["Result", ["exit", "hold", "outcome"]],
    ["Context", ["pair", "account", "status", "month", "btmonth"]],
  ],
  PRESETS: [
    ["Backtest vs live", { mode: "backtest" }, { mode: "live" }],
    ["Phase A vs Phase B", { mode: "live", sphase: "A" }, { mode: "live", sphase: "B" }],
    ["BM vs IHS", { mode: "live", swpat: "BM" }, { mode: "live", swpat: "IHS" }],
    ["All timeframes with vs mixed", { mode: "live", salign: "all" }, { mode: "live", salign: ["mixed", "none"] }],
    [
      "6M BM: FS vs 100 vs PinP",
      { mode: "live", s6bm: "FS" },
      { mode: "live", s6bm: "100" },
      { mode: "live", s6bm: "PinP" },
    ],
    ["Monthly bullish CC vs not", { mode: "live", s1cc: "yes" }, { mode: "live", s1cc: "no" }],
    ["Taken vs missed", { mode: "live", status: "taken" }, { mode: "live", status: "missed" }],
  ],
  split: "sphase",
};
function useMarketDefs() {
  const d = market === "stocks" ? ST_DEFS : FX_DEFS,
    gr = feat("grade"),
    noG = G => (gr ? G : G.map(([g, ks]) => [g, ks.filter(k => k !== "grade")]).filter(x => x[1].length));
  FDEF = d.FDEF;
  FGROUPS = noG(d.FGROUPS);
  SPLITS = d.SPLITS;
  SPLITGROUPS = noG(d.SPLITGROUPS);
  if (!gr && split === "grade") split = d.split;
  PRESETS = gr ? d.PRESETS : d.PRESETS.filter(p => !p.slice(1).some(f => f && f.grade));
  if (!SPLITS[split]) split = d.split;
}
const flabel = k => (k === "dates" ? "Date range" : FDEF.find(d => d[0] === k)[1]);
// the filter chips of one filter object; k is the set id the popover and × buttons act on
function fchipsOf(f, k) {
  const chips = FDEF.filter(d => fvals(f[d[0]]).length).map(d => {
    const O = d[2](),
      vs = fvals(f[d[0]]);
    const l = vs
      .map(v => {
        const o = O.find(x => x[0] === v);
        return o ? o[1] : v;
      })
      .join(", ");
    return `<span class="fchip"><em>${esc(d[1])}${vs.length > 1 ? " (any)" : ""}</em>${esc(l)}<button type="button" data-rmfilter="${d[0]}" data-fset="${k}" aria-label="Remove ${esc(d[1])} filter">×</button></span>`;
  });
  if (f.from || f.to)
    chips.push(
      `<span class="fchip"><em>Dates</em>${esc(f.from ? fmtD(f.from) : "…")} – ${esc(f.to ? fmtD(f.to) : "…")}<button type="button" data-rmfilter="dates" data-fset="${k}" aria-label="Remove date filter">×</button></span>`
    );
  return chips;
}
function setControls(st, i) {
  const f = st.f,
    k = st.id,
    chips = fchipsOf(f, k);
  const modes = [
    ["all", "All"],
    ["live", "Live"],
    ["backtest", "Backtest"],
  ];
  return `<div class="panel setpanel" style="border-top-color:${scol(st)}">
  <div class="row spread"><span class="eyebrow"><i class="sdot" style="background:${scol(st)}"></i>Set ${i + 1}</span><div class="row" style="gap:2px"><button type="button" class="btn small ghost" data-dupset="${k}" ${sets.length >= MAXSETS ? "disabled" : ""}>Duplicate</button><button type="button" class="btn small ghost" data-resetset="${k}">Reset</button>${sets.length > 1 ? `<button type="button" class="btn small ghost danger" data-rmset="${k}" aria-label="Remove set ${i + 1}">Remove</button>` : ""}</div></div>
  <div class="setbar"><div class="segs" role="radiogroup" aria-label="Trades">${modes.map(([v, l]) => `<label class="seg"><input type="radio" name="mode-${k}" id="m${k}-${v}" value="${v}" data-set="${k}" data-key="mode" ${f.mode === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
  ${f.mode === "backtest" ? `<select id="f${k}-project" data-set="${k}" data-key="project" aria-label="Backtest project">${[["all", "All projects"], ...projects().map(p => [p.id, p.name]), ["none", "No project"]].map(([v, l]) => `<option value="${esc(v)}" ${f.project === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : ""}</div>
  <div class="fchips">${chips.join("")}<button type="button" class="addf" data-addf="${k}">+ Add filter</button></div>
  </div>`;
}
const allF = () => {
  const f = {};
  FDEF.forEach(([k]) => {
    const L = sets.map(x => fvals(x.f[k]));
    f[k] = L[0].filter(v => L.every(l => l.includes(v)));
  });
  const fr = sets.map(x => x.f.from || ""),
    to = sets.map(x => x.f.to || "");
  f.from = fr.every(x => x === fr[0]) ? fr[0] : "";
  f.to = to.every(x => x === to[0]) ? to[0] : "";
  return f;
};
function allBar() {
  if (sets.length < 2) return "";
  const f = allF();
  const chips = FDEF.filter(d => f[d[0]].length).map(d => {
    const O = d[2]();
    const l = f[d[0]]
      .map(v => {
        const o = O.find(x => x[0] === v);
        return o ? o[1] : v;
      })
      .join(", ");
    return `<span class="fchip"><em>${esc(d[1])}</em>${esc(l)}<button type="button" data-rmfilter="${d[0]}" data-fset="__all" aria-label="Remove ${esc(d[1])} from all sets">×</button></span>`;
  });
  if (f.from || f.to)
    chips.push(
      `<span class="fchip"><em>Dates</em>${esc(f.from ? fmtD(f.from) : "…")} – ${esc(f.to ? fmtD(f.to) : "…")}<button type="button" data-rmfilter="dates" data-fset="__all" aria-label="Remove date filter from all sets">×</button></span>`
    );
  return `<div class="panel allbar"><span class="eyebrow">All sets</span><div class="fchips">${chips.join("")}<button type="button" class="addf" data-addf="__all">+ Add filter to all sets</button></div></div>`;
}
function fpopRender() {
  const P = $("#fpop"),
    st = fpop.set === "__all" ? (sets.length ? { f: allF() } : null) : fpSet(fpop.set);
  if (!st) {
    P.hidden = true;
    return;
  }
  if (!fpop.field) {
    P.innerHTML = FGROUPS.map(([g, ks]) => [g, fpop.set === "__rv" ? ks.filter(k => !RV_NOF.includes(k)) : ks])
      .filter(([, ks]) => ks.length)
      .map(
        ([g, ks]) =>
          `<div class="fpg"><span class="eyebrow">${g}</span>${ks
            .map(k => {
              const on = k === "dates" ? st.f.from || st.f.to : fvals(st.f[k]).length;
              return `<button type="button" class="fpi ${on ? "on" : ""}" data-pickf="${k}">${esc(flabel(k))}<span>›</span></button>`;
            })
            .join("")}</div>`
      )
      .join("");
    return;
  }
  const back = `<button type="button" class="fpback" data-pickf="">‹ ${esc(flabel(fpop.field))}</button>`;
  if (fpop.field === "dates") {
    P.innerHTML = `${back}<div class="fpdates"><label class="f"><span>From</span><input type="date" id="fpFrom" value="${esc(st.f.from)}"></label><label class="f"><span>To</span><input type="date" id="fpTo" value="${esc(st.f.to)}"></label><button type="button" class="btn small primary" data-applydates>Apply</button></div>`;
    return;
  }
  const d = FDEF.find(x => x[0] === fpop.field),
    vs = fvals(st.f[d[0]]);
  P.innerHTML =
    back +
    `<p class="fphint">Pick one or more</p><div class="fpopts">${d[2]()
      .filter(([v]) => v !== "")
      .map(
        ([v, l]) =>
          `<button type="button" class="fpi ${vs.includes(v) ? "on" : ""}" data-pickv="${esc(v)}" aria-pressed="${vs.includes(v)}"><span class="fpck">${vs.includes(v) ? "✓" : ""}</span><b>${esc(l)}</b></button>`
      )
      .join(
        ""
      )}</div><div class="fpfoot"><button type="button" class="btn small primary" data-fpdone>Done</button></div>`;
}
let fpop = { set: null, field: null };
// "__rv" is the re-evaluate game's trade filter (Review tab); everything else is an Analyze set
const fpSet = id => (id === "__rv" ? { f: rvOpts.f || (rvOpts.f = {}) } : sets.find(x => x.id === id));
const fpRedraw = id => (id === "__rv" ? rvRender() : renderAnalyze());
function fpopOpen(btn) {
  fpop = { set: btn.dataset.addf, field: null };
  const P = $("#fpop");
  P.hidden = false;
  fpopRender();
  const r = btn.getBoundingClientRect(),
    w = Math.min(280, innerWidth - 24);
  P.style.width = w + "px";
  P.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + "px";
  const below = innerHeight - r.bottom;
  P.style.top = (below > 320 ? r.bottom + 6 : Math.max(12, r.top - Math.min(420, P.scrollHeight) - 6)) + "px";
}
function fpopClose() {
  $("#fpop").hidden = true;
  fpop = { set: null, field: null };
}
document.addEventListener(
  "click",
  e => {
    const P = $("#fpop");
    const add = e.target.closest("[data-addf]");
    if (add) {
      e.stopPropagation();
      if (!P.hidden && fpop.set === add.dataset.addf) fpopClose();
      else fpopOpen(add);
      return;
    }
    const rm = e.target.closest("[data-rmfilter]");
    if (rm && rm.dataset.fset === "__all") {
      const k = rm.dataset.rmfilter;
      if (k === "dates")
        sets.forEach(x => {
          x.f.from = "";
          x.f.to = "";
        });
      else {
        const c = allF()[k];
        sets.forEach(x => {
          x.f[k] = fvals(x.f[k]).filter(v => !c.includes(v));
        });
      }
      renderAnalyze();
      return;
    }
    if (rm) {
      const st = fpSet(rm.dataset.fset);
      if (st) {
        if (rm.dataset.rmfilter === "dates") {
          st.f.from = "";
          st.f.to = "";
        } else st.f[rm.dataset.rmfilter] = "";
        fpRedraw(rm.dataset.fset);
      }
      return;
    }
    if (P.hidden) return;
    if (!e.target.closest("#fpop")) {
      fpopClose();
      return;
    }
    const pf = e.target.closest("[data-pickf]");
    if (pf) {
      fpop.field = pf.dataset.pickf || null;
      fpopRender();
      return;
    }
    if (fpop.set === "__all") {
      const pv = e.target.closest("[data-pickv]");
      if (pv) {
        const k = fpop.field,
          v = pv.dataset.pickv,
          on = allF()[k].includes(v);
        sets.forEach(x => {
          const vs = fvals(x.f[k]);
          x.f[k] = on ? vs.filter(y => y !== v) : vs.includes(v) ? vs : [...vs, v];
        });
        renderAnalyze();
        fpopRender();
        return;
      }
      if (e.target.closest("[data-fpdone]")) {
        fpopClose();
        return;
      }
      if (e.target.closest("[data-applydates]")) {
        const a = $("#fpFrom").value,
          b = $("#fpTo").value;
        sets.forEach(x => {
          x.f.from = a;
          x.f.to = b;
        });
        fpopClose();
        renderAnalyze();
      }
      return;
    }
    const st = fpSet(fpop.set);
    if (!st) return;
    const pv = e.target.closest("[data-pickv]");
    if (pv) {
      const vs = fvals(st.f[fpop.field]),
        v = pv.dataset.pickv;
      st.f[fpop.field] = vs.includes(v) ? vs.filter(x => x !== v) : [...vs, v];
      fpRedraw(fpop.set);
      fpopRender();
      return;
    }
    if (e.target.closest("[data-fpdone]")) {
      fpopClose();
      return;
    }
    if (e.target.closest("[data-applydates]")) {
      st.f.from = $("#fpFrom").value;
      st.f.to = $("#fpTo").value;
      fpopClose();
      fpRedraw(fpop.set);
    }
  },
  true
);
document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Escape" && !$("#fpop").hidden) {
      e.stopImmediatePropagation();
      fpopClose();
    }
  },
  true
);
addEventListener(
  "scroll",
  () => {
    if (!$("#fpop").hidden) fpopClose();
  },
  { passive: true }
);
function renderAnalyze() {
  const v = $("#view-analyze");
  if (!trades().length) {
    v.innerHTML = `<div class="panel empty"><span class="eyebrow">Nothing to analyze yet</span><h2>Analyze any slice of your trades</h2>
    <p class="hint">Log live trades under Journal and backtests as projects under Backtest. Here you look at one set of trades, or compare as many as you like side by side: backtest against live, phase against phase, trades to plan against errors.</p>
    <div class="row"><button class="btn liveb" data-go="live">Log a live trade</button><button class="btn btb" data-go="backtest">Start a backtest project</button><button class="btn" id="demoBtn">Load sample data</button></div></div>`;
    $("#demoBtn").onclick = loadDemo;
    return;
  }
  const demo = docs.some(t => t.demo);
  v.innerHTML = `${demo ? `<div class="banner"><span>You are viewing sample data, not your own trades.</span><button class="btn small" id="clearDemo">Clear sample</button></div>` : ""}
  <div class="panel"><span class="eyebrow">Quick start</span><div class="row" style="margin-top:8px">${PRESETS.map((p, i) => `<button type="button" class="btn small" data-preset="${i}">${esc(p[0])}</button>`).join("")}</div></div>
  ${allBar()}<div class="setgrid">${sets.map(setControls).join("")}${sets.length < MAXSETS ? `<button type="button" class="proj new addset" data-addset>+ Add set</button>` : ""}</div>
  <div id="results" style="display:grid;gap:20px"></div>`;
  const cd = $("#clearDemo");
  if (cd) cd.onclick = () => docs.filter(t => t.demo).forEach(t => deleteDoc(t.id));
  renderResults();
}
function ovData(list) {
  const ps = stats(list),
    tk = taken(list).sort((x, z) => (x.date || "").localeCompare(z.date || "") || (x.created || 0) - (z.created || 0));
  const wins = tk.filter(t => t.r > 0).length,
    bes = tk.filter(t => t.r === 0).length,
    losses = tk.filter(t => t.r < 0).length;
  let cum = 0,
    peak = 0,
    dd = 0,
    streak = 0,
    maxStreak = 0;
  tk.forEach(t => {
    cum += t.r;
    peak = Math.max(peak, cum);
    dd = Math.min(dd, cum - peak);
    streak = t.r < 0 ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);
  });
  return { ps, tk, o: { wins, bes, losses, dd, maxStreak } };
}
function equityMulti(series, H = 300, W = 760) {
  /* series: [{tk,c,name}] */ const L = 52,
    R = 14,
    T = 14,
    B = 34;
  const cs = series.map(s => {
    let c = 0;
    return { ...s, v: [0, ...s.tk.map(t => (c += t.r))] };
  });
  const n = Math.max(1, ...cs.map(s => s.v.length - 1));
  const all = cs.flatMap(s => s.v);
  let lo = Math.min(0, ...all),
    hi = Math.max(0, ...all);
  if (hi - lo < 1) {
    hi += 0.5;
    lo -= 0.5;
  }
  const yt = ticksFor(lo, hi, 5);
  lo = yt[0];
  hi = yt[yt.length - 1];
  const x = i => L + (i / n) * (W - L - R),
    y = val => T + ((hi - val) / (hi - lo)) * (H - T - B);
  const xs = Math.max(1, niceStep(n / 6)),
    xt = [];
  for (let i = xs; i <= n; i += xs) xt.push(i);
  const lines = cs
    .map(s =>
      s.v.length > 1
        ? `<polyline points="${s.v.map((val, i) => `${x(i).toFixed(1)},${y(val).toFixed(1)}`).join(" ")}" fill="none" stroke="${s.c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(s.v.length - 1)}" cy="${y(s.v[s.v.length - 1])}" r="4.5" fill="${s.c}" stroke="var(--surface)" stroke-width="2"/>`
        : ""
    )
    .join("");
  const w = (W - L - R) / n,
    hits = Array.from({ length: n + 1 }, (_, i) => {
      const tip = i
        ? `Trade ${i} · ` +
          cs
            .map((s, k) => (s.v[i] != null ? `${s.name}: ${fmtR(s.v[i])}` : null))
            .filter(Boolean)
            .join(" · ")
        : "Start · 0R";
      return `<rect x="${(x(i) - w / 2).toFixed(1)}" y="${T}" width="${w.toFixed(1)}" height="${H - T - B}" fill="transparent" data-tip="${esc(tip)}" data-hx="${x(i).toFixed(1)}" data-hy="${y(cs[0].v[Math.min(i, cs[0].v.length - 1)]).toFixed(1)}"/>`;
    }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="jchart eq" role="img" aria-label="Total R after each trade per set">${axisY(lo, hi, yt, rLab, W, y, L, R)}
  ${xt.map(i => `<text x="${x(i)}" y="${H - B + 16}" text-anchor="middle">${i}</text>`).join("")}<text x="${(L + W - R) / 2}" y="${H - 2}" text-anchor="middle" class="axt">Trade number</text>
  ${lines}<g class="hover"><line class="hx" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-dasharray="3 3" opacity="0"/><circle class="hc" r="0" opacity="0"/></g>${hits}</svg>`;
}
function renderResults() {
  const all = market === "stocks" ? trades().map(sPct) : trades(),
    lists = sets.map(st => applySet(st.f, all)),
    D = lists.map(ovData),
    N = sets.length,
    two = N === 2;
  sets.forEach(st => {
    const el = $("#name" + st.id);
    if (el) el.textContent = describe(st.f);
  });
  let top = "";
  if (N === 1) {
    const d = D[0];
    top = d.tk.length
      ? `<div class="anov">${overviewHTML(d.tk, d.ps, d.o, { label: "this set" })}</div>`
      : `<div class="panel"><h2>No results in this set</h2><p class="hint" style="margin:0">Change the filters, or log more trades.</p></div>`;
  } else {
    const card = (st, i) => {
      const d = D[i],
        n = d.tk.length,
        ps = d.ps,
        o = d.o;
      return `<div class="setcard" style="border-top-color:${scol(st)}"><span class="eyebrow"><i class="sdot" style="background:${scol(st)}"></i>Set ${i + 1}</span><b class="scn">${esc(describe(st.f))}</b>
      <div class="scbig"><span class="${ps.total > 0 ? "pos" : ps.total < 0 ? "neg" : ""}">${n ? fmtR(ps.total) : "—"}</span><em>total</em></div>
      <dl class="scstats"><div><dt>Trades</dt><dd class="num">${n}</dd></div><div><dt>Win rate</dt><dd class="num">${fmtP(ps.wr)}</dd></div><div><dt>Avg R</dt><dd class="num">${fmtR(ps.avg)}</dd></div></dl>
      ${n ? `<div class="bstack sm" role="img" aria-label="${o.wins} wins, ${o.bes} BE, ${o.losses} losses">${o.wins ? `<div class="bseg" style="flex:${o.wins};background:var(--good)"></div>` : ""}${o.bes ? `<div class="bseg" style="flex:${o.bes};background:var(--be)"></div>` : ""}${o.losses ? `<div class="bseg" style="flex:${o.losses};background:var(--bad)"></div>` : ""}</div><span class="hint" style="margin:0">${o.wins} W · ${o.bes} BE · ${o.losses} L</span>` : ""}</div>`;
    };
    top = `<div class="setcards">${sets.map(card).join("")}</div>
    <div class="panel"><span class="eyebrow">Profit over time</span><h2>Total R after each trade</h2>
      ${equityMulti(
        sets.map((st, i) => ({ tk: D[i].tk, c: scol(st), name: "Set " + (i + 1) })),
        innerWidth < 640 ? 280 : 300,
        innerWidth < 640 ? 380 : 760
      )}
      <div class="legend">${sets.map((st, i) => `<span><i style="background:${scol(st)}"></i>Set ${i + 1}</span>`).join("")}</div></div>`;
  }
  const bi = two ? sets.findIndex(x => x.f.mode === "backtest") : -1,
    li = two ? sets.findIndex(x => x.f.mode === "live") : -1;
  const match = bi >= 0 && li >= 0 ? matchHTML(taken(lists[bi]), taken(lists[li]), sets[bi], sets[li]) : "";
  const rows = splitRowsN(lists, split);
  const maxAbs = Math.max(0.5, ...rows.flatMap(r => r.st.map(x => Math.abs(x.avg || 0))));
  const bh = Math.max(4, Math.min(8, Math.floor(24 / N)));
  const openN =
    market === "stocks"
      ? new Set(
          lists
            .flat()
            .filter(t => t.openR)
            .map(t => t.id)
        ).size
      : 0;
  $("#results").innerHTML =
    stLbl(`${openN ? `<p class="hint" style="margin:0">Includes ${openN} open trade${openN > 1 ? "s" : ""} with the R realised so far from partial exits.</p>` : ""}${top}
  ${match}
  <div class="panel"><div class="row spread"><div><span class="eyebrow">Drill down</span><h2>Average R by ${esc(SPLITS[split][0].toLowerCase())}</h2></div>
    <label class="f" style="min-width:min(100%,220px)"><span>Split by</span><select id="splitSel">${SPLITGROUPS.map(([g, ks]) => `<optgroup label="${g}">${ks.map(k => `<option value="${k}" ${k === split ? "selected" : ""}>${SPLITS[k][0]}</option>`).join("")}</optgroup>`).join("")}</select></label></div>
    ${rows.length ? `<div class="drill">${rows.map(r => `<div class="drow2"><span class="dk">${esc(r.k)}</span><div class="dbars">${r.st.map((x, i) => (!x.n && N > 1 ? "" : `<div class="dbar" data-tip="${esc(`Set ${i + 1} · ${r.k}: ${x.n} trades · ${fmtP(x.wr)} wins · avg ${fmtR(x.avg)}`)}"><span class="dtrack"><i style="${(x.avg || 0) < 0 ? "right:50%" : "left:50%"};width:${(Math.abs(x.avg || 0) / maxAbs) * 50}%;background:${scol(sets[i])};height:${bh}px"></i></span><span class="dv num">${x.n ? fmtR(x.avg) : "—"}</span><span class="dn2 num">${x.n} tr · ${fmtP(x.wr)}</span></div>`)).join("")}</div></div>`).join("")}</div>` : `<p class="hint">No taken trades with a result in these sets.</p>`}</div>
  ${setTradesHTML(lists)}
  ${projectsVsLive(liveTrades())}`);
  $("#splitSel").onchange = e => {
    split = e.target.value;
    renderResults();
  };
  if (N === 1 && D[0].tk.length)
    requestAnimationFrame(() => {
      const cb = document.querySelector("#results .ov-right .cbody");
      if (cb && cb.clientWidth) {
        const w = eqW(cb);
        cb.innerHTML = equityChart(D[0].tk, (w * cb.clientHeight) / cb.clientWidth, w);
      }
    });
}
const tradeRow = t =>
  `<button type="button" class="mrow" data-edit="${t.id}" title="Open trade"><span>${esc(t.pair || "")} ${t.dir && market !== "stocks" ? `<span class="dirar ${t.dir}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${t.dir === "long" ? '<path d="M12 19V5M6 11l6-6 6 6"/>' : '<path d="M12 5v14M6 13l6 6 6-6"/>'}</svg></span>` : ""}<small>${esc([t.fase ? "Phase " + t.fase : "", t.concept].filter(Boolean).join(" · "))}</small></span><span class="num hint" style="margin:0">${esc(t.date || "")}</span><span class="num ${t.r > 0 ? "pos" : t.r < 0 ? "neg" : ""}">${t.r == null ? "—" : fmtR(t.r)}</span></button>`;
function setTradesHTML(lists) {
  const any = lists.some(l => l.length);
  if (!any) return "";
  return `<div class="panel"><span class="eyebrow">Trades</span><h2>Open any trade</h2>${lists
    .map(
      (l, i) =>
        `<details class="mlist" ${lists.length === 1 ? "open" : ""}><summary><i class="sdot" style="background:${scol(sets[i])}"></i>${lists.length > 1 ? `Set ${i + 1}: ` : ""}${esc(describe(sets[i].f))} (${l.length})</summary><div class="mrows">${l
          .slice()
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
          .map(tradeRow)
          .join("")}</div></details>`
    )
    .join("")}</div>`;
}
function matchHTML(bt, lv, sb, sl) {
  if (!bt.length) return "";
  const dd = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
  const ds = bt
      .map(t => t.date)
      .filter(Boolean)
      .sort(),
    from = ds[0],
    to = ds[ds.length - 1];
  const lvIn = lv.filter(
    t =>
      t.date &&
      t.date >= isoD(new Date(new Date(from + "T12:00:00") - 3 * 864e5)) &&
      t.date <= isoD(new Date(+new Date(to + "T12:00:00") + 3 * 864e5))
  );
  const cand = [];
  bt.forEach(b =>
    lvIn.forEach(l => {
      if (b.pair !== l.pair || !b.date) return;
      if (b.dir && l.dir && b.dir !== l.dir) return;
      const g = dd(b.date, l.date);
      if (Math.abs(g) <= 3) cand.push({ b, l, g });
    })
  );
  cand.sort((x, y) => Math.abs(x.g) - Math.abs(y.g));
  const ub = new Set(),
    ul = new Set(),
    pairs = [];
  cand.forEach(c => {
    if (ub.has(c.b) || ul.has(c.l)) return;
    ub.add(c.b);
    ul.add(c.l);
    pairs.push(c);
  });
  pairs.sort((x, y) => x.b.date.localeCompare(y.b.date));
  const sk = bt.filter(t => !ub.has(t)),
    xo = lvIn.filter(t => !ul.has(t));
  const sum = a => a.reduce((s, t) => s + (t.r || 0), 0),
    pb = pairs.reduce((s, c) => s + c.b.r, 0),
    pl = pairs.reduce((s, c) => s + c.l.r, 0);
  const tile = (l, v, sub, c = "") =>
    `<div class="kpi"><span class="eyebrow">${l}</span><b class="${c}">${v}</b><small class="hint" style="margin:0">${sub}</small></div>`;
  const cls = v => (v > 0 ? "pos" : v < 0 ? "neg" : "");
  const note = c => {
    const d = c.l.r - c.b.r;
    let n = c.g < 0 ? `Live ${-c.g}d earlier` : c.g > 0 ? `Live ${c.g}d later` : "Same day";
    if (Math.abs(d) < 0.05) n += " · same result";
    else if (c.b.r > 0 && c.l.r === 0) n += " · BE live, won in backtest";
    else if (c.l.r < 0 && c.b.r >= 0) n += " · stopped live";
    return n;
  };
  const list = (a, lab) =>
    a.length
      ? `<details class="mlist"><summary>${lab} (${a.length})</summary><div class="mrows">${a
          .slice()
          .sort((x, y) => (x.date || "").localeCompare(y.date || ""))
          .map(tradeRow)
          .join("")}</div></details>`
      : "";
  return `<div class="panel"><span class="eyebrow">Same trades</span><h2>Which backtest trades you took live</h2>
  <p class="hint">Matched on pair and direction, with entries no more than 3 days apart. Live trades are limited to the backtest's dates (${esc(fmtD(from))} – ${esc(fmtD(to))}).</p>
  <div class="kpis mk">${tile("Taken in both", pairs.length, `Backtest ${fmtR(pb)} · live ${fmtR(pl)}`)}${tile("Backtest only", sk.length, `Skipped live · ${fmtR(sum(sk))} missed`)}${tile("Live only", xo.length, `Not in backtest · ${fmtR(sum(xo))}`)}</div>
  ${pairs.length ? `<div class="tbl"><table class="mtab"><thead><tr><th>Pair</th><th>Backtest</th><th class="r">R</th><th>Live</th><th class="r">R</th><th class="r">Gap</th><th>Note</th></tr></thead><tbody>${pairs.map((c, i) => `<tr class="${i >= 5 ? "mx" : ""}"><td class="m-p">${esc(c.b.pair)}${c.b.dir ? `<span class="dirar ${c.b.dir}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${c.b.dir === "long" ? '<path d="M12 19V5M6 11l6-6 6 6"/>' : '<path d="M12 5v14M6 13l6 6 6-6"/>'}</svg></span>` : ""}</td><td class="num m-bd" data-l="Backtest"><button type="button" class="dlink" data-edit="${c.b.id}" title="Open backtest trade">${esc(c.b.date)}</button></td><td class="r num m-br ${cls(c.b.r)}">${fmtR(c.b.r)}</td><td class="num m-ld" data-l="Live"><button type="button" class="dlink" data-edit="${c.l.id}" title="Open live trade">${esc(c.l.date)}</button></td><td class="r num m-lr ${cls(c.l.r)}">${fmtR(c.l.r)}</td><td class="r num m-g ${cls(c.l.r - c.b.r)}">${fmtR(c.l.r - c.b.r)}</td><td class="hint m-n" style="margin:0">${note(c)}</td></tr>`).join("")}</tbody></table></div>${pairs.length > 5 ? `<button type="button" class="btn small ghost mshow" onclick="const t=this.previousElementSibling.querySelector('table');t.classList.toggle('all');this.textContent=t.classList.contains('all')?'Show fewer':'Show all ${pairs.length}'">Show all ${pairs.length}</button>` : ""}` : `<p class="hint">None of the backtest trades match a live trade.</p>`}
  ${list(sk, "Backtest trades you didn't take live")}${list(xo, "Live trades with no backtest match")}</div>`;
}
function projectsVsLive(lv) {
  const L = stats(lv);
  const ps = projects();
  const groups = ps.map(p => [p.name, METHOD[p.method] || "", btTrades(p.id)]);
  const un = btTrades("none");
  if (un.length) groups.push(["No project", "", un]);
  if (!groups.length) return "";
  const rows = groups
    .map(([n, m, l]) => {
      const s = stats(l);
      const d = s.avg != null && L.avg != null ? s.avg - L.avg : null;
      return `<tr><td>${esc(n)}</td><td>${m ? `<span class="pill ${m === "Chart scroll" ? "warn" : ""}">${m}</span>` : ""}</td><td class="r num">${s.n}</td><td class="r num">${fmtP(s.wr)}</td><td class="r num">${fmtR(s.avg)}</td><td class="r num">${d == null ? "—" : (d > 0 ? "+" : "") + d.toFixed(2) + "R"}</td></tr>`;
    })
    .join("");
  return `<div class="panel"><span class="eyebrow">Projects</span><h2>Which backtest matches live?</h2><p class="hint">The smaller the gap to live, the more you can trust that way of testing.</p>
  <div class="tbl"><table class="ptab"><thead><tr><th>Project</th><th>Method</th><th class="r">n</th><th class="r">Win</th><th class="r">Avg R</th><th class="r">Gap to live</th></tr></thead><tbody>${rows}<tr><td class="live"><b>Live</b></td><td></td><td class="r num">${L.n}</td><td class="r num">${fmtP(L.wr)}</td><td class="r num">${fmtR(L.avg)}</td><td></td></tr></tbody></table></div></div>`;
}
document.addEventListener("change", e => {
  const el = e.target;
  if (!el.dataset || !el.dataset.set) return;
  const st = sets.find(x => x.id === el.dataset.set);
  if (!st) return;
  st.f[el.dataset.key] = el.value;
  if (el.dataset.key === "mode") renderAnalyze();
  else renderResults();
});

/* ---------- desks ---------- */
function kpis(list) {
  const s = stats(list);
  return `<div class="kpis"><div class="kpi"><span class="eyebrow">Trades</span><b>${s.n}</b></div><div class="kpi"><span class="eyebrow">Win rate</span><b>${fmtP(s.wr)}</b></div><div class="kpi"><span class="eyebrow">Avg R</span><b class="${s.avg > 0 ? "pos" : s.avg < 0 ? "neg" : ""}">${fmtR(s.avg)}</b></div><div class="kpi"><span class="eyebrow">Total R</span><b>${fmtR(s.total)}</b></div><div class="kpi"><span class="eyebrow">On plan</span><b>${fmtP(s.plan)}</b></div></div>`;
}
let calMonth = new Date().toISOString().slice(0, 7),
  selDay = null,
  calTouched = false;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
let jvKey = "live";
const JVS = {};
function jvSwap(key) {
  if (key === jvKey) return;
  JVS[jvKey] = { calMonth, selDay, calTouched, jPeriod, jFrom, jTo };
  const st = JVS[key] || {
    calMonth: new Date().toISOString().slice(0, 7),
    selDay: null,
    calTouched: false,
    jPeriod: key === "live" ? "month" : "all",
    jFrom: "",
    jTo: "",
  };
  ({ calMonth, selDay, calTouched, jPeriod, jFrom, jTo } = st);
  jvKey = key;
}
function renderNotes(C) {
  const box = $("#liveNotes"),
    p = C.key.startsWith("bt:") ? projects().find(x => x.id === activeProject) : null;
  renderSim(p);
  if (!p) {
    box.innerHTML = "";
    box.dataset.pid = "";
    return;
  }
  if (box.dataset.pid !== p.id) {
    box.dataset.pid = p.id;
    box.innerHTML = `<div class="panel notes"><div class="row spread"><div><span class="eyebrow">Project</span><h2>Notes</h2></div><span class="hint nstat" id="nStat" style="margin:0"></span></div><textarea id="projNotes" class="prgrow prtext" rows="3" placeholder="Observations, rules you're testing, things to check next…"></textarea></div>`;
    $("#projNotes").value = p.notes || "";
  } else if (document.activeElement !== $("#projNotes") && $("#projNotes").value !== (p.notes || ""))
    $("#projNotes").value = p.notes || "";
  requestAnimationFrame(() => $("#projNotes") && prGrow($("#projNotes")));
}
addEventListener("resize", () => $("#projNotes") && prGrow($("#projNotes")));
document.addEventListener("input", e => {
  if (e.target.id !== "projNotes") return;
  prGrow(e.target);
  const pid = $("#liveNotes").dataset.pid;
  $("#nStat").textContent = "Saving…";
  clearTimeout(renderNotes.h);
  renderNotes.h = setTimeout(async () => {
    const p = docs.find(d => d.id === pid);
    if (!p) return;
    await saveDoc({ ...p, notes: e.target.value });
    const st = $("#nStat");
    if (st) st.textContent = "Saved";
  }, 700);
});
function jvCtx() {
  if (tab !== "backtest")
    return { key: "live", list: liveTrades(), cls: "live", title: `<h2><span>Journal</span></h2>`, extra: "" };
  const p = projects().find(x => x.id === activeProject),
    l = btTrades(activeProject),
    tg = (p && +p.target) || 0;
  return {
    key: "bt:" + activeProject,
    list: l,
    cls: "bt",
    title: `<nav class="crumbs" aria-label="Breadcrumb"><button type="button" class="crumb" data-backproj>← All projects</button><span aria-hidden="true">/</span><span>${esc(p ? p.name : "No project")}</span></nav><div class="projhead"><h2><span>${esc(p ? p.name : "No project")}</span></h2></div>`,
    extra: `<div class="projmeta">${p ? `${p.method ? `<span class="pill ${p.method === "scroll" ? "warn" : "ok"}">${METHOD[p.method]}</span>` : ""}${p.pairs || p.from || p.to ? `<span>${esc(p.pairs || "All pairs")}${p.from || p.to ? ` · ${esc(fmtD(p.from) || "…")} – ${esc(fmtD(p.to) || "…")}` : ""}</span>` : ""}${tg ? `<span class="projprog"><span class="bar"><i style="width:${Math.min(100, (l.length / tg) * 100)}%"></i></span>${l.length}/${tg} trades</span>` : ""}${p.status === "closed" ? '<span class="pill">Closed</span>' : ""}${mktOf(p) === "stocks" ? (p.simAccount && p.simMax > 0 ? `<button type="button" class="pill simpill" data-editsim="${p.id}" title="Simulation settings">Sim: ${esc(p.simAccount)} · ${p.simUnit === "pct" ? esc(+p.simMax + "%") : esc(fmtMoney(p.simMax, (accounts("stocks").find(a => a.name === p.simAccount) || {}).currency || "EUR").replace(/^\+/, ""))} per position · ${p.simMode === "fixed" ? "fixed" : "follows account"}</button>` : "") : ""}<span class="spacer"></span><button class="btn small" data-editproj="${p.id}">Edit</button><button class="btn small" data-closeproj="${p.id}">${p.status === "closed" ? "Reopen" : "Close"}</button><button class="btn small ghost danger" data-delproj="${p.id}" data-label="Delete">Delete</button>` : `<span>Older backtest trades without a project</span>`}</div>${p && p.focus ? `<p class="hint" style="margin:0">${esc(p.focus)}</p>` : ""}`,
  };
}
