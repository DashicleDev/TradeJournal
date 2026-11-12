/*
 * app.js — CSV export, demo data, tab navigation and click delegation. Runs last and renders the app.
 */
/* ---------- CSV ---------- */
const COLS = [
  "id",
  "mode",
  "project",
  "status",
  "date",
  "pair",
  "dir",
  "fase",
  "concept",
  "sub",
  "entry4h",
  "blind",
  "bos",
  "dfs",
  "som",
  "room",
  "news",
  "planEntry",
  "planSL",
  "planTP",
  "slip",
  "exitReason",
  "r",
  "onPlan",
  "deviation",
  "notes",
];
const csvQ = v => {
  v = v == null ? "" : String(v);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
// Forex export: readable headers and values, the full analysis and the setup grade, so a spreadsheet or an AI can read it
// without a legend. [header, read from trade, write back on import (omitted = export only)]
const yn = v => (v === true || v === "ja" ? "yes" : v === false || v === "nee" ? "no" : "");
const wa = v => (v === "for" ? "with" : v === "against" ? "against" : "");
const aw = v => (v === "with" ? "for" : v === "against" ? "against" : "");
const FXCOLS = [
  ["ID", t => t.id, (t, v) => (t.id = v)],
  ["Mode", t => t.mode, (t, v) => (t.mode = v)],
  ["Project", t => projName(t.project) || ""],
  ["Status", t => t.status, (t, v) => (t.status = v)],
  ["Date", t => t.date, (t, v) => (t.date = v)],
  ["Close date", t => t.closeDate, (t, v) => (t.closeDate = v)],
  ["Pair", t => t.pair, (t, v) => (t.pair = v)],
  ["Direction", t => t.dir, (t, v) => (t.dir = v)],
  ["Weekly phase", t => t.fase, (t, v) => (t.fase = v ? Number(v) : null)],
  ["Weekly structure", t => t.wStruct, (t, v) => (t.wStruct = v)],
  ["Weekly ranging", t => yn(t.wRange), (t, v) => (t.wRange = v === "yes")],
  ["Weekly MS", t => wa((t.weekly || {}).ms), (t, v) => ((t.weekly ||= {}).ms = aw(v))],
  ...WCRIT.map(([k, l]) => ["Weekly " + l, t => wa((t.weekly || {})[k]), (t, v) => ((t.weekly ||= {})[k] = aw(v))]),
  ["Weekly pattern type", t => t.wPat, (t, v) => (t.wPat = v)],
  ["Weekly pattern variant", t => t.wPatSub, (t, v) => (t.wPatSub = v)],
  [
    "Setup",
    t => (!t.concept ? "" : t.concept === "Weekly - 4H" ? "Weekly - 4H" : "Weekly - Daily - 4H"),
    (t, v) => v === "Weekly - 4H" && (t.concept = v),
  ],
  ["Daily pattern", t => (t.concept === "Weekly - 4H" ? "" : t.concept), (t, v) => v && (t.concept = v)],
  ["Pattern variant", t => t.sub, (t, v) => (t.sub = v)],
  ["Daily MS", t => wa(t.dMs), (t, v) => (t.dMs = aw(v))],
  ...DCRIT.map(([k, l]) => [
    "Daily " + l,
    t => (dProsOf(t).includes(k) ? "yes" : ""),
    (t, v) => v === "yes" && (t.dPros ||= []).push(k),
  ]),
  ["4H entry", t => t.entry4h, (t, v) => (t.entry4h = v)],
  ["4H MS", t => wa(t.hMs), (t, v) => (t.hMs = aw(v))],
  ["4H structure", t => t.struct, (t, v) => (t.struct = v)],
  ["4H channel", t => (t.entry4h === "Reversal" ? yn(!!t.channel) : ""), (t, v) => (t.channel = v === "yes")],
  ["Room", t => yn(t.room), (t, v) => (t.room = v === "yes" ? "ja" : v === "no" ? "nee" : "")],
  ["Scale-in", t => yn(!!t.scaleIn), (t, v) => (t.scaleIn = v === "yes")],
  ["Grade", t => (gradeOf(t) || {}).g || ""],
  ["Grade reason", t => (gradeOf(t) || {}).why || ""],
  [
    "To plan",
    t => (t.evaluation === "plan" ? "yes" : t.evaluation === "off" ? "no" : ""),
    (t, v) => {
      t.evaluation = v === "yes" ? "plan" : v === "no" ? "off" : "";
      t.onPlan = v ? v === "yes" : null;
    },
  ],
  ["Outcome", t => t.outcome, (t, v) => (t.outcome = v)],
  ["Result R", t => t.r, (t, v) => (t.r = v === "" ? null : Number(v))],
  ["Max R", t => t.maxR, (t, v) => (t.maxR = v === "" ? null : Number(v))],
  ["Exit reason", t => t.exitReason, (t, v) => (t.exitReason = v)],
  ["Notes", t => t.notes, (t, v) => (t.notes = v)],
];
// Invest export: the analysis per timeframe, prices and returns; share counts, P&L, exchange rate and account only
// with "Include amounts". Exits as one readable cell: "2026-05-01: 50% at 12.30 (3M BOC); …"
const numOrNull = v => (v === "" || v == null ? null : Number(v));
const exitPart = (t, x) =>
  Number(t.sShares) > 0 && Number(x.shares) > 0 ? +((x.shares / t.sShares) * 100).toFixed(1) : null;
const invRoi = t => {
  if (t.retPct != null) return t.retPct;
  const xs = (t.sExits || []).filter(x => Number(x.shares) > 0 && Number(x.price) > 0);
  if (!xs.length || !(t.sEntry > 0) || !(t.sShares > 0)) return "";
  return +((xs.reduce((a, x) => a + (x.price - t.sEntry) * x.shares, 0) / (t.sEntry * t.sShares)) * 100).toFixed(2);
};
const INVCOLS = amounts => [
  ["ID", t => t.id, (t, v) => (t.id = v)],
  ["Mode", t => t.mode, (t, v) => (t.mode = v)],
  ["Project", t => projName(t.project) || ""],
  ["Status", t => t.status, (t, v) => (t.status = v)],
  ["Date", t => t.date, (t, v) => (t.date = v)],
  ["Close date", t => t.closeDate, (t, v) => (t.closeDate = v)],
  ["Ticker", t => t.ticker || t.pair, (t, v) => (t.ticker = t.pair = v.toUpperCase())],
  ["Phase", t => t.sPhase, (t, v) => (t.sPhase = v)],
  ["12M MS", t => wa(t.s12Ms), (t, v) => (t.s12Ms = aw(v))],
  ["12M pattern", t => (t.s12Ms === "for" ? t.s12bm : ""), (t, v) => (t.s12bm = v)],
  ["12M back to", t => (t.s12Ms === "against" ? t.s12ret : ""), (t, v) => (t.s12ret = v)],
  ["6M MS", t => wa(t.s6Ms), (t, v) => (t.s6Ms = aw(v))],
  ["6M BM", t => (t.sPhase === "A" ? t.s6bm : ""), (t, v) => (t.s6bm = v)],
  ["6M back to previous MS", t => (t.sPhase === "B" ? t.s6ret : ""), (t, v) => (t.s6ret = v)],
  ["3M MS", t => wa(t.s3Ms), (t, v) => (t.s3Ms = aw(v))],
  ["3M BM", t => (t.sPhase === "A" ? yn(!!t.s3bm) : ""), (t, v) => (t.s3bm = v === "yes")],
  [
    "3M room",
    t => (t.sPhase === "A" ? yn(!!t.s3room) : t.sPhase === "B" ? yn(!!t.s3roomB) : ""),
    (t, v) => (t[t.sPhase === "B" ? "s3roomB" : "s3room"] = v === "yes"),
  ],
  ["Monthly MS", t => wa(t.s1Ms), (t, v) => (t.s1Ms = aw(v))],
  ["Monthly room", t => (t.sPhase === "A" ? yn(!!t.s1room) : ""), (t, v) => (t.s1room = v === "yes")],
  ["Monthly bullish CC", t => yn(!!t.s1cc), (t, v) => (t.s1cc = v === "yes")],
  ["Weekly MS", t => wa(t.swMs), (t, v) => (t.swMs = aw(v))],
  ["Weekly pattern", t => t.swPat, (t, v) => (t.swPat = v)],
  ["Currency", t => t.sCur, (t, v) => (t.sCur = v)],
  ["Entry", t => t.sEntry, (t, v) => (t.sEntry = numOrNull(v))],
  ["Stop", t => t.sStop, (t, v) => (t.sStop = numOrNull(v))],
  ...(amounts
    ? [
        ["Account", t => (accounts().find(a => a.id === t.account) || {}).name || ""],
        ["Shares", t => t.sShares, (t, v) => (t.sShares = numOrNull(v))],
        ["Exchange rate", t => t.sFx, (t, v) => (t.sFx = numOrNull(v))],
      ]
    : []),
  [
    "Exits",
    t =>
      (t.sExits || [])
        .filter(x => x.price || x.date || x.how)
        .map(x => {
          const pt = exitPart(t, x),
            q = amounts && x.shares ? x.shares + " shares" : pt != null ? pt + "%" : "";
          return `${x.date || "?"}: ${q ? q + " " : ""}at ${x.price ?? "?"}${x.how ? ` (${x.how})` : ""}`;
        })
        .join("; "),
    (t, v) => {
      // only with share counts can the exits be rebuilt; otherwise an existing trade keeps its exits
      const xs = v
        .split(";")
        .map(e => e.trim().match(/^(\S+): (?:([\d.]+) shares )?at ([\d.?]+)(?: \((.*)\))?$/))
        .filter(Boolean);
      if (xs.length && xs.every(m => m[2]))
        t.sExits = xs.map(m => {
          const hows = m[4] ? m[4].split(" + ") : [];
          return {
            date: m[1] === "?" ? "" : m[1],
            shares: Number(m[2]),
            price: numOrNull(m[3] === "?" ? "" : m[3]),
            hows,
            how: hows.join(" + "),
          };
        });
    },
  ],
  ["ROI %", t => invRoi(t)],
  ["Result R", t => t.r, (t, v) => (t.r = numOrNull(v))],
  ...(amounts ? [["P&L", t => t.pnl, (t, v) => (t.pnl = numOrNull(v))]] : []),
  ["Outcome", t => t.outcome, (t, v) => (t.outcome = v)],
  ["Notes", t => t.notes, (t, v) => (t.notes = v)],
];
function toCSV(list, mk, amounts) {
  const cols = mk === "stocks" ? INVCOLS(amounts) : FXCOLS;
  return [
    cols.map(c => c[0]).join(","),
    ...list.filter(t => !t.demo).map(t => cols.map(([, get]) => csvQ(get(t))).join(",")),
  ].join("\n");
}
function saveFile(name, data, type) {
  const b = data instanceof Blob ? data : new Blob([data], { type: type || "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
}
async function backupAll(btn) {
  const msg = (btn.closest(".panel,.setsec") || document).querySelector(".ioMsg");
  const list = docs.filter(d => !d.demo),
    ids = [...new Set(list.flatMap(d => Object.values(d.shots || {}).filter(v => v && v !== "uploading")))];
  const images = {};
  let i = 0,
    miss = 0;
  btn.disabled = true;
  for (const id of ids) {
    i++;
    msg.textContent = `Packing screenshots ${i}/${ids.length}…`;
    try {
      const r = await fetch(shotSrc(id));
      if (!r.ok) throw 0;
      const b = await r.blob();
      images[id] = await new Promise((ok, no) => {
        const fr = new FileReader();
        fr.onload = () => ok(fr.result);
        fr.onerror = no;
        fr.readAsDataURL(b);
      });
    } catch {
      miss++;
    }
  }
  const data = JSON.stringify({
    app: "trade-journal",
    version: 1,
    exported: new Date().toISOString(),
    docs: list,
    images,
  });
  btn.disabled = false;
  saveFile(`trade-journal-backup-${new Date().toISOString().slice(0, 10)}.json`, data, "application/json");
  msg.textContent = `Backup saved: ${list.length} items, ${Object.keys(images).length} screenshots${miss ? `, ${miss} could not be read` : ""}.`;
}
async function restoreBackup(file, msg) {
  if (!ME) {
    toast("Sign in first.");
    return;
  }
  let j;
  try {
    j = JSON.parse(await file.text());
  } catch {
    msg.textContent = "That file is not a Trade Journal backup.";
    return;
  }
  if (!j || j.app !== "trade-journal" || !Array.isArray(j.docs)) {
    msg.textContent = "That file is not a Trade Journal backup.";
    return;
  }
  const imgs = Object.entries(j.images || {});
  let n = 0,
    fail = 0;
  for (const [id, url] of imgs) {
    n++;
    msg.textContent = `Restoring screenshots ${n}/${imgs.length}…`;
    try {
      const b = await (await fetch(url)).blob();
      const { error } = await SB.storage
        .from("shots")
        .upload(shotKey(id), b, { contentType: b.type || "image/png", upsert: false });
      if (error && !/exist|duplicate/i.test(error.message || "")) throw error;
    } catch (e) {
      console.warn(e);
      fail++;
    }
  }
  msg.textContent = "Restoring trades…";
  const list = j.docs.filter(d => d && d.id);
  list.forEach(upsertLocal);
  await dbPutMany(list);
  await ensureShotUrls(list);
  render();
  msg.textContent = `Restored ${list.length} items and ${imgs.length - fail} screenshots${fail ? ` (${fail} screenshots failed)` : ""}.`;
  toast("Backup restored");
}
// the market picked in Settings → Data (defaults to the one you're viewing)
let csvMarket = null;
async function exportCSV(btn) {
  const mk = csvMarket || market,
    amounts = mk === "stocks" && !!($("#csvAmounts") || {}).checked,
    list = docs.filter(d => !d.kind && mktOf(d) === mk),
    msg = (btn.closest(".panel,.setsec") || document).querySelector(".ioMsg");
  saveFile(
    `trade-journal-${mk === "stocks" ? "invest" : "forex"}-${todayISO()}.csv`,
    toCSV(list, mk, amounts),
    "text/csv"
  );
  msg.textContent = `${list.length} ${mk === "stocks" ? "invest" : "forex"} trades exported.`;
}
function parseCSV(s) {
  const rows = [];
  let r = [],
    v = "",
    q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          v += '"';
          i++;
        } else q = false;
      } else v += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      r.push(v);
      v = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      r.push(v);
      rows.push(r);
      r = [];
      v = "";
    } else v += c;
  }
  if (v || r.length) {
    r.push(v);
    rows.push(r);
  }
  return rows.filter(x => x.some(Boolean));
}
const rIn = document.createElement("input");
rIn.type = "file";
rIn.id = "restoreIn";
rIn.accept = ".json,application/json";
rIn.hidden = true;
document.body.appendChild(rIn);
rIn.onchange = e => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  const msg = $("#setIo") || {
    set textContent(v) {
      toast(v);
    },
  };
  restoreBackup(f, msg);
};
const imp = document.createElement("input");
imp.type = "file";
imp.id = "imp";
imp.accept = ".csv,text/csv";
imp.hidden = true;
document.body.appendChild(imp);
imp.onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    const rows = parseCSV(rd.result),
      head = rows.shift() || [];
    const out = new Map(); // id -> trade; one batch save at the end instead of one save and redraw per row
    // the readable formats (forex: "Pair", invest: "Ticker"); otherwise the old one with field names
    const fx = head.includes("Pair"),
      inv = head.includes("Ticker"),
      icols = INVCOLS(true);
    rows.forEach(row => {
      let t = {};
      if (inv) {
        head.forEach((h, i) => {
          const c = icols.find(x => x[0] === h);
          if (c && c[2]) c[2](t, row[i] ?? "");
        });
        t.market = "stocks";
        t.dir = "long";
      } else if (fx) {
        t.weekly = {};
        t.dPros = [];
        head.forEach((h, i) => {
          const c = FXCOLS.find(x => x[0] === h);
          if (c && c[2]) c[2](t, row[i] ?? "");
        });
        t.dailyFib = t.dPros.includes("fc") ? "ja" : "nee";
        Object.keys(t.weekly).forEach(k => !t.weekly[k] && delete t.weekly[k]);
      } else {
        head.forEach((h, i) => {
          if (COLS.includes(h)) t[h] = row[i];
        });
        ["fase", "planEntry", "planSL", "planTP", "slip", "r"].forEach(
          k => (t[k] = t[k] === "" || t[k] == null ? null : Number(t[k]))
        );
        t.onPlan = t.onPlan === "true";
        t.project = t.project || null;
        if ((csvMarket || market) === "stocks") t.market = "stocks";
      }
      if (!t.mode) return;
      // an existing trade keeps everything the file doesn't carry (screenshots, account, …)
      const old = t.id && docs.find(d => d.id === t.id && !d.kind);
      t = old ? { ...old, ...t } : { ...t, id: t.id || uid(), created: Date.now() };
      upsertLocal(t); // so a later row with the same id builds on this one, as before
      out.set(t.id, t);
    });
    render();
    dbPutMany([...out.values()]);
    $("#setIo").textContent = `${out.size} ${inv ? "invest" : fx ? "forex" : ""} trades imported.`.replace("  ", " ");
  };
  rd.readAsText(f);
  e.target.value = "";
};

