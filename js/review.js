/*
 * review.js — Review tab: blind re-analysis of old forex trades, weekly/monthly period reviews, chart zoom.
 */
/* ---------- Review: blind re-analysis of old forex trades ---------- */
let rvActive = null,
  rvLocal = null,
  rvOpts = { mode: "live", acct: "", proj: "", per: "month", anchor: "", from: "", to: "" };
const rvSessions = () =>
  docs
    .filter(d => d.kind === "review" && Array.isArray(d.queue) && d.queue.length && d.i < d.queue.length)
    .sort((a, b) => (b.touched || 0) - (a.touched || 0));
const rvFinished = () =>
  docs
    .filter(d => d.kind === "review" && Array.isArray(d.queue) && d.queue.length && d.i >= d.queue.length)
    .sort((a, b) => (b.done || b.touched || 0) - (a.done || a.touched || 0));
let rvShow = null;
function rvResultHTML(x) {
  const L = x.log || [],
    n = L.length;
  if (!n)
    return `<div class="panel"><span class="eyebrow">Result</span><h2>${esc(x.name || "Review")}</h2><p class="hint">No details were saved for this session.</p></div>`;
  const same = L.filter(l => !l.diffs.length).length,
    avgD = L.reduce((s, l) => s + l.diffs.length, 0) / n,
    pc = L.filter(l => l.planThen && l.planThen !== l.planNow),
    toNo = pc.filter(l => l.planNow === "off").length,
    toYes = pc.filter(l => l.planNow === "plan").length;
  const rep = L.filter(l => l.repl).length,
    gUp = L.filter(l => l.gThen && l.gNow && l.gNow < l.gThen).length,
    gDn = L.filter(l => l.gThen && l.gNow && l.gNow > l.gThen).length;
  const cnt = {};
  L.forEach(l => l.diffs.forEach(d => (cnt[d] = (cnt[d] || 0) + 1)));
  const top = Object.entries(cnt)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const notPlan = L.filter(l => l.planNow === "off"),
    sumR = a => a.reduce((s, l) => s + (l.r || 0), 0);
  const tile = (l, v, sub) =>
    `<div class="tile"><span class="eyebrow">${l}</span><b>${v}</b>${sub ? `<small class="hint" style="margin:0">${sub}</small>` : ""}</div>`;
  return `<div class="panel rvres"><div class="row spread"><div><span class="eyebrow">Result</span><h2>${esc(x.name || "Review")}</h2></div><button type="button" class="btn small ghost" data-rvclose="1">Close</button></div>
    <div class="rvtiles">${tile("Reviewed", n, `${rep} analysis${rep === 1 ? "" : "es"} replaced`)}${tile("Same as back then", `${same} of ${n}`, `${avgD.toFixed(1)} differences per trade on average`)}${tile("Plan verdict changed", pc.length, pc.length ? `${toNo} now not to plan · ${toYes} now to plan` : "you judged every trade the same")}${tile("Grade changed", gUp + gDn, gUp + gDn ? `${gUp} better · ${gDn} worse` : "")}</div>
    ${top.length ? `<p class="rvtop"><b>Most different:</b> ${top.map(([k, v]) => `${esc(k)} (${v})`).join(" · ")}</p>` : ""}
    ${notPlan.length ? `<p class="rvtop"><b>Not to plan, according to you now:</b> ${notPlan.length} trade${notPlan.length > 1 ? "s" : ""}, together ${fmtR(sumR(notPlan))}. The rest made ${fmtR(sumR(L.filter(l => l.planNow === "plan")))}.</p>` : ""}
    <div class="tbl"><table class="rvtab rvlog"><thead><tr><th>Trade</th><th class="r">R</th><th class="r">Differences</th><th>Plan then → now</th><th>Grade</th></tr></thead><tbody>${L.map(l => `<tr><td><button type="button" class="dlink" data-edit="${l.id}">${esc(l.pair || "?")}</button> <span class="hint" style="margin:0">${esc(fmtD(l.date))}</span></td><td class="r num ${l.r > 0 ? "pos" : l.r < 0 ? "neg" : ""}">${fmtR(l.r)}</td><td class="r num">${l.diffs.length || "—"}</td><td class="${l.planThen && l.planThen !== l.planNow ? "chg" : ""}">${l.planThen === "plan" ? "Yes" : l.planThen ? "No" : "—"} → ${l.planNow === "plan" ? "Yes" : "No"}</td><td>${l.gThen ? `<span class="grade g${l.gThen}">${l.gThen}</span>` : "—"} → ${l.gNow ? `<span class="grade g${l.gNow}">${l.gNow}</span>` : "—"}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function rvState() {
  if (!rvActive) return null;
  if (!rvLocal || rvLocal.id !== rvActive) {
    const d = docs.find(x => x.id === rvActive);
    rvLocal = d ? JSON.parse(JSON.stringify(d)) : null;
  }
  return rvLocal;
}
function rvSave() {
  if (!rvLocal) return;
  rvLocal.touched = Date.now();
  saveDoc({ ...rvLocal, kind: "review" });
}
function rvRange(o) {
  const a = new Date((o.anchor || isoD(new Date())) + "T12:00:00"),
    y = a.getFullYear(),
    m = a.getMonth();
  if (o.per === "week") {
    const mon = new Date(a);
    mon.setDate(a.getDate() - ((a.getDay() + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: isoD(mon), to: isoD(sun), label: `Week of ${fmtD(isoD(mon))}` };
  }
  if (o.per === "month")
    return { from: isoD(new Date(y, m, 1)), to: isoD(new Date(y, m + 1, 0)), label: `${MONTHS[m]} ${y}` };
  if (o.per === "quarter") {
    const q = Math.floor(m / 3);
    return { from: isoD(new Date(y, q * 3, 1)), to: isoD(new Date(y, q * 3 + 3, 0)), label: `Q${q + 1} ${y}` };
  }
  if (o.per === "year") return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
  if (o.per === "custom")
    return {
      from: o.from || "",
      to: o.to || "",
      label: o.from || o.to ? `${o.from ? fmtD(o.from) : "…"} – ${o.to ? fmtD(o.to) : "…"}` : "Custom range",
    };
  return { from: "", to: "", label: "All time" };
}
function rvShift(o, d) {
  const a = new Date((o.anchor || isoD(new Date())) + "T12:00:00");
  if (o.per === "week") a.setDate(a.getDate() + 7 * d);
  else if (o.per === "month") a.setMonth(a.getMonth() + d, 1);
  else if (o.per === "quarter") a.setMonth(a.getMonth() + 3 * d, 1);
  else if (o.per === "year") a.setFullYear(a.getFullYear() + d);
  o.anchor = isoD(a);
}
const RV_STEPS = ["Weekly", "Daily", "4H"],
  RV_SLOT = { Weekly: "weekly", Daily: "daily", "4H": "h4" };
const rvWkCrit = () => WCRIT.filter(([k]) => k !== "pattern" && k !== "trend");
function rvPool(o) {
  return docs.filter(
    t =>
      !t.kind &&
      (!o.unrev || !(t.reviews && t.reviews.length)) &&
      mktOf(t) === "fx" &&
      t.status !== "missed" &&
      t.r != null &&
      (o.mode === "both" || t.mode === o.mode) &&
      (o.mode !== "live" || !o.acct || t.account === o.acct) &&
      (o.mode !== "backtest" || !o.proj || t.project === o.proj) &&
      (() => {
        const r = rvRange(o);
        return (!r.from || (t.date || "") >= r.from) && (!r.to || (t.date || "") <= r.to);
      })() &&
      t.shotLinks &&
      (t.shotLinks.weekly || t.shotLinks.daily || t.shotLinks.h4)
  );
}
function rvOrig(t) {
  const w = { ...(t.weekly || {}) },
    wms = w.ms || "";
  delete w.ms;
  delete w.pattern;
  return {
    dir: t.dir || "",
    fase: t.fase ? String(t.fase) : "",
    wStruct: t.wStruct || "",
    wms,
    wPat: t.wPat || "",
    wPatSub: t.wPatSub || "",
    weekly: w,
    concept: t.concept || "",
    sub: t.sub && t.sub !== "—" && t.concept !== "Weekly - 4H" ? t.sub : "",
    dMs: t.dMs || "",
    dPros: dProsOf(t),
    entry4h: t.entry4h || "",
    hMs: t.hMs || "",
    struct: t.struct || (t.bos === "ja" ? "bos" : t.bos === "nee" ? "som" : ""),
    room: t.room === "ja",
    scaleIn: !!t.scaleIn,
  };
}
const rvAsTrade = a => ({
  wRange: !!a.wRange,
  weekly: { ...a.weekly, ...(a.wms ? { ms: a.wms } : {}), ...(a.wPat ? { pattern: "for" } : {}) },
  dMs: a.dMs,
  hMs: a.hMs,
  dPros: a.dPros,
  wStruct: a.wStruct,
});
const rvBlank = () => ({
  dir: "",
  fase: "",
  wStruct: "",
  wms: "",
  wPat: "",
  wPatSub: "",
  weekly: {},
  concept: "",
  sub: "",
  dMs: "",
  dPros: [],
  entry4h: "",
  hMs: "",
  struct: "",
  room: false,
  scaleIn: false,
});
const rvSeg = (k, opts, v) =>
  `<div class="segs">${opts.map(([val, l]) => `<button type="button" class="rvb${v === val ? " on" : ""}" data-rk="${k}" data-rv="${val}">${l}</button>`).join("")}</div>`;
const rvMs = (k, v) =>
  `<div class="segs">${[
    ["for", "✓ With", "ok"],
    ["against", "✗ Against", "no"],
  ]
    .map(
      ([val, l, c]) =>
        `<button type="button" class="rvb ${c}${v === val ? " on" : ""}" data-rk="${k}" data-rv="${val}">${l}</button>`
    )
    .join("")}</div>`;
const rvSel = (k, opts, v, ph) =>
  `<select data-rks="${k}"><option value="">${ph}</option>${opts.map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
const rvF = (l, h) => `<div class="f"><span>${l}</span>${h}</div>`;
function rvChart(t, step) {
  const ln = (t.shotLinks || {})[RV_SLOT[step]],
    img = tvImg(ln);
  if (!ln) return `<div class="rvimg none">No ${step.toLowerCase()} chart saved for this trade.</div>`;
  if (!img) return `<div class="rvimg none">This chart link can't be shown as a picture.</div>`;
  return `<div class="rvimg" data-rvzoom="${esc(img)}" title="Click to zoom"><img src="${esc(img)}" alt="${step} chart" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('none');this.parentNode.removeAttribute('data-rvzoom');this.parentNode.textContent='Chart could not load here. It works in the GitHub app.'"><span class="rvmask tl"></span><span class="rvzhint">⤢ Zoom</span></div>`;
}
let rvOpen = "";
function rvMsBox(key, label, kind, CR, get) {
  const open = rvOpen === key,
    mine = CR.filter(([k]) => get(k) === kind);
  return `<div class="f"><span>${label}</span><div class="ms rvms${open ? " open" : ""}" data-rvbox="${key}"><button type="button" class="ms-field" data-rvopen="${key}">${mine.length ? mine.map(([k, l]) => `<span class="chip-sel ${kind}">${esc(l)}<span class="x" data-rvx="${key}:${k}">×</span></span>`).join("") : '<span class="ph">Choose criteria…</span>'}<span class="caret">▾</span></button>
  <ul class="ms-list" ${open ? "" : "hidden"}>${CR.map(([k, l]) => {
    const v = get(k),
      other = v && v !== kind,
      on = v === kind;
    return `<li data-rvpick="${key}:${k}" class="${other ? "dis" : ""}"><span class="box ${kind}">${on ? "✓" : ""}</span>${esc(l)}${other ? `<em>in ${kind === "for" ? "cons" : "pros"}</em>` : ""}</li>`;
  }).join("")}</ul></div></div>`;
}
function rvStepHTML(a, step) {
  if (step === "Weekly")
    return `<div class="fields">${rvF(
      "Weekly phase",
      rvSeg(
        "fase",
        [
          ["1", "1"],
          ["2", "2"],
          ["3", "3"],
          ["4", "4"],
        ],
        a.fase
      )
    )}${rvF(
      "Inner / outer",
      rvSeg(
        "wStruct",
        [
          ["inner", "Inner"],
          ["outer", "Outer"],
        ],
        a.wStruct
      )
    )}${rvF("Market structure", rvMs("wms", a.wms))}${rvF(
      "Market trend",
      rvSeg(
        "wtrend",
        [
          ["for", "✓ With"],
          ["against", "✗ Against"],
        ],
        (a.weekly || {}).trend || ""
      )
    )}${rvF("Ranging", rvSeg("wRange", [["yes", "↔ Ranging"]], a.wRange ? "yes" : ""))}
    ${rvF("Weekly pattern", rvSel("wPat", ["Continuation", "Reversal", "Pattern in Pattern"], a.wPat, "No pattern"))}${a.wPat && a.wPat !== "Reversal" ? rvF('Pattern variant <em class="opt">optional</em>', rvSel("wPatSub", PLAN.concepts[a.wPat] || [], a.wPatSub, "Not set")) : ""}${rvF(
      "Direction",
      rvSeg(
        "dir",
        [
          ["long", "↑ Long"],
          ["short", "↓ Short"],
        ],
        a.dir
      )
    )}</div>
    <div class="fields rv2" style="margin-top:14px">${rvMsBox("wp", "Pros", "for", rvWkCrit(), k => a.weekly[k])}${rvMsBox("wc", "Cons", "against", rvWkCrit(), k => a.weekly[k])}</div>`;
  if (step === "Daily")
    return `<div class="fields">${rvF("Trade concept", rvSel("concept", Object.keys(PLAN.concepts), a.concept, "Choose…"))}${
      a.concept !== "Weekly - 4H" && (PLAN.concepts[a.concept] || []).filter(x => x !== "—").length
        ? rvF(
            'Daily variant <em class="opt">optional</em>',
            rvSel(
              "sub",
              PLAN.concepts[a.concept].filter(x => x !== "—"),
              a.sub,
              "Not set"
            )
          )
        : ""
    }${rvF("Market structure", rvMs("dMs", a.dMs))}</div>
    <div class="fields" style="margin-top:12px"><div class="f wide">${rvMsBox("dp", "Pros", "for", DCRIT, k =>
      a.dPros.includes(k) ? "for" : ""
    )
      .replace(/^<div class="f">/, "")
      .replace(/<\/div>$/, "")}</div></div>`;
  return `<div class="fields">${rvF("4H entry", rvSel("entry4h", PLAN.entries, a.entry4h, "Choose…"))}${rvF("Market structure", rvMs("hMs", a.hMs))}${
    hasStruct(a.entry4h)
      ? rvF(
          "4H structure",
          rvSeg(
            "struct",
            [
              ["bos", "BoS"],
              ["som", "SoM"],
            ],
            a.struct
          )
        )
      : ""
  }</div>
    <div class="row" style="gap:16px;margin-top:12px"><label class="checkline"><input type="checkbox" data-rc="room" ${a.room ? "checked" : ""}><span>Room</span></label><label class="checkline"><input type="checkbox" data-rc="scaleIn" ${a.scaleIn ? "checked" : ""}><span>Scale-in</span></label></div>`;
}
const rvPick = (o, k) =>
  k === "wRange"
    ? !!(o.wRange || (o.weekly || {}).trend === "range")
    : k === "trend"
      ? (o.weekly || {}).trend === "range"
        ? ""
        : (o.weekly || {}).trend || ""
      : k === "wpros" || k === "wcons"
        ? WCRIT.map(c => c[0]).filter(x => x !== "trend" && (o.weekly || {})[x] === (k === "wpros" ? "for" : "against"))
        : k === "dPros"
          ? DCRIT.map(c => c[0]).filter(x => (o.dPros || []).includes(x))
          : o[k];
function rvLab(k, v) {
  if (k === "wpros" || k === "wcons") return v.length ? v.map(x => WLAB(x)).join(", ") : "—";
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "—";
  if (k === "dir") return v === "long" ? "↑ Long" : "↓ Short";
  if (k === "wms" || k === "dMs" || k === "hMs" || k === "trend")
    return v === "for" ? "✓ With" : v === "range" ? "↔ Range" : "✗ Against";
  if (k === "wStruct") return v === "inner" ? "Inner" : "Outer";
  if (k === "struct") return v === "bos" ? "BoS" : "SoM";
  if (k === "room" || k === "scaleIn" || k === "wRange") return v ? "Yes" : "No";
  if (k === "dPros") return v.map(x => (DCRIT.find(c => c[0] === x) || [, x])[1]).join(", ");
  if (k === "weekly") {
    const e = Object.entries(v).filter(([, x]) => x);
    if (!e.length) return "—";
    return e.map(([x, y]) => (y === "for" ? "✓ " : "✗ ") + WLAB(x)).join(", ");
  }
  if (k === "fase") return "Phase " + v;
  return String(v);
}
const RV_ROWS = [
  ["dir", "Direction"],
  ["fase", "Weekly phase"],
  ["wStruct", "Inner / outer"],
  ["wms", "Weekly MS"],
  ["trend", "Market trend"],
  ["wRange", "Ranging"],
  ["wPat", "Weekly pattern"],
  ["wPatSub", "Pattern variant"],
  ["wpros", "Weekly pros"],
  ["wcons", "Weekly cons"],
  ["concept", "Trade concept"],
  ["sub", "Daily variant"],
  ["dMs", "Daily MS"],
  ["dPros", "Daily pros"],
  ["entry4h", "4H entry"],
  ["hMs", "4H MS"],
  ["struct", "4H structure"],
  ["room", "Room"],
  ["scaleIn", "Scale-in"],
];
const rvEq = (a, b) =>
  JSON.stringify(
    a instanceof Array
      ? [...a].sort()
      : a && typeof a === "object"
        ? Object.fromEntries(
            Object.entries(a)
              .filter(([, v]) => v)
              .sort()
          )
        : a
  ) ===
  JSON.stringify(
    b instanceof Array
      ? [...b].sort()
      : b && typeof b === "object"
        ? Object.fromEntries(
            Object.entries(b)
              .filter(([, v]) => v)
              .sort()
          )
        : b
  );
function rvDoneHTML() {
  const T = trades()
    .filter(t => t.reviews && t.reviews.length && mktOf(t) === "fx")
    .map(t => ({ t, n: t.reviews.length, last: t.reviews[t.reviews.length - 1] }))
    .sort((a, b) => b.last.at.localeCompare(a.last.at));
  if (!T.length) return "";
  const pl = v => (v === "plan" ? "Yes" : v ? "No" : "—");
  return `<div class="panel"><details class="rvdone"><summary><span class="eyebrow">Progress</span><h2>Re-evaluated trades <small class="hint" style="margin:0;font-weight:400">${T.length}</small></h2></summary><div style="overflow-x:auto"><table class="rvdt"><thead><tr><th>Trade</th><th>Pair</th><th>Re-evaluated</th><th>Times</th><th>To plan now</th></tr></thead><tbody>${T.map(({ t, n, last }) => `<tr data-rvopen-t="${t.id}"><td>${esc(fmtD(t.date))}</td><td>${esc(t.pair || "")}</td><td>${esc(fmtD(last.at.slice(0, 10)))}</td><td>${n}×</td><td>${pl(last.plan)}</td></tr>`).join("")}</tbody></table></div></details></div>`;
}
/* ---------- period reviews ---------- */
let rvMode = (() => {
  try {
    return localStorage.getItem("tj-rvmode") || "period";
  } catch {
    return "period";
  }
})();
let prSel = { per: "week", anchor: "" },
  prOpen = null,
  prFilt = "";
const PR_PER = [
  ["week", "Week"],
  ["month", "Month"],
  ["quarter", "Quarter"],
  ["year", "Year"],
];
const PR_Q = [
  ["notes", "Notes"],
  ["good", "What went well"],
  ["bad", "What went wrong"],
  ["next", "Focus for next period"],
];
const PR_TYPES = [
  ["text", "Text"],
  ["watch", "Watchlist"],
  ["bad", "Trades not to plan"],
  ["good", "Trades to plan"],
  ["missed", "Missed trades"],
  ["trades", "All taken trades"],
];
const PR_TRT = ["bad", "good", "missed", "trades"];
const PR_DEFSECS = [
  { id: "w", type: "watch", title: "Watchlist" },
  { id: "b", type: "bad", title: "Trades not to plan" },
  { id: "g", type: "good", title: "Trades to plan" },
  { id: "m", type: "missed", title: "Missed trades" },
  { id: "n", type: "text", title: "Notes" },
  { id: "c", type: "text", title: "Conclusion" },
];
const prSecs = per => {
  const T = getSet().prSecs || {};
  return T[per] || T.week || PR_DEFSECS;
};
const prSid = () => "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
let prCur = { sec: {} };
const prTF = (type, list) => {
  const fx = market === "fx",
    tk = list.filter(t => t.status !== "missed");
  return type === "missed"
    ? list.filter(t => t.status === "missed")
    : type === "good"
      ? tk.filter(t => (fx ? t.evaluation === "plan" : t.r >= 0))
      : type === "bad"
        ? tk.filter(t => (fx ? t.evaluation && t.evaluation !== "plan" : t.r < 0))
        : tk;
};
function prTList(type, list, sid) {
  const a = prTF(type, list);
  if (!a.length) return `<p class="hint" style="margin:0">None</p>`;
  const tc = (prCur.sec[sid] || {}).tc || {};
  return a
    .map(t => {
      const oc = t.outcome || (t.r > 0 ? "win" : t.r < 0 ? "loss" : t.r === 0 ? "be" : "");
      const gr = market === "fx" ? tGrade(t) : null;
      return `<button type="button" class="prtr" data-propen="${t.id}">${gr ? `<b class="grade g${gr}">${gr}</b>` : market === "fx" ? `<b class="grade" style="opacity:.35">–</b>` : ""}<b>${esc(t.ticker || t.pair || "?")}</b><span class="dirar ${t.dir}">${t.dir === "long" ? "↑" : t.dir === "short" ? "↓" : ""}</span>${t.status === "missed" ? `<span class="hint" style="margin:0">${esc(fmtD(t.date))}</span>` : oc ? `<span class="restag ${oc}">${{ win: "Win", loss: "Loss", be: "BE", open: "Open" }[oc]}${oc === "open" ? "" : `<b class="num">${fmtR(t.r)}</b>`}</span>` : `<span class="restag open">Open</span>`}</button><textarea rows="1" class="prgrow" data-prs="${sid}" data-f="tc" data-t="${t.id}" placeholder="Comment" aria-label="Comment on ${esc(t.ticker || t.pair || "trade")}">${esc(tc[t.id] || "")}</textarea>`;
    })
    .map(x => `<div class="prtrow">${x}</div>`)
    .join("");
}
const prTKey = (type, list) =>
  prTF(type, list)
    .map(t => t.id + ":" + t.r + ":" + t.evaluation + ":" + t.status)
    .join("|");
function prWRow(x, r, i) {
  return `<div class="prwr"><input type="text" value="${esc(r.pair || "")}" data-prs="${x.id}" data-f="pair" data-i="${i}" aria-label="Pair" autocapitalize="characters"><div class="segs prdir">${[
    ["long", "↑ Long"],
    ["short", "↓ Short"],
  ]
    .map(
      ([v, l]) =>
        `<button type="button" class="rvb${r.dir === v ? " on" : ""} ${v}" data-prdir="${v}" data-prs="${x.id}" data-i="${i}">${l}</button>`
    )
    .join(
      ""
    )}</div><textarea rows="1" class="prgrow" data-prs="${x.id}" data-f="note" data-i="${i}" aria-label="Note">${esc(r.note || "")}</textarea><button type="button" class="prx" data-prrm="${x.id}" data-i="${i}" aria-label="Remove">×</button></div>`;
}
function prSecHTML(x, list) {
  const v = prCur.sec[x.id] || {},
    hd = `<h3>${esc(x.title || "")}</h3>${x.hint ? `<p class="hint" style="margin:0">${esc(x.hint)}</p>` : ""}`;
  if (x.type === "watch") {
    const rows = v.rows || [];
    return `<div class="panel prsec full" id="prsec-${x.id}">${hd}<div class="prwl">${rows.length ? rows.map((r, i) => prWRow(x, r, i)).join("") : `<p class="hint" style="margin:0">No pairs</p>`}</div><button type="button" class="btn small ghost" data-pradd="${x.id}">+ Add pair</button></div>`;
  }
  if (PR_TRT.includes(x.type))
    return `<div class="panel prsec full" id="prsec-${x.id}">${hd}<div class="prtl" id="prtl-${x.id}" data-k="${esc(prTKey(x.type, list))}">${prTList(x.type, list, x.id)}</div>${v.text ? `<textarea rows="2" class="prgrow prtext" data-prs="${x.id}" data-f="text" aria-label="${esc(x.title || "")} comment">${esc(v.text)}</textarea>` : ""}<button type="button" class="btn small ghost" data-praddt="${x.type}">+ Add ${x.type === "missed" ? "missed " : ""}trade</button></div>`;
  return `<div class="panel prsec full" id="prsec-${x.id}">${hd}<textarea rows="3" class="prgrow prtext" data-prs="${x.id}" data-f="text" aria-label="${esc(x.title || "")}">${esc(v.text || "")}</textarea></div>`;
}
const prGrow = el => {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + 2 + "px";
};
const prGrowAll = () => document.querySelectorAll("#prBox textarea.prgrow").forEach(prGrow);
addEventListener("resize", () => {
  if (prOpen) prGrowAll();
});
function prSave() {
  if (!prOpen) return;
  const st = $("#prStat");
  if (st) st.textContent = "Saving…";
  clearTimeout(prSave.h);
  const per = prOpen.per,
    from = prOpen.from;
  prSave.h = setTimeout(async () => {
    const R = prRange(per, from),
      cur = prFind(per, R.from) || {
        id: prId(per, R.from),
        kind: "preview",
        market,
        per,
        from: R.from,
        to: R.to,
        created: Date.now(),
        secs: prSecs(per),
      };
    const nd = { ...cur, sec: JSON.parse(JSON.stringify(prCur.sec)), updated: Date.now() };
    if (!nd.secs) nd.secs = prSecs(per);
    PR_Q.forEach(([q]) => {
      const el = $("#prq-" + q);
      if (el) nd[q] = el.value;
    });
    await saveDoc(nd);
    const s2 = $("#prStat");
    if (s2) s2.textContent = "Saved";
  }, 600);
}
document.addEventListener("input", e => {
  if (!prOpen || !e.target.closest("#prBox")) return;
  const el = e.target,
    id = el.dataset.prs,
    f = el.dataset.f;
  if (el.classList.contains("prgrow")) prGrow(el);
  if (id) {
    const v = (prCur.sec[id] = prCur.sec[id] || {});
    if (f === "text") v.text = el.value;
    else if (f === "tc") v.tc = { ...(v.tc || {}), [el.dataset.t]: el.value };
    else {
      v.rows = v.rows && v.rows.length ? v.rows : [{}];
      const i = +el.dataset.i;
      v.rows[i] = { ...v.rows[i], [f]: f === "pair" ? el.value.toUpperCase() : el.value };
      if (f === "pair") {
        const p = el.selectionStart;
        el.value = el.value.toUpperCase();
        el.setSelectionRange(p, p);
      }
    }
    prSave();
  } else if (el.dataset.prq) prSave();
});
let tplPer = "week";
function tplRender() {
  const box = $("#tplEd");
  if (!box) return;
  const T = getSet().prSecs || {},
    own = T[tplPer],
    arr = own || (tplPer === "week" ? PR_DEFSECS : null);
  box.innerHTML =
    `<div class="segs" style="margin-bottom:12px">${PR_PER.map(([v, l]) => `<button type="button" class="rvb${tplPer === v ? " on" : ""}" data-tplper="${v}">${l}</button>`).join("")}</div>` +
    (!arr
      ? `<p class="hint">${prPerL(tplPer)}ly reviews use the weekly layout.</p><button type="button" class="btn small" data-tplcustom>Customize ${prPerL(tplPer).toLowerCase()}ly layout</button>`
      : `<div class="tpll">${arr.map((x, i) => `<div class="tplr"><input type="text" value="${esc(x.title || "")}" data-tplf="title" data-i="${i}" aria-label="Section title"><select data-tplf="type" data-i="${i}" aria-label="Section type">${PR_TYPES.map(([v, l]) => `<option value="${v}" ${x.type === v ? "selected" : ""}>${l}</option>`).join("")}</select><input type="text" value="${esc(x.hint || "")}" data-tplf="hint" data-i="${i}" placeholder="Prompt (optional)" aria-label="Prompt"><span class="tplbt"><button type="button" data-tplmv="-1" data-i="${i}" ${i ? "" : "disabled"} aria-label="Move up">↑</button><button type="button" data-tplmv="1" data-i="${i}" ${i < arr.length - 1 ? "" : "disabled"} aria-label="Move down">↓</button><button type="button" data-tplrm data-i="${i}" aria-label="Remove">×</button></span></div>`).join("")}</div>
   <div class="row" style="margin-top:10px;gap:6px"><button type="button" class="btn small" data-tpladd>+ Add section</button><span class="spacer"></span>${tplPer === "week" ? (own ? `<button type="button" class="btn small ghost" data-tplreset>Reset to default</button>` : "") : `<button type="button" class="btn small ghost" data-tplreset>Use weekly layout</button>`}</div>
   <p class="hint" style="margin:10px 0 0">Trade sections fill themselves with the trades of that period. Changes apply to new reviews; saved reviews keep their layout.</p>`);
}
function tplSave(arr) {
  const cur = docs.find(x => x.id === "settings") || { id: "settings", kind: "settings" },
    T = { ...(cur.prSecs || {}) };
  if (arr) T[tplPer] = arr;
  else delete T[tplPer];
  saveDoc({ ...cur, prSecs: T });
  setTimeout(tplRender, 0);
}
const tplArr = () =>
  JSON.parse(JSON.stringify((getSet().prSecs || {})[tplPer] || (tplPer === "week" ? PR_DEFSECS : prSecs("week"))));
document.addEventListener("click", e => {
  const b = e.target.closest("#tplEd button");
  if (!b) return;
  if (b.dataset.tplper) {
    tplPer = b.dataset.tplper;
    return tplRender();
  }
  if (b.dataset.tplcustom != null) return tplSave(tplArr());
  if (b.dataset.tplreset != null) return tplSave(null);
  const a = tplArr(),
    i = +b.dataset.i;
  if (b.dataset.tpladd != null) {
    a.push({ id: prSid(), type: "text", title: "New section" });
    return tplSave(a);
  }
  if (b.dataset.tplrm != null) {
    a.splice(i, 1);
    return tplSave(a);
  }
  if (b.dataset.tplmv) {
    const j = i + +b.dataset.tplmv;
    [a[i], a[j]] = [a[j], a[i]];
    return tplSave(a);
  }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (!el.dataset || el.dataset.tplf == null) return;
  const a = tplArr(),
    i = +el.dataset.i;
  a[i][el.dataset.tplf] = el.value;
  tplSave(a);
});
const prDocs = () =>
  docs
    .filter(d => d.kind === "preview" && (d.market || "fx") === market)
    .sort(
      (a, b) =>
        b.from.localeCompare(a.from) || PR_PER.findIndex(p => p[0] === a.per) - PR_PER.findIndex(p => p[0] === b.per)
    );
const prFind = (per, from) => prDocs().find(d => d.per === per && d.from === from);
const prId = (per, from) => `pr_${market}_${per}_${from}`;
const prWeekNo = d => {
  const x = new Date(d + "T12:00:00");
  x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));
  const w1 = new Date(x.getFullYear(), 0, 4);
  return 1 + Math.round(((x - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
};
const prLabel = (per, R) => (per === "week" ? `Week ${prWeekNo(R.from)} · ${fmtD(R.from)} – ${fmtD(R.to)}` : R.label);
const prRange = (per, anchor) => {
  const R = rvRange({ per, anchor });
  return { ...R, label: prLabel(per, R) };
};
const prLastA = p => {
  const a = new Date();
  if (p === "week") a.setDate(a.getDate() - 7);
  else if (p === "month") a.setMonth(a.getMonth() - 1, 1);
  else if (p === "quarter") a.setMonth(a.getMonth() - 3, 1);
  else a.setFullYear(a.getFullYear() - 1);
  return isoD(a);
};
const prPerL = p => (PR_PER.find(x => x[0] === p) || ["", ""])[1];
function prTrades(R) {
  const all = market === "stocks" ? trades().map(sPct) : trades();
  return all
    .filter(t => t.mode === "live" && (t.date || "") >= R.from && (t.date || "") <= R.to)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}
function prStatsHTML(list) {
  const ps = stats(list),
    tk = taken(list),
    w = tk.filter(t => t.r > 0).length,
    be = tk.filter(t => t.r === 0).length,
    l = tk.filter(t => t.r < 0).length,
    miss = list.filter(t => t.status === "missed").length,
    fx = market === "fx";
  const tile = (lab, v, c = "", sub = "") =>
      `<div class="prst"><span>${lab}</span><b class="num ${c}">${v}</b>${sub ? `<small>${sub}</small>` : ""}</div>`,
    sg = v => (v > 0 ? "pos" : v < 0 ? "neg" : "");
  let g = "";
  if (fx && tk.length && feat("grade")) {
    const G = { A: [], B: [], C: [], X: [] };
    tk.forEach(t => {
      const x = tGrade(t);
      if (x) G[x].push(t.r);
    });
    g = `<div class="prgrades">${GRADES.map(k => `<span><b class="grade g${k}">${k}</b> ${G[k].length} · <span class="num ${sg(G[k].reduce((a, b) => a + b, 0))}">${G[k].length ? fmtR(G[k].reduce((a, b) => a + b, 0)) : "—"}</span></span>`).join("")}</div>`;
  }
  return `<div class="prtiles">${tile("Trades", tk.length, "", miss ? `${miss} missed` : "")}${tile(fx ? "Total R" : "Total", tk.length ? fmtR(ps.total) : "—", sg(ps.total))}${tile("Win rate", fmtP(ps.wr))}${tile(fx ? "Avg R" : "Avg ROI", fmtR(ps.avg), sg(ps.avg))}${fx ? tile("To plan", fmtP(ps.plan)) : ""}</div>
  ${tk.length ? `<div class="bstack sm">${w ? `<div class="bseg" style="flex:${w};background:var(--good)"></div>` : ""}${be ? `<div class="bseg" style="flex:${be};background:var(--be)"></div>` : ""}${l ? `<div class="bseg" style="flex:${l};background:var(--bad)"></div>` : ""}</div><div class="prbar"><span class="hint" style="margin:0">${w} W · ${be} BE · ${l} L</span>${g}</div>` : ""}`;
}
function prTradesHTML(list) {
  if (!list.length) return `<p class="hint" style="margin:0">No live trades in this period.</p>`;
  const fx = market === "fx";
  return `<div style="overflow-x:auto"><table class="rvdt prtt"><thead><tr><th>Date</th><th>${fx ? "Pair" : "Ticker"}</th>${fx ? "<th>Grade</th>" : ""}<th>Result</th>${fx ? "<th>To plan</th>" : ""}<th></th></tr></thead><tbody>${list
    .map(t => {
      const oc = t.status === "missed" ? "" : t.outcome || (t.r > 0 ? "win" : t.r < 0 ? "loss" : t.r === 0 ? "be" : "");
      const gr = fx ? tGrade(t) : null;
      return `<tr data-propen="${t.id}"><td>${esc(fmtD(t.date))}</td><td>${esc(t.ticker || t.pair || "")} <span class="dirar ${t.dir}">${t.dir === "long" ? "↑" : t.dir === "short" ? "↓" : ""}</span></td>${fx ? `<td>${gr ? `<b class="grade g${gr}">${gr}</b>` : "—"}</td>` : ""}<td>${t.status === "missed" ? `<span class="hint" style="margin:0">Missed</span>` : oc ? `<span class="restag ${oc}">${{ win: "Win", loss: "Loss", be: "BE", open: "Open" }[oc]}${oc === "open" ? "" : `<b class="num">${fmtR(t.r)}</b>`}</span>` : `<span class="restag open">Open</span>`}</td>${fx ? `<td>${t.evaluation === "plan" ? "Yes" : t.evaluation ? `<span class="neg">No</span>` : "—"}</td>` : ""}<td>${LSLOTS.some(([k]) => hasShot(t, k)) ? `<button type="button" class="btn small ghost" data-prcharts="${t.id}">Charts</button>` : ""}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}
function prSnippet(d) {
  const v = [
    ...(d.secs || []).map(x => {
      const q = (d.sec || {})[x.id] || {};
      return (
        q.text ||
        (q.rows || [])
          .map(r => [r.pair, r.dir].filter(Boolean).join(" "))
          .filter(Boolean)
          .join(", ")
      );
    }),
    ...PR_Q.map(([k]) => d[k]),
  ].find(x => x && x.trim());
  return v ? v.trim().replace(/\s+/g, " ").slice(0, 90) + (v.trim().length > 90 ? "…" : "") : "";
}
function prDueUpd() {
  const b = document.querySelector('nav button[data-tab="review"]');
  if (!b) return;
  const R = prRange("week", prLastA("week")),
    due = docsReady && !prFind("week", R.from);
  b.classList.toggle("due", due);
  b.title = due ? `${R.label} isn't reviewed yet` : "";
}
function prRender() {
  const box = $("#prBox");
  if (prOpen) {
    const R = prRange(prOpen.per, prOpen.from),
      d = prFind(prOpen.per, R.from) || {},
      list = prTrades(R),
      sig = market + prOpen.per + R.from,
      secs = d.secs || prSecs(prOpen.per);
    if (box.dataset.sig === sig && $("#prStats")) {
      $("#prStats").innerHTML = prStatsHTML(list);
      $("#prTrades").innerHTML = prTradesHTML(list);
      secs
        .filter(x => PR_TRT.includes(x.type))
        .forEach(x => {
          const el = $("#prtl-" + x.id),
            k = prTKey(x.type, list);
          if (el && el.dataset.k !== k) {
            el.dataset.k = k;
            el.innerHTML = prTList(x.type, list, x.id);
            prGrowAll();
          }
        });
      $("#prDel").hidden = !d.id;
      return;
    }
    box.dataset.sig = sig;
    prCur = { sec: JSON.parse(JSON.stringify(d.sec || {})) };
    const leg = PR_Q.filter(([k]) => d[k]);
    box.innerHTML = `<div class="panel prhead"><div class="row spread" style="align-items:center"><button type="button" class="btn small ghost" data-prback>‹ All reviews</button><div class="row" style="gap:10px;align-items:center"><span class="hint nstat" id="prStat" style="margin:0"></span><button type="button" class="btn small ghost danger" id="prDel" ${d.id ? "" : "hidden"}>Delete</button></div></div>
      <div class="prtitle"><div><span class="eyebrow">${prPerL(prOpen.per)}ly review</span><h2>${esc(R.label)}</h2></div></div>
      <div id="prStats">${prStatsHTML(list)}</div></div>
      <div class="prsecs">${secs.map(x => prSecHTML(x, list)).join("")}${leg.map(([k, l]) => `<div class="panel prsec full"><h3>${esc(l)}</h3><textarea id="prq-${k}" data-prq="${k}" rows="5">${esc(d[k] || "")}</textarea></div>`).join("")}</div>
      <details class="panel prall"><summary><span class="eyebrow">All trades</span> <span class="hint" style="margin:0">${list.length}</span></summary><div id="prTrades" style="margin-top:8px">${prTradesHTML(list)}</div></details>`;
    prGrowAll();
    return;
  }
  box.dataset.sig = "";
  const R = prRange(prSel.per, prSel.anchor || todayISO()),
    ex = prFind(prSel.per, R.from),
    L = prDocs().filter(d => !prFilt || d.per === prFilt);
  const last = PR_PER.map(([p, l]) => {
    const a = new Date();
    if (p === "week") a.setDate(a.getDate() - 7);
    else if (p === "month") a.setMonth(a.getMonth() - 1, 1);
    else if (p === "quarter") a.setMonth(a.getMonth() - 3, 1);
    else a.setFullYear(a.getFullYear() - 1);
    const r = prRange(p, isoD(a));
    return { p, l, r, done: !!prFind(p, r.from) };
  });
  box.innerHTML = `<div class="panel"><span class="eyebrow">New review</span><h2>Review a period</h2>
    <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px">${last.map(x => `<button type="button" class="btn small${x.done ? " ghost" : ""}${!x.done && x.p === "week" ? " primary" : ""}" data-prgo="${x.p}|${x.r.from}">${x.done ? "✓ " : ""}Last ${x.l.toLowerCase()}</button>`).join("")}</div>
    <div class="row" style="margin-top:14px;flex-wrap:wrap;gap:8px;align-items:center"><div class="segs">${PR_PER.map(([v, l]) => `<button type="button" class="rvb${prSel.per === v ? " on" : ""}" data-prper="${v}">${l}</button>`).join("")}</div>
      <div class="row" style="gap:4px;align-items:center"><button type="button" class="btn small ghost" data-prshift="-1" aria-label="Previous">‹</button><b style="min-width:150px;text-align:center;font-size:14px">${esc(R.label)}</b><button type="button" class="btn small ghost" data-prshift="1" aria-label="Next">›</button></div>
      <button type="button" class="btn small primary" data-prgo="${prSel.per}|${R.from}">${ex ? "Open review" : "Start review"}</button></div></div>
    <div class="panel" style="margin-top:20px"><div class="row spread" style="align-items:center"><div><span class="eyebrow">Saved</span><h2 style="margin:2px 0 0">Your reviews <small class="hint" style="margin:0;font-weight:400">${prDocs().length}</small></h2></div><div class="segs">${[["", "All"], ...PR_PER].map(([v, l]) => `<button type="button" class="rvb${prFilt === v ? " on" : ""}" data-prfilt="${v}">${l}</button>`).join("")}</div></div>
    ${
      L.length
        ? `<div style="overflow-x:auto;margin-top:8px"><table class="rvdt prlist"><thead><tr><th>Period</th><th>Trades</th><th>Result</th><th>Notes</th></tr></thead><tbody>${L.map(
            d => {
              const r = prRange(d.per, d.from),
                tl = prTrades(r),
                ps = stats(tl);
              return `<tr data-prgo="${d.per}|${d.from}"><td><span class="prtype">${prPerL(d.per)}</span> ${esc(r.label)}</td><td>${taken(tl).length}</td><td class="num ${ps.total > 0 ? "pos" : ps.total < 0 ? "neg" : ""}">${taken(tl).length ? fmtR(ps.total) : "—"}</td><td class="hint" style="margin:0">${esc(prSnippet(d))}</td></tr>`;
            }
          ).join("")}</tbody></table></div>`
        : `<p class="hint" style="margin:10px 0 0">No ${prFilt ? prPerL(prFilt).toLowerCase() + " " : ""}reviews saved yet.</p>`
    }</div>`;
}
document.addEventListener("click", e => {
  const box = e.target.closest("#prBox, #rvTop");
  if (!box) return;
  const md = e.target.closest("[data-rvmode]");
  if (md) {
    rvMode = md.dataset.rvmode;
    try {
      localStorage.setItem("tj-rvmode", rvMode);
    } catch {}
    if (rvMode !== "game" && rvActive) {
      rvSave();
      rvActive = null;
      rvLocal = null;
      rvOpen = "";
    }
    return rvRender();
  }
  const ch = e.target.closest("[data-prcharts]");
  if (ch) {
    openViewer(ch.dataset.prcharts);
    return;
  }
  const tr = e.target.closest("[data-propen]");
  if (tr) {
    const t = docs.find(d => d.id === tr.dataset.propen);
    if (t) mktOf(t) === "stocks" ? openStock(t) : openSheet2(t);
    return;
  }
  const go = e.target.closest("[data-prgo]");
  if (go) {
    const [p, f] = go.dataset.prgo.split("|");
    prOpen = { per: p, from: f };
    window.scrollTo(0, 0);
    return prRender();
  }
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.prdir) {
    const v = (prCur.sec[b.dataset.prs] = prCur.sec[b.dataset.prs] || {});
    v.rows = v.rows && v.rows.length ? v.rows : [{}];
    const i = +b.dataset.i;
    v.rows[i] = { ...v.rows[i], dir: v.rows[i].dir === b.dataset.prdir ? "" : b.dataset.prdir };
    b.parentNode.querySelectorAll("button").forEach(x => x.classList.toggle("on", x.dataset.prdir === v.rows[i].dir));
    return prSave();
  }
  if (b.dataset.pradd || b.dataset.prrm) {
    const id = b.dataset.pradd || b.dataset.prrm,
      v = (prCur.sec[id] = prCur.sec[id] || {});
    v.rows = v.rows || [];
    if (b.dataset.pradd) v.rows.push({});
    else {
      v.rows.splice(+b.dataset.i, 1);
    }
    const d = prFind(prOpen.per, prOpen.from) || {},
      x = (d.secs || prSecs(prOpen.per)).find(y => y.id === id);
    $("#prsec-" + id).outerHTML = prSecHTML(x, []);
    prGrowAll();
    if (b.dataset.pradd) {
      const ins = $("#prsec-" + id).querySelectorAll('[data-f="pair"]');
      ins[ins.length - 1].focus();
    }
    return prSave();
  }
  if (b.dataset.praddt) {
    const ty = b.dataset.praddt,
      miss = ty === "missed",
      R = prRange(prOpen.per, prOpen.from),
      td = todayISO(),
      dt = td >= R.from && td <= R.to ? td : R.to;
    if (market === "stocks") {
      openStock();
      $("#sDate").value = dt;
      $("#sMissed").checked = miss;
      $("#sMissed").dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      openSheet2();
      $("#f2Date").value = dt;
      $("#f2Missed").checked = miss;
      $("#f2Missed").dispatchEvent(new Event("change", { bubbles: true }));
      if (ty === "good") setRadio("f2eval", "plan");
      if (ty === "bad") setRadio("f2eval", "off");
    }
    return;
  }
  if (b.dataset.prback != null) {
    prOpen = null;
    return prRender();
  }
  if (b.dataset.prper) {
    prSel = { per: b.dataset.prper, anchor: "" };
    return prRender();
  }
  if (b.dataset.prshift) {
    const o = { per: prSel.per, anchor: prSel.anchor || todayISO() };
    rvShift(o, +b.dataset.prshift);
    prSel.anchor = o.anchor;
    return prRender();
  }
  if (b.dataset.prfilt != null) {
    prFilt = b.dataset.prfilt;
    return prRender();
  }
  if (b.dataset.prnav) {
    const o = { per: prOpen.per, anchor: prOpen.from };
    rvShift(o, +b.dataset.prnav);
    prOpen = { per: prOpen.per, from: prRange(prOpen.per, o.anchor).from };
    return prRender();
  }
  if (b.id === "prDel") {
    const d = prFind(prOpen.per, prOpen.from);
    if (!d) return;
    if (!b.dataset.armed) {
      b.dataset.armed = "1";
      b.textContent = "Click again to delete";
      b.classList.add("armed");
      clearTimeout(b._t);
      b._t = setTimeout(() => {
        if (b.isConnected) {
          delete b.dataset.armed;
          b.textContent = "Delete";
          b.classList.remove("armed");
        }
      }, 4000);
      return;
    }
    clearTimeout(prSave.h);
    deleteDoc(d.id);
    prOpen = null;
    $("#prBox").dataset.sig = "";
    prRender();
  }
});
function rvRender() {
  const top = $("#rvTop");
  top.innerHTML = `<div class="segs rvmodes">${[
    ["period", "Period reviews"],
    ["game", "Re-evaluate"],
  ]
    .map(([v, l]) => `<button type="button" class="rvb${rvMode === v ? " on" : ""}" data-rvmode="${v}">${l}</button>`)
    .join("")}</div>`;
  $("#prBox").hidden = rvMode !== "period";
  $("#rvBox").hidden = rvMode === "period";
  if (rvMode === "period") return prRender();
  return rvGameRender();
}
function rvGameRender() {
  const box = $("#rvBox"),
    S = rvState();
  if (market !== "fx") {
    box.innerHTML = `<div class="panel"><span class="eyebrow">Review</span><h2>Forex only for now</h2><p class="hint">Switch to Forex at the top to review trades.</p></div>`;
    return;
  }
  if (!S || !S.queue || S.i >= S.queue.length) {
    const o = rvOpts,
      R = rvRange(o),
      n = rvPool(o).length,
      acs = accounts("fx"),
      ps = projects(),
      L = rvSessions();
    const fin = S && S.queue && S.i >= S.queue.length;
    if (fin) {
      rvShow = S.id;
      rvActive = null;
      rvLocal = null;
    }
    const shown = rvShow && docs.find(d => d.id === rvShow),
      F = rvFinished();
    const per = [
      ["week", "Week"],
      ["month", "Month"],
      ["quarter", "Quarter"],
      ["year", "Year"],
      ["all", "All time"],
      ["custom", "Custom"],
    ];
    box.innerHTML = `${shown ? rvResultHTML(shown) : ""}
      ${L.length ? `<div class="panel"><span class="eyebrow">Ongoing</span><h2>Your review sessions</h2><div class="rvlist">${L.map(x => `<div class="rvsess"><div><b>${esc(x.name || "Review session")}</b><small class="hint" style="margin:0;display:block">${x.i} of ${x.queue.length} reviewed · last used ${esc(fmtD(isoD(new Date(x.touched || x.started || Date.now()))))}</small></div><div class="rvbar"><i style="width:${Math.round((x.i / x.queue.length) * 100)}%"></i></div><div class="row" style="gap:6px"><button type="button" class="btn small ghost" data-rvdel="${x.id}">Delete</button><button type="button" class="btn small primary" data-rvres="${x.id}">Resume</button></div></div>`).join("")}</div></div>` : ""}
      <div class="panel rvsetup"><span class="eyebrow">New session</span><h2>Re-analyse old trades blind</h2>
      <p class="hint">You see the weekly, daily and 4H chart one by one, without pair or result, and fill in your analysis. At the end it shows what you filled in back then.</p>
      <div class="fields">${rvF(
        "Trades",
        `<div class="segs">${[
          ["live", "Live"],
          ["backtest", "Backtest"],
          ["both", "Both"],
        ]
          .map(
            ([v, l]) =>
              `<button type="button" class="rvb${o.mode === v ? " on" : ""}" data-ro="mode" data-rv="${v}">${l}</button>`
          )
          .join("")}</div>`
      )}
      ${o.mode === "live" ? rvF("Account", `<select data-ros="acct"><option value="">All accounts</option>${acs.map(a => `<option ${a.name === o.acct ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>`) : ""}
      ${o.mode === "backtest" ? rvF("Project", `<select data-ros="proj"><option value="">All projects</option>${ps.map(p => `<option value="${p.id}" ${p.id === o.proj ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`) : ""}
      ${rvF(
        "Include",
        `<div class="segs">${[
          ["", "All"],
          ["1", "Not re-evaluated yet"],
        ]
          .map(
            ([v, l]) =>
              `<button type="button" class="rvb${(o.unrev || "") === v ? " on" : ""}" data-ro="unrev" data-rv="${v}">${l}</button>`
          )
          .join("")}</div>`
      )}</div>
      <div class="f" style="margin-top:12px"><span>Period</span><div class="segs">${per.map(([v, l]) => `<button type="button" class="rvb${o.per === v ? " on" : ""}" data-ro="per" data-rv="${v}">${l}</button>`).join("")}</div></div>
      ${o.per === "custom" ? `<div class="fields" style="margin-top:10px">${rvF("From", `<input type="date" data-ros="from" value="${esc(o.from || "")}">`)}${rvF("To", `<input type="date" data-ros="to" value="${esc(o.to || "")}">`)}</div>` : o.per === "all" ? "" : `<div class="rvper"><button type="button" class="btn small" data-rvshift="-1" aria-label="Previous">‹</button><b>${esc(R.label)}</b><button type="button" class="btn small" data-rvshift="1" aria-label="Next">›</button>${o.anchor && o.anchor !== isoD(new Date()) ? `<button type="button" class="btn small ghost" data-rvshift="0">Today</button>` : ""}</div>`}
      <div class="row" style="gap:10px;align-items:center;margin-top:16px"><button type="button" class="btn primary" id="rvStart" ${n ? "" : "disabled"}>Start review</button><span class="hint" style="margin:0">${n} trade${n === 1 ? "" : "s"} with charts${R.from || R.to ? " in " + esc(R.label) : ""}, in random order${(() => {
        const all = rvPool({ ...o, unrev: "" }),
          d = all.filter(t => t.reviews && t.reviews.length).length;
        return all.length ? ` · ${d} of ${all.length} already re-evaluated` : "";
      })()}</span></div></div>${rvDoneHTML()}${F.length ? `<div class="panel"><span class="eyebrow">Finished</span><h2>Past sessions</h2><div class="rvlist">${F.map(x => `<div class="rvsess"><div><b>${esc(x.name || "Review session")}</b><small class="hint" style="margin:0;display:block">${x.queue.length} reviewed · finished ${esc(fmtD(isoD(new Date(x.done || x.touched || Date.now()))))}</small></div><span></span><div class="row" style="gap:6px"><button type="button" class="btn small ghost" data-rvdel="${x.id}">Delete</button><button type="button" class="btn small" data-rvview="${x.id}">View result</button></div></div>`).join("")}</div></div>` : ""}`;
    return;
  }
  const t = docs.find(d => d.id === S.queue[S.i]);
  if (!t) {
    S.i++;
    rvSave();
    return rvRender();
  }
  const a = S.cur || (S.cur = rvBlank()),
    step = S.step || 0,
    prog = `Trade ${S.i + 1} of ${S.queue.length}`;
  if (step < 3) {
    const st = RV_STEPS[step];
    box.innerHTML = `<div class="panel rvstep"><div class="row spread"><div><span class="eyebrow">${prog} · step ${step + 1} of 3</span><h2>${st}</h2></div><div class="row" style="gap:6px"><button type="button" class="btn small ghost" id="rvEnd">End session</button><button type="button" class="btn small ghost" id="rvPause">Pause</button></div></div>
      <div class="rvdots">${RV_STEPS.map((x, i) => `<span class="${i < step ? "done" : i === step ? "on" : ""}">${x}</span>`).join("")}<span>Reveal</span></div>
      ${rvChart(t, st)}${rvStepHTML(a, st)}
      <div class="row spread" style="margin-top:16px"><button type="button" class="btn" id="rvBack" ${step ? "" : "disabled"}>← Back</button><button type="button" class="btn primary" id="rvNext">${step < 2 ? "Next: " + RV_STEPS[step + 1] + " →" : "Reveal →"}</button></div></div>`;
    return;
  }
  const o = rvOrig(t),
    go = gradeOf(rvAsTrade(o)),
    gn = gradeOf(rvAsTrade(a));
  const rows = RV_ROWS.map(([k, l]) => {
    const ov = rvPick(o, k),
      nv = rvPick(a, k),
      same = rvEq(ov, nv);
    return `<tr class="${same ? "" : "diff"}"><td>${l}</td><td>${esc(rvLab(k, ov))}</td><td>${esc(rvLab(k, nv))}</td></tr>`;
  }).join("");
  const op = t.evaluation === "plan" ? "plan" : t.evaluation ? "off" : "",
    opL = op === "plan" ? "Yes" : op === "off" ? "No" : "—",
    npL = S.plan === "plan" ? "Yes" : S.plan === "off" ? "No" : "—";
  const nd = RV_ROWS.filter(([k]) => !rvEq(rvPick(o, k), rvPick(a, k))).length,
    oc = t.outcome || (t.r > 0 ? "win" : t.r < 0 ? "loss" : "be");
  box.innerHTML = `<div class="panel rvstep"><div class="row spread"><div><span class="eyebrow">${prog} · reveal</span><h2>${esc(t.pair || "?")} <span class="dirar ${t.dir}">${t.dir === "long" ? "↑" : t.dir === "short" ? "↓" : ""}</span> <span class="restag ${oc}">${{ win: "Win", loss: "Loss", be: "BE", open: "Open" }[oc]}${oc === "open" ? "" : `<b class="num">${fmtR(t.r)}</b>`}</span></h2>
      <p class="hint" style="margin:2px 0 0">${esc(fmtD(t.date))} · ${t.mode === "backtest" ? "Backtest" : esc(t.account || "Live")}</p></div><button type="button" class="btn small ghost" id="rvPause">Pause</button></div>
    <p class="rvsum">${nd ? `${nd} difference${nd > 1 ? "s" : ""} with what you filled in back then` : "Exactly the same as back then"} · grade ${go ? `<span class="grade g${go.g}" title="${esc(go.why)}">${go.g}</span>` : "—"} → ${gn ? `<span class="grade g${gn.g}" title="${esc(gn.why)}">${gn.g}</span> <span class="hint" style="margin:0">${esc(gn.why)}</span>` : "—"}</p>
    <div class="tbl"><table class="rvtab"><thead><tr><th></th><th>Back then</th><th>Now</th></tr></thead><tbody>${rows}<tr class="rvplan ${S.plan && op && S.plan !== op ? "diff" : ""}"><td>According to plan</td><td>${opL}</td><td>${S.plan ? npL : `<span class="hint" style="margin:0">answer below</span>`}</td></tr></tbody></table></div>
    ${S.plan && op && S.plan !== op ? `<p class="rvplanchg">You now think this trade was <b>${S.plan === "plan" ? "according to plan" : "not according to plan"}</b>; back then you said <b>${op === "plan" ? "according to plan" : "not according to plan"}</b>.</p>` : ""}
    <div class="fields" style="margin-top:14px">${rvF(
      `Was this trade according to plan? <small class="hint" style="margin:0;display:inline">· back then: ${opL}</small>`,
      rvSeg(
        "plan",
        [
          ["plan", "Yes"],
          ["off", "No"],
        ],
        S.plan || ""
      )
    )}${rvF(
      "Save your new analysis on the trade?",
      rvSeg(
        "repl",
        [
          ["yes", "Yes, replace"],
          ["no", "Keep the old one"],
        ],
        S.repl || ""
      )
    )}</div>
    <div class="row spread" style="margin-top:16px"><button type="button" class="btn" id="rvBack">← Back</button>${S.plan && S.repl ? "" : `<span class="hint rvneed" style="margin:0">Answer ${!S.plan && !S.repl ? "both questions" : !S.plan ? "“According to plan?”" : "“Save your new analysis?”"} to continue</span>`}<button type="button" class="btn primary" id="rvSaveNext" ${S.plan && S.repl ? "" : "disabled"}>${S.i + 1 < S.queue.length ? "Save & next trade →" : "Save & finish"}</button></div></div>`;
}
function rvApply(t, a, plan, repl) {
  const n = {
    ...t,
    evaluation: plan,
    onPlan: plan === "plan",
    reviews: [...(t.reviews || []), { at: new Date().toISOString(), plan, replaced: repl === "yes", a }],
  };
  if (repl === "yes")
    Object.assign(n, {
      wRange: !!a.wRange,
      dir: a.dir || t.dir,
      fase: a.fase ? Number(a.fase) : null,
      wStruct: a.wStruct,
      weekly: rvAsTrade(a).weekly,
      wPat: a.wPat,
      wPatSub: a.wPat && a.wPat !== "Reversal" ? a.wPatSub : "",
      concept: a.concept,
      sub: a.sub,
      dMs: a.dMs,
      dPros: a.dPros,
      dailyFib: a.dPros.includes("fc") ? "ja" : "nee",
      entry4h: a.entry4h,
      hMs: a.hMs,
      struct: hasStruct(a.entry4h) ? a.struct : "",
      room: a.room ? "ja" : "nee",
      scaleIn: a.scaleIn,
    });
  saveDoc(n);
}
$("#rvBox").addEventListener("click", e => {
  const S = rvState();
  const pick = e.target.closest("[data-rvpick],[data-rvx]");
  if (pick && S && S.cur) {
    e.stopPropagation();
    const [key, k] = (pick.dataset.rvpick || pick.dataset.rvx).split(":"),
      a = S.cur,
      rem = !!pick.dataset.rvx;
    if (key === "dp") a.dPros = a.dPros.includes(k) ? a.dPros.filter(x => x !== k) : rem ? a.dPros : [...a.dPros, k];
    else {
      const kind = key === "wp" ? "for" : "against",
        v = a.weekly[k];
      if (v && v !== kind) {
      } else if (v === kind || rem) delete a.weekly[k];
      else a.weekly[k] = kind;
    }
    if (rem) rvOpen = "";
    rvSave();
    return rvRender();
  }
  const op = e.target.closest("[data-rvopen]");
  if (op) {
    rvOpen = rvOpen === op.dataset.rvopen ? "" : op.dataset.rvopen;
    return rvRender();
  }
  const tr = e.target.closest("tr[data-rvopen-t]");
  if (tr) {
    const t = docs.find(d => d.id === tr.dataset.rvopenT);
    if (t) openSheet2(t);
    return;
  }
  const b = e.target.closest("button");
  if (!b) {
    if (rvOpen) {
      rvOpen = "";
      rvRender();
    }
    return;
  }
  if (b.id === "rvStart") {
    const o = { ...rvOpts },
      ids = rvPool(o).map(t => t.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const R = rvRange(o),
      who =
        o.mode === "live"
          ? o.acct || "Live"
          : o.mode === "backtest"
            ? (projects().find(p => p.id === o.proj) || {}).name || "Backtest"
            : "Live + backtest";
    rvActive = "rv_" + Date.now().toString(36);
    rvLocal = {
      id: rvActive,
      name: `${who} · ${R.label}`,
      opts: o,
      queue: ids,
      i: 0,
      step: 0,
      cur: rvBlank(),
      plan: "",
      repl: "",
      started: Date.now(),
    };
    rvSave();
    return rvRender();
  }
  if (b.dataset.ro) {
    const k = b.dataset.ro;
    rvOpts[k] = b.dataset.rv;
    if (k === "mode") {
      rvOpts.acct = "";
      rvOpts.proj = "";
    }
    return rvRender();
  }
  if (b.dataset.rvshift) {
    const d = Number(b.dataset.rvshift);
    if (d) rvShift(rvOpts, d);
    else rvOpts.anchor = isoD(new Date());
    return rvRender();
  }
  if (b.dataset.rvview) {
    rvShow = b.dataset.rvview;
    window.scrollTo({ top: 0, behavior: "smooth" });
    return rvRender();
  }
  if (b.dataset.rvclose) {
    rvShow = null;
    return rvRender();
  }
  if (b.dataset.rvres) {
    rvActive = b.dataset.rvres;
    rvLocal = null;
    rvOpen = "";
    return rvRender();
  }
  if (b.dataset.rvdel) {
    if (b.dataset.sure) {
      deleteDoc(b.dataset.rvdel);
      return;
    }
    b.dataset.sure = "1";
    b.textContent = "Sure?";
    setTimeout(() => {
      if (b.isConnected) {
        delete b.dataset.sure;
        b.textContent = "Delete";
      }
    }, 3000);
    return;
  }
  if (!S) return;
  if (b.id === "rvEnd") {
    if (b.dataset.sure) {
      const id = rvActive;
      rvActive = null;
      rvLocal = null;
      deleteDoc(id);
      return rvRender();
    }
    b.dataset.sure = "1";
    b.textContent = "Sure? End";
    setTimeout(() => {
      if (b.isConnected) {
        delete b.dataset.sure;
        b.textContent = "End session";
      }
    }, 3000);
    return;
  }
  if (b.id === "rvPause") {
    rvSave();
    rvActive = null;
    rvLocal = null;
    rvOpen = "";
    toast("Saved — resume it any time from Review");
    return rvRender();
  }
  if (b.id === "rvNext") {
    rvOpen = "";
    S.step = (S.step || 0) + 1;
    rvSave();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return rvRender();
  }
  if (b.id === "rvBack") {
    S.step = Math.max(0, (S.step || 0) - 1);
    rvSave();
    return rvRender();
  }
  if (b.id === "rvSaveNext") {
    if (!S.plan || !S.repl) return;
    const t = docs.find(d => d.id === S.queue[S.i]);
    if (t) {
      const o = rvOrig(t),
        a = S.cur;
      S.log = [
        ...(S.log || []),
        {
          id: t.id,
          pair: t.pair,
          dir: t.dir,
          date: t.date,
          r: t.r,
          diffs: RV_ROWS.filter(([k]) => !rvEq(rvPick(o, k), rvPick(a, k))).map(([, l]) => l),
          planThen: t.evaluation === "plan" ? "plan" : t.evaluation ? "off" : "",
          planNow: S.plan,
          gThen: tGrade(rvAsTrade(o)),
          gNow: tGrade(rvAsTrade(a)),
          repl: S.repl === "yes",
        },
      ];
      rvApply(t, S.cur, S.plan, S.repl);
    }
    S.i++;
    S.step = 0;
    S.cur = rvBlank();
    S.plan = "";
    S.repl = "";
    rvSave();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (S.i >= S.queue.length) {
      S.done = Date.now();
      rvSave();
      rvShow = S.id;
      rvActive = null;
      rvLocal = null;
      toast("Review finished");
    }
    return rvRender();
  }
  const a = S.cur;
  if (b.dataset.rk === "wRange") {
    a.wRange = !a.wRange;
    rvSave();
    return rvRender();
  }
  if (b.dataset.rk === "wtrend") {
    const v = b.dataset.rv;
    a.weekly = { ...(a.weekly || {}) };
    if (a.weekly.trend === v) delete a.weekly.trend;
    else a.weekly.trend = v;
    rvSave();
    return rvRender();
  }
  if (b.dataset.rk) {
    const k = b.dataset.rk,
      v = b.dataset.rv;
    if (k === "plan" || k === "repl") S[k] = v;
    else a[k] = a[k] === v ? "" : v;
    rvSave();
    return rvRender();
  }
  if (b.dataset.rw) {
    const k = b.dataset.rw,
      v = a.weekly[k] || "";
    if (!v) a.weekly[k] = "for";
    else if (v === "for") a.weekly[k] = "against";
    else delete a.weekly[k];
    rvSave();
    return rvRender();
  }
  if (b.dataset.rd) {
    const k = b.dataset.rd;
    a.dPros = a.dPros.includes(k) ? a.dPros.filter(x => x !== k) : [...a.dPros, k];
    rvSave();
    return rvRender();
  }
});
$("#rvBox").addEventListener("change", e => {
  const el = e.target,
    S = rvState();
  if (el.dataset.ros) {
    rvOpts[el.dataset.ros] = el.value;
    return rvRender();
  }
  if (!S || !S.cur) return;
  if (el.dataset.rks) {
    const k = el.dataset.rks;
    S.cur[k] = el.value;
    if (k === "wPat") S.cur.wPatSub = "";
    if (k === "concept") S.cur.sub = "";
    if (k === "entry4h" && !hasStruct(el.value)) S.cur.struct = "";
    rvSave();
    return rvRender();
  }
  if (el.dataset.rc) {
    S.cur[el.dataset.rc] = el.checked;
    rvSave();
  }
});

/* ---------- chart zoom (review) ---------- */
const Z = { s: 1, x: 0, y: 0, pts: new Map(), pinch: null, drag: null };
function zApply() {
  const el = $("#rvzInner");
  el.style.transform = `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`;
  $("#rvzPct").textContent = Math.round(Z.s * 100) + "%";
}
function zFit() {
  const st = $("#rvzStage"),
    el = $("#rvzInner");
  el.style.width = Math.min(st.clientWidth, st.clientHeight * 1.62) + "px";
  Z.s = 1;
  Z.x = (st.clientWidth - el.offsetWidth) / 2;
  Z.y = Math.max(0, (st.clientHeight - el.offsetHeight) / 2);
  zApply();
}
function zAt(ns, cx, cy) {
  ns = Math.min(8, Math.max(1, ns));
  const r = $("#rvzStage").getBoundingClientRect(),
    px = cx - r.left,
    py = cy - r.top;
  Z.x = px - ((px - Z.x) * ns) / Z.s;
  Z.y = py - ((py - Z.y) * ns) / Z.s;
  Z.s = ns;
  if (ns === 1) return zFit();
  zApply();
}
// gal: optional [{src, label}] to switch between with ‹ › (the trade's timeframes), i = where to start
function zOpen(src, mask = true, gal = null, i = 0) {
  const o = $("#rvZoom");
  Z.gal = gal && gal.length > 1 ? gal : null;
  Z.gi = i;
  o.querySelectorAll(".zgal").forEach(b => (b.hidden = !Z.gal));
  if (Z.gal) $("#zTf").textContent = Z.gal[i].label;
  o.classList.toggle("nomask", !mask);
  o.querySelector("img").src = src;
  o.hidden = false;
  document.body.style.overflow = "hidden";
  const img = o.querySelector("img");
  if (img.complete) zFit();
  else img.onload = zFit;
}
function zGo(d) {
  if (!Z.gal) return;
  Z.gi = (Z.gi + d + Z.gal.length) % Z.gal.length;
  const g = Z.gal[Z.gi],
    img = $("#rvZoom img");
  $("#zTf").textContent = g.label;
  if (g.k && viewTrade) showVTab(g.k);
  img.onload = zFit;
  img.src = g.src;
  if (img.complete) zFit();
}
function zClose() {
  $("#rvZoom").hidden = true;
  document.body.style.overflow = "";
}
document.addEventListener("click", e => {
  const im = e.target.closest("[data-rvzoom]");
  if (im) {
    zOpen(im.dataset.rvzoom);
    return;
  }
  const pv = e.target.closest("a.shotprev,a.tvwrap,a.vzoom,a[id^='slp-']");
  if (pv && pv.querySelector("img") && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    // from the chart viewer: the trade's other timeframes are one ‹ › away
    const gal = pv.closest("#viewerImg") && viewTrade ? vGallery(viewTrade) : null,
      k = document.querySelector('input[name="vtab"]:checked');
    zOpen(
      pv.querySelector("img").src,
      false,
      gal,
      gal
        ? Math.max(
            0,
            gal.findIndex(g => g.k === (k && k.value))
          )
        : 0
    );
    return;
  }
  const z = e.target.closest("#rvZoom [data-z]");
  if (!z) return;
  const r = $("#rvzStage").getBoundingClientRect(),
    cx = r.left + r.width / 2,
    cy = r.top + r.height / 2;
  if (z.dataset.z === "in") zAt(Z.s * 1.5, cx, cy);
  else if (z.dataset.z === "out") zAt(Z.s / 1.5, cx, cy);
  else if (z.dataset.z === "reset") zFit();
  else if (z.dataset.z === "prev") zGo(-1);
  else if (z.dataset.z === "next") zGo(1);
  else zClose();
});
document.addEventListener(
  "keydown",
  e => {
    if ($("#rvZoom").hidden) return;
    e.stopImmediatePropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      zClose();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") zGo(e.key === "ArrowRight" ? 1 : -1);
    else if (e.key === "+" || e.key === "=") $("#rvZoom [data-z=in]").click();
    else if (e.key === "-") $("#rvZoom [data-z=out]").click();
  },
  true
);
{
  const st = $("#rvzStage");
  st.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      zAt(Z.s * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    },
    { passive: false }
  );
  st.addEventListener("dblclick", e => zAt(Z.s < 2 ? 2.5 : 1, e.clientX, e.clientY));
  const ov = $("#rvZoom");
  ["gesturestart", "gesturechange", "gestureend"].forEach(t => ov.addEventListener(t, e => e.preventDefault()));
  ov.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  const mid = () => {
    const [a, b] = [...Z.pts.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
  };
  let tap = { t: 0, x: 0, y: 0 },
    moved = false;
  let sw = null;
  st.addEventListener("pointerdown", e => {
    try {
      st.setPointerCapture(e.pointerId);
    } catch {}
    Z.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    sw = Z.pts.size === 1 ? { x: e.clientX, y: e.clientY } : null;
    if (Z.pts.size === 2) {
      const m = mid(),
        r = st.getBoundingClientRect();
      Z.pinch = { d: m.d, s: Z.s, x: Z.x, y: Z.y, cx: (m.x - r.left - Z.x) / Z.s, cy: (m.y - r.top - Z.y) / Z.s };
      Z.drag = null;
    } else if (Z.pts.size === 1) Z.drag = { x: e.clientX, y: e.clientY, ox: Z.x, oy: Z.y };
  });
  st.addEventListener("pointermove", e => {
    if (!Z.pts.has(e.pointerId)) return;
    const p0 = Z.pts.get(e.pointerId);
    if (Math.hypot(e.clientX - p0.x, e.clientY - p0.y) > 4) moved = true;
    Z.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Z.pts.size >= 2 && Z.pinch) {
      const m = mid(),
        r = st.getBoundingClientRect(),
        ns = Math.min(8, Math.max(1, (Z.pinch.s * m.d) / Z.pinch.d));
      Z.s = ns;
      Z.x = m.x - r.left - Z.pinch.cx * ns;
      Z.y = m.y - r.top - Z.pinch.cy * ns;
      zApply();
    } else if (Z.drag && Z.s > 1) {
      Z.x = Z.drag.ox + e.clientX - Z.drag.x;
      Z.y = Z.drag.oy + e.clientY - Z.drag.y;
      zApply();
    }
  });
  const up = e => {
    const was = Z.pts.size;
    Z.pts.delete(e.pointerId);
    if (Z.pts.size < 2 && Z.pinch) {
      Z.pinch = null;
      if (Z.s <= 1.02) zFit();
    }
    if (!Z.pts.size) {
      Z.drag = null;
      // swipe left/right at fit size switches timeframe (touch)
      if (Z.gal && was === 1 && sw && Z.s <= 1.02 && e.pointerType !== "mouse" && e.type === "pointerup") {
        const dx = e.clientX - sw.x;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - sw.y)) return zGo(dx < 0 ? 1 : -1);
      }
      if (was === 1 && !moved && e.type === "pointerup" && e.pointerType !== "mouse") {
        const now = Date.now();
        if (now - tap.t < 320 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 30) {
          zAt(Z.s < 2 ? 2.5 : 1, e.clientX, e.clientY);
          tap.t = 0;
        } else tap = { t: now, x: e.clientX, y: e.clientY };
      }
    } else {
      const p = [...Z.pts.values()][0];
      Z.drag = { x: p.x, y: p.y, ox: Z.x, oy: Z.y };
    }
  };
  st.addEventListener("pointerup", up);
  st.addEventListener("pointercancel", up);
  let lw = innerWidth,
    lh = innerHeight;
  addEventListener("resize", () => {
    if ($("#rvZoom").hidden || (Math.abs(innerWidth - lw) < 2 && Math.abs(innerHeight - lh) < 80)) {
      lw = innerWidth;
      lh = innerHeight;
      return;
    }
    lw = innerWidth;
    lh = innerHeight;
    zFit();
  });
}
function renderLive() {
  const C = jvCtx();
  jvSwap(C.key);
  const all = C.list;
  $("#liveHead").className = "desk " + C.cls;
  if (market !== "stocks" && !calTouched && all.length && !all.some(t => (t.date || "").startsWith(calMonth))) {
    const last = all
      .map(t => t.date || "")
      .sort()
      .pop();
    if (last) calMonth = last.slice(0, 7);
  }
  const month = all.filter(t => (t.date || "").startsWith(calMonth));
  const [y, m] = calMonth.split("-").map(Number);
  const days = {};
  taken(month).forEach(t => {
    days[t.date] = days[t.date] || { r: 0, n: 0, w: 0, tr: [] };
    days[t.date].tr.push(t);
    days[t.date].r += t.r;
    days[t.date].n++;
    if (t.r > 0) days[t.date].w++;
  });
  const dv = Object.values(days),
    greens = dv.filter(d => d.r > 0).length;
  const best = Object.entries(days).sort((a, b) => b[1].r - a[1].r)[0],
    worst = Object.entries(days).sort((a, b) => a[1].r - b[1].r)[0];
  const s = stats(month),
    today = new Date().toISOString().slice(0, 10);
  const first = new Date(Date.UTC(y, m - 1, 1)),
    dim = new Date(Date.UTC(y, m, 0)).getUTCDate(),
    off = (first.getUTCDay() + 6) % 7;
  const maxAbs = Math.max(1, ...dv.map(d => Math.abs(d.r)));
  let cells = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sa", "Su", "Week"]
    .map(
      d => `<div class="dow${d === "Week" ? " wkh" : ""}" ${d === "Week" ? 'style="text-align:right"' : ""}>${d}</div>`
    )
    .join("");
  let wkR = 0,
    wkN = 0,
    col = 0;
  const pushWeek = () => {
    cells += wkN
      ? `<div class="wk"><span class="dr ${wkR > 0 ? "pos" : wkR < 0 ? "neg" : ""}">${fmtR(wkR)}</span><span class="dc">${wkN} trade${wkN > 1 ? "s" : ""}</span></div>`
      : `<div class="wk empty"></div>`;
    wkR = 0;
    wkN = 0;
    col = 0;
  };
  for (let i = 0; i < off; i++) {
    cells += `<div class="day empty" aria-hidden="true"></div>`;
    col++;
  }
  for (let d = 1; d <= dim; d++) {
    const ds = `${calMonth}-${String(d).padStart(2, "0")}`,
      a = days[ds],
      we = col >= 5;
    const tint = a
      ? `background:color-mix(in srgb,var(${a.r > 0 ? "--good" : a.r < 0 ? "--bad" : "--be"}) ${a.r ? Math.round(10 + (Math.abs(a.r) / maxAbs) * 28) : 22}%,var(--surface))`
      : "";
    cells += `<button type="button" class="day ${we ? "we" : ""} ${we && !a ? "off" : ""} ${ds === today ? "today" : ""}" data-day="${ds}" aria-pressed="${selDay === ds}" style="${tint}" aria-label="${d} ${MONTHS[m - 1]}${a ? `, ${fmtR(a.r)}, ${a.n} trades` : ", no trades"}"><span class="dn">${d}</span>${
      a
        ? `<span class="dr ${a.r > 0 ? "pos" : a.r < 0 ? "neg" : ""}">${fmtR(a.r)}</span><span class="dpairs">${a.tr
            .slice(0, 3)
            .map(
              t =>
                `<span class="dp"><i style="background:var(${t.r > 0 ? "--good" : t.r < 0 ? "--bad" : "--be"})"></i><span>${esc(t.pair || "?")}</span></span>`
            )
            .join("")}${a.tr.length > 3 ? `<span class="dp more">+${a.tr.length - 3}</span>` : ""}</span>`
        : ""
    }</button>`;
    if (a) {
      wkR += a.r;
      wkN += a.n;
    }
    col++;
    if (col === 7) pushWeek();
  }
  if (col) {
    while (col < 7) {
      cells += `<div class="day empty" aria-hidden="true"></div>`;
      col++;
    }
    pushWeek();
  }
  const P = jRange(),
    per = all.filter(t => t.date && (!P.from || t.date >= P.from) && (!P.to || t.date <= P.to));
  const ps = stats(per),
    tk = taken(per).sort((x, z) => (x.date || "").localeCompare(z.date || "") || (x.created || 0) - (z.created || 0));
  const wins = tk.filter(t => t.r > 0).length,
    bes = tk.filter(t => t.r === 0).length,
    losses = tk.filter(t => t.r < 0).length;
  let cum = 0,
    peak = 0,
    dd = 0,
    streak = 0,
    maxStreak = 0;
  const curve = [0];
  tk.forEach(t => {
    cum += t.r;
    curve.push(cum);
    peak = Math.max(peak, cum);
    dd = Math.min(dd, cum - peak);
    streak = t.r < 0 ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);
  });
  const periods = [
    ["week", "Week"],
    ["month", "Month"],
    ["quarter", "Quarter"],
    ["year", "Year"],
    ["all", "All time"],
    ["custom", "Custom"],
  ];
  const kp = (l, v, c = "") => `<div class="kpi"><span class="eyebrow">${l}</span><b class="${c}">${v}</b></div>`;
  $("#liveHead").innerHTML =
    `${C.extra ? C.title + C.extra : ""}<div class="row spread">${C.extra ? "<span></span>" : C.title}
    <div class="segs period" role="radiogroup" aria-label="Period">${periods.map(([v, l]) => `<label class="seg"><input type="radio" name="jper" id="jper-${v}" value="${v}" ${jPeriod === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
    ${jPeriod === "custom" ? `<div class="row"><label class="f" style="min-width:150px"><span>From</span><input type="date" id="jFrom" value="${esc(jFrom)}"></label><label class="f" style="min-width:150px"><span>To</span><input type="date" id="jTo" value="${esc(jTo)}"></label></div>` : ""}
    <div class="perlabel"><b>${esc(P.label)}</b>${P.from || P.to ? `<span>${esc(fmtD(P.from) || "…")} – ${esc(fmtD(P.to) || "…")}</span>` : ""}</div>
    ${all.length ? "" : `<p class="hint" style="margin:0">No trades yet. Tap + to log your first one.</p>`}`;
  if (market === "stocks") {
    const D = ovData(per.map(sPct));
    D.o.openN = per.filter(sIsOpen).length;
    const cg = D.tk.map(t => ({ ...t, r: capPct(t, sPnl(t)) })),
      useCap = cg.length && cg.every(t => t.r != null);
    let h = stLbl(overviewHTML(D.tk, D.ps, D.o, P));
    if (useCap)
      h = h
        .replace("Total ROI after each trade", "Account growth after each trade")
        .replace(
          "Line going up means you're making money.",
          "Each trade's result as a % of your account size, added up."
        );
    $("#liveCharts").innerHTML = h + stocksOverviewHTML(all, per, P);
    lastTk = useCap ? cg : D.tk;
    fitEquity();
    $("#liveCal").innerHTML = "";
    renderNotes(C);
    $("#liveTable").innerHTML = tableHTML(per, `Trades · ${P.label}`, false);
    return;
  }
  $("#liveCharts").innerHTML = overviewHTML(tk, ps, { wins, bes, losses, dd, maxStreak }, P);
  lastTk = tk;
  fitEquity();
  $("#liveCal").innerHTML =
    `<div class="panel calblock"><div class="row spread"><div class="calnav"><button class="btn small ghost" data-mon="-1" aria-label="Previous month">‹</button><b>${MONTHS[m - 1]} ${y}</b><button class="btn small ghost" data-mon="1" aria-label="Next month">›</button></div>
      <span class="calsum">${(() => {
        const mt = taken(month),
          n = mt.length;
        if (!n) return "No trades this month";
        const tr = mt.reduce((a, t) => a + (t.r || 0), 0),
          w = mt.filter(t => t.r > 0).length,
          l = mt.filter(t => t.r < 0).length;
        return `<b class="${tr > 0 ? "pos" : tr < 0 ? "neg" : ""}">${fmtR(tr)}</b> · ${n} trade${n > 1 ? "s" : ""} · Win rate ${w + l ? Math.round((w / (w + l)) * 100) + "%" : "—"}`;
      })()}</span></div>
    <div class="calwrap"><div class="cal">${cells}</div></div></div>`;
  renderNotes(C);
  const list = selDay ? all.filter(t => t.date === selDay) : per;
  const dd2 = selDay ? new Date(selDay + "T12:00:00") : null;
  $("#liveTable").innerHTML = tableHTML(
    list,
    selDay ? `Trades on ${dd2.getDate()} ${MONTHS[dd2.getMonth()]}` : `Trades · ${P.label}`,
    false
  ).replace(
    '<div class="row tblacts">',
    `<div class="row tblacts">${selDay ? '<button class="btn small" data-day="">Back to period</button>' : ""}`
  );
}
let jPeriod = "month",
  jFrom = "",
  jTo = "";
