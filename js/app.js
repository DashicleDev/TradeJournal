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
function toCSV(list) {
  const q = v => {
    v = v == null ? "" : String(v);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const pn = id => projName(id) || "";
  return [
    [...COLS, "projectName"].join(","),
    ...list.filter(t => !t.demo).map(t => [...COLS.map(c => q(t[c])), q(pn(t.project))].join(",")),
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
async function exportCSV(btn) {
  const csv = toCSV(trades()),
    msg = (btn.closest(".panel,.setsec") || document).querySelector(".ioMsg");
  saveFile("trade-journal.csv", csv, "text/csv");
  msg.textContent = "CSV downloaded.";
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
    let n = 0;
    rows.forEach(row => {
      const t = {};
      head.forEach((h, i) => {
        if (COLS.includes(h)) t[h] = row[i];
      });
      ["fase", "planEntry", "planSL", "planTP", "slip", "r"].forEach(
        k => (t[k] = t[k] === "" || t[k] == null ? null : Number(t[k]))
      );
      t.onPlan = t.onPlan === "true";
      t.project = t.project || null;
      t.id = t.id || uid();
      t.created = Date.now();
      if (t.mode) {
        saveDoc(t);
        n++;
      }
    });
    $("#setIo").textContent = `${n} trades imported into ${market === "stocks" ? "Invest" : "Forex"}.`;
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