/* ---------- demo ---------- */
function loadDemo() {
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pairs = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "GBPJPY"];
  const out = [];
  const p1 = {
    kind: "project",
    id: uid() + "a",
    demo: true,
    name: "Sample: 2025 chart scroll",
    pairs: "EURUSD, GBPUSD",
    from: "2025-01-01",
    to: "2025-12-31",
    method: "scroll",
    target: 50,
    focus: "Sample project",
    status: "closed",
    created: Date.now() - 2,
  };
  const p2 = {
    kind: "project",
    id: uid() + "b",
    demo: true,
    name: "Sample: 2024 blind replay",
    pairs: "EURUSD",
    from: "2024-01-01",
    to: "2024-06-30",
    method: "blind",
    target: 40,
    focus: "Sample project",
    status: "active",
    created: Date.now() - 1,
  };
  out.push(p1, p2);
  const make = (mode, n, wr, win, proj, blind) => {
    for (let i = 0; i < n; i++) {
      const fase = 1 + Math.floor(rnd() * 4);
      const cs = PLAN.faseConcepts[fase];
      const concept = cs[Math.floor(rnd() * cs.length)];
      const entry4h = PLAN.entries[Math.floor(rnd() * 4)];
      const off = mode === "live" && rnd() < 0.3;
      const forced = mode === "live" && rnd() < 0.12;
      const w = rnd() < (off ? wr - 0.15 : wr);
      const r = w ? +(win * (0.6 + rnd() * 0.8) * (off ? 0.6 : 1)).toFixed(2) : rnd() < 0.15 ? 0 : -(off ? 1.2 : 1);
      const d = new Date(2026, mode === "live" ? 8 : 2, 1 + Math.floor(i * (mode === "live" ? 2 : 3.5)));
      out.push({
        id: uid() + mode + i + (proj || ""),
        demo: true,
        mode,
        project: proj,
        status: "taken",
        date: d.toISOString().slice(0, 10),
        pair: pairs[Math.floor(rnd() * 5)],
        dir: rnd() < 0.5 ? "long" : "short",
        fase,
        concept,
        sub: PLAN.concepts[concept][0],
        entry4h,
        blind: blind ? "ja" : "nee",
        bos: "ja",
        dfs: forced ? "ja" : "nee",
        som: "",
        room: "",
        news: "nee",
        slip: mode === "live" ? +(rnd() * 1.4).toFixed(1) : 0,
        exitReason: r > 0 ? "Take profit" : r === 0 ? "Break-even" : "Stop loss",
        r,
        onPlan: !off,
        evaluation: off ? (rnd() < 0.5 ? "technical" : "emotional") : "plan",
        deviation: off ? "Closed early" : "",
        notes: "",
        created: Date.now() + i,
      });
    }
  };
  make("backtest", 48, 0.58, 2.6, p1.id, false);
  make("backtest", 30, 0.44, 2.1, p2.id, true);
  make("live", 26, 0.4, 1.9, null, true);
  docs.push(...out);
  render();
  dbPutMany(out);
}

/* ---------- nav + delegation ---------- */
function show(t) {
  if (t !== "review" && typeof prSel !== "undefined" && tab === "review") {
    prSel = { per: "week", anchor: "" };
    prOpen = null;
  }
  if (t !== "review" && typeof rvActive !== "undefined" && rvActive) {
    rvSave();
    rvActive = null;
    rvLocal = null;
    rvOpen = "";
  }
  if (t === "grading" && (!feat("grade") || market !== "fx")) t = "analyze";
  tab = t;
  document.querySelectorAll("nav button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t));
  ["live", "backtest", "analyze", "grading", "accounts", "review"].forEach(x => ($("#view-" + x).hidden = x !== t));
  if (t === "live") $("#view-live").appendChild($("#jv"));
  $("#fab").hidden = t === "analyze" || t === "grading" || t === "accounts" || t === "review";
  $("#fab").classList.toggle("btmode", t === "backtest");
  render();
  window.scrollTo(0, 0);
}
document.querySelectorAll("nav button").forEach(
  b =>
    (b.onclick = () => {
      if (b.dataset.tab === "backtest" && tab === "backtest") btOpen = false;
      show(b.dataset.tab);
    })
);
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("tr.clickrow")) {
    e.preventDefault();
    editTrade(e.target.dataset.edit);
  }
});
document.addEventListener("click", e => {
  const el = e.target.closest(
    "[data-go],[data-edit],[data-dup],[data-del],[data-proj],[data-newproj],[data-editproj],[data-editsim],[data-closesim],[data-closeproj],[data-export],[data-preset],[data-addset],[data-dupset],[data-rmset],[data-resetset],[data-closesheet],[data-backup],[data-day],[data-mon],[data-view],[data-closeviewer],[data-vtab],[data-shotdel],[data-closesheet2],[data-zoom],[data-backproj],[data-closenp],[data-closeps],[data-delproj]"
  );
  if (!el) return;
  const d = el.dataset;
  if (d.go) show(d.go);
  else if (d.edit) editTrade(d.edit);
  else if (d.dup) dupTrade(d.dup);
  else if (d.del) {
    if (confirmId === d.del) {
      confirmId = null;
      deleteDoc(d.del);
    } else {
      confirmId = d.del;
      render();
    }
  } else if (d.proj) {
    activeProject = d.proj;
    btOpen = true;
    render();
    window.scrollTo(0, 0);
  } else if ("closeps" in d) closeProjSheet();
  else if (d.delproj) {
    const b = el;
    if (b.dataset.armed) {
      deleteDoc(d.delproj);
      if (activeProject === d.delproj) {
        activeProject = null;
        btOpen = false;
      }
      toast("Project deleted");
    } else {
      b.dataset.armed = "1";
      b.textContent = "Click again to delete";
      setTimeout(() => {
        if (b.isConnected) {
          delete b.dataset.armed;
          b.textContent = b.dataset.label || "Delete";
        }
      }, 3000);
    }
  } else if ("closenp" in d) closeNewProj();
  else if ("backproj" in d) {
    btOpen = false;
    render();
    window.scrollTo(0, 0);
  } else if ("newproj" in d) {
    if (tab !== "backtest") show("backtest");
    openProjForm(null);
  } else if (d.editproj) openProjForm(docs.find(x => x.id === d.editproj));
  else if (d.editsim) {
    const b = $("#liveSim");
    if (b) {
      b.scrollIntoView({ block: "center", behavior: "smooth" });
      const s = $("#simAcc");
      if (s) s.focus({ preventScroll: true });
    }
  } else if (d.closeproj) {
    const p = docs.find(x => x.id === d.closeproj);
    if (p) saveDoc({ ...p, status: p.status === "closed" ? "active" : "closed" });
  } else if ("closesheet2" in d) closeSheet2();
  else if (d.zoom) openImage(d.zoom, d.zlabel);
  else if (d.view) openViewer(d.view);
  else if ("closeviewer" in d) {
    $("#viewer").hidden = true;
    if ($("#sheet2").hidden) document.body.style.overflow = "";
  } else if (d.vtab) showVTab(d.vtab);
  else if ("day" in d) {
    selDay = d.day && selDay !== d.day ? d.day : null;
    renderLive();
  } else if (d.mon) {
    const [y, m] = calMonth.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1 + Number(d.mon), 1));
    calMonth = dt.toISOString().slice(0, 7);
    calTouched = true;
    selDay = null;
    renderLive();
  } else if ("export" in d) exportCSV(el);
  else if ("backup" in d) backupAll(el);
  else if (d.preset) {
    const p = PRESETS[+d.preset];
    sets = [];
    p.slice(1).forEach(f => sets.push(newSet(f)));
    renderAnalyze();
  } else if ("addset" in d) {
    if (sets.length < MAXSETS) {
      sets.push(newSet({ mode: "all" }));
      renderAnalyze();
    }
  } else if (d.dupset) {
    const st = sets.find(x => x.id === d.dupset);
    if (st && sets.length < MAXSETS) {
      sets.splice(sets.indexOf(st) + 1, 0, newSet({ ...st.f }));
      renderAnalyze();
    }
  } else if (d.rmset) {
    if (sets.length > 1) {
      sets = sets.filter(x => x.id !== d.rmset);
      renderAnalyze();
    }
  } else if (d.resetset) {
    const st = sets.find(x => x.id === d.resetset);
    if (st) {
      st.f = blankSet("all");
      renderAnalyze();
    }
  }
});
let btSeeding = false;
function btSeed() {
  if (btSeeding) return;
  const st = docs.find(d => d.id === "settings");
  if (st && st.btSeeded) return;
  btSeeding = true;
  const td = todayISO();
  docs.filter(d => !d.kind && d.mode === "backtest" && !d.btDate).forEach(d => saveDoc({ ...d, btDate: td }));
  saveDoc({ ...(docs.find(d => d.id === "settings") || { id: "settings", kind: "settings" }), btSeeded: true });
  btSeeding = false;
}
let subFixing = false;
function subFix() {
  if (subFixing) return;
  const l = docs.filter(d => !d.kind && d.sub === "100% Niveau");
  if (!l.length) return;
  subFixing = true;
  l.forEach(d => saveDoc({ ...d, sub: "100 level" }));
  subFixing = false;
}
let holdRender = false;
function render() {
  if (holdRender) return;
  applySettings();
  if (docsReady) {
    acSeed();
    btSeed();
    subFix();
    if (market === "stocks") setTimeout(fxBackfill, 0);
  }
  $("#cLive").textContent = liveTrades().length || "";
  $("#cBt").textContent = btTrades().length || "";
  if (tab === "grading" && (!feat("grade") || market !== "fx")) return show("analyze");
  if (tab === "analyze") renderAnalyze();
  else if (tab === "grading") grRender();
  else if (tab === "live") renderLive();
  else if (tab === "accounts") acRender();
  else if (tab === "review") rvRender();
  else renderBacktest();
}
show("live");
$("#appVer").textContent = "Trade Journal v" + APP_VERSION;
