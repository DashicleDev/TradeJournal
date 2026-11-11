/*
 * settings.js — Settings window: look (theme, accent, fonts), role features (which features this user gets),
 * scoring and grade settings, data tools, news calendar links.
 */
/* ---------- settings (look) ---------- */
const ACCENTS = [
  ["blue", "Blue", "#2230d6", "#8590ff"],
  ["violet", "Violet", "#6b3fd4", "#a98bff"],
  ["teal", "Teal", "#0f7f86", "#45c4c9"],
  ["green", "Green", "#1f7a46", "#5cc98a"],
  ["rose", "Rose", "#b8326a", "#f07aa8"],
  ["slate", "Slate", "#3b4664", "#a3acc6"],
];
const ACCENTS2 = [
  ["orange", "Orange", "#d0601b", "#f08c4c"],
  ["amber", "Amber", "#a96f12", "#e8b04b"],
  ["red", "Red", "#c3342b", "#f06c60"],
  ["pink", "Pink", "#b8326a", "#f07aa8"],
  ["green", "Green", "#1f7a46", "#5cc98a"],
  ["teal", "Teal", "#0f7f86", "#45c4c9"],
];
const SKEY = "tj-look";
const getSet = () => {
  const d = docs.find(x => x.id === "settings");
  let l = {};
  try {
    l = JSON.parse(localStorage.getItem(SKEY) || "{}");
  } catch {}
  return {
    theme: "system",
    accent: "blue",
    accent2: "orange",
    period: "month",
    periodSt: "year",
    cgtOn: true,
    cgtRate: 10,
    cgtEx: 10000,
    cgtWh: true,
    ...l,
    ...(d || {}),
  };
};
let _periodApplied = false;
const FEATS = [
  [
    "ext",
    "TradingView extension",
    "The Extension tab in Settings, with the install guide for the TradingView extension.",
  ],
  [
    "grade",
    "Setup grades (A/B/C)",
    "The A/B/C/X grade on forex trades (from your grade rules per phase), in the trade form, tables and reviews, as Analyze filters and splits, and the grade rules editor in settings.",
  ],
  [
    "share",
    "Share trades",
    "Share and Copy analysis buttons on forex trades: a read-only link to the trade, its analysis and screenshots, and the analysis as text with chart links to paste anywhere.",
  ],
  [
    "cgt",
    "Capital gains",
    "The capital gains overview under Invest → Accounts, the exchange rates and taxable gain per sale in the trade form, and the capital gains tax settings.",
  ],
];
let MYF = (() => {
    try {
      return JSON.parse(localStorage.getItem("tj-myfeat") || "{}");
    } catch {
      return {};
    }
  })(),
  APPADMIN = false,
  MYROLE = "user",
  ROLES = null,
  USERS = null,
  admRole = "admin",
  admTab = "roles",
  roleDel = false;
const roleSort = l => l.sort((a, b) => (a.sort ?? 100) - (b.sort ?? 100) || a.name.localeCompare(b.name));
async function flagsLoad() {
  try {
    APPADMIN = !!(await TJF.admin());
  } catch {
    APPADMIN = false;
  }
  try {
    MYROLE = APPADMIN ? "admin" : (await TJF.me()) || "user";
  } catch (e) {
    console.warn("role", e);
    MYROLE = APPADMIN ? "admin" : "user";
  }
  try {
    ROLES = roleSort(await TJF.roles());
  } catch (e) {
    console.warn("roles", e);
    ROLES = null;
  }
  if (ROLES) {
    const r = ROLES.find(x => x.key === MYROLE) || ROLES.find(x => x.key === "user");
    MYF = (r && r.features) || {};
    try {
      localStorage.setItem("tj-myfeat", JSON.stringify(MYF));
    } catch {}
  }
  if (TJF.seen) TJF.seen().catch(() => {});
  useMarketDefs();
  applySettings();
  admRender();
  render();
}
setTimeout(function w() {
  if (docsReady) flagsLoad();
  else setTimeout(w, 400);
}, 400);
let seenDay = new Date().toDateString(); /* usage: one ping per day the journal is opened */
document.addEventListener("visibilitychange", () => {
  const d = new Date().toDateString();
  if (TJF.seen && document.visibilityState === "visible" && d !== seenDay) {
    seenDay = d;
    TJF.seen().catch(() => {});
  }
});
const feat = k => !FEATS.some(f => f[0] === k) || MYF[k] === true;
function applySettings() {
  const st = getSet(),
    r = document.documentElement;
  document.body.classList.toggle("nf-cgt", !feat("cgt"));
  document.body.classList.toggle("nf-grade", !feat("grade"));
  GR = grNorm(st.gradeRules);
  if (st.theme === "system") delete r.dataset.theme;
  else r.dataset.theme = st.theme;
  const a = ACCENTS.find(x => x[0] === st.accent) || ACCENTS[0];
  const dark =
    st.theme === "dark" ||
    st.theme === "black" ||
    (st.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const c = dark ? a[3] : a[2];
  r.style.setProperty("--accent", c);
  r.style.setProperty("--bt", c);
  const a2 = ACCENTS2.find(x => x[0] === st.accent2) || ACCENTS2[0];
  r.style.setProperty("--live", dark ? a2[3] : a2[2]);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = st.theme === "black" ? "#000000" : dark ? "#141a2e" : "#f2f3f8";
  if (!_periodApplied) {
    jPeriod = (market === "stocks" ? st.periodSt : st.period) || "month";
    _periodApplied = true;
  }
  try {
    localStorage.setItem(
      SKEY,
      JSON.stringify({
        theme: st.theme,
        accent: st.accent,
        accent2: st.accent2,
        period: st.period,
        periodSt: st.periodSt,
        gradeRules: st.gradeRules,
      })
    );
  } catch {}
}
function saveSetting(k, v) {
  const cur = docs.find(x => x.id === "settings") || { id: "settings", kind: "settings" };
  const nd = { ...cur, [k]: v };
  if ((k === "period" && market === "fx") || (k === "periodSt" && market === "stocks")) jPeriod = v;
  saveDoc(nd);
  applySettings();
}
seg("seg-stheme", "stheme", [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
  ["black", "Black"],
]);
seg("seg-speriod", "speriod", [
  ["week", "Week"],
  ["month", "Month"],
  ["quarter", "Quarter"],
  ["year", "Year"],
  ["all", "All time"],
]);
seg("seg-speriod2", "speriod2", [
  ["week", "Week"],
  ["month", "Month"],
  ["quarter", "Quarter"],
  ["year", "Year"],
  ["all", "All time"],
]);
$("#sAccent").innerHTML = ACCENTS.map(
  ([k, l, c]) =>
    `<label title="${l}"><input type="radio" name="saccent" value="${k}" aria-label="${l}"><span style="background:${c}"></span></label>`
).join("");
$("#sAccent2").innerHTML = ACCENTS2.map(
  ([k, l, c]) =>
    `<label title="${l}"><input type="radio" name="saccent2" value="${k}" aria-label="${l}"><span style="background:${c}"></span></label>`
).join("");
/* ---------- grade rules editor (Grading tab) ---------- */
let grPh = "2",
  grF = { plan: "plan", mode: "", from: "", to: "" }; // preview filters
function grSave(rules) {
  const cur = docs.find(x => x.id === "settings") || { id: "settings", kind: "settings" };
  saveDoc({ ...cur, gradeRules: rules });
  applySettings();
  grRender();
  render();
}
// how the current rules grade your own trades: per grade the count, average R, total R and win rate
function grPreview() {
  const T = docs.filter(
    t =>
      !t.kind &&
      mktOf(t) === "fx" &&
      t.status === "taken" &&
      typeof t.r === "number" &&
      (!grF.plan || (grF.plan === "plan") === (t.evaluation === "plan")) &&
      (!grF.mode || (grF.mode === "backtest") === (t.mode === "backtest")) &&
      (!grF.from || (t.date || "") >= grF.from) &&
      (!grF.to || (t.date || "") <= grF.to)
  );
  const rows = GRADES.map(g => {
    const L = T.filter(t => tGrade(t) === g),
      tot = L.reduce((a, t) => a + t.r, 0),
      w = L.filter(t => (t.outcome || (t.r > 0 ? "win" : "")) === "win").length;
    return `<tr><td><b class="grade g${g}">${g}</b></td><td class="num">${L.length}</td><td class="num ${tot / (L.length || 1) > 0 ? "pos" : tot < 0 ? "neg" : ""}">${L.length ? fmtR(tot / L.length) : "—"}</td><td class="num ${tot > 0 ? "pos" : tot < 0 ? "neg" : ""}">${L.length ? fmtR(tot) : "—"}</td><td class="num">${L.length ? Math.round((w / L.length) * 100) + "%" : "—"}</td></tr>`;
  }).join("");
  const none = T.filter(t => !tGrade(t)).length;
  return `<div class="grprev"><b class="eyebrow" style="margin:0">How your trades grade</b>
    <div class="grfil"><div class="segs" id="seg-grplan"></div><div class="segs" id="seg-grmode"></div>
    <span class="grdates"><input type="date" id="grFrom" aria-label="From" value="${grF.from}"> – <input type="date" id="grTo" aria-label="To" value="${grF.to}"></span></div>
    <table class="grtab"><thead><tr><th>Grade</th><th class="num">Trades</th><th class="num">Avg R</th><th class="num">Total</th><th class="num">Win</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="hint" style="margin:6px 0 0">${T.length} taken trades${none ? `, ${none} without a phase or analysis (no grade)` : ""}. Changes apply right away.</p></div>`;
}
let grMs = ""; // which list is open: "req" | "flags" | "extras" | "capB" | "capC"
const GR_LISTS = {
  req: { kind: "for", ph: "Nothing required" },
  flags: { kind: "against", ph: "Nothing" },
  extras: { kind: "extra", ph: "Nothing, so never A" },
  capB: { kind: "extra", ph: "Nothing" },
  capC: { kind: "against", ph: "Nothing" },
};
// the grade limits: the inner structure ("inner") and the 4H entry types ("e:Reversal", …), stored as inner / ent
const GR_CAP_GROUPS = [
  ["Structure", ["inner"]],
  ["4H entry", PLAN.entries.map(e => "e:" + e)],
];
const grCapLab = k => (k === "inner" ? "Inner structure" : k.slice(2));
const grCapSel = (P, list) => {
  const v = list === "capB" ? "b" : "x";
  return [...(P.inner === v ? ["inner"] : []), ...PLAN.entries.filter(e => P.ent[e] === v).map(e => "e:" + e)];
};
// switch one limit on or off in a list ("capB" = at most B, "capC" = C)
function grCapSet(list, k, on) {
  const P = GR[grPh],
    v = on ? (list === "capB" ? "b" : "x") : "";
  if (k === "inner") grUpd({ inner: v, innerB: v === "b" });
  else grUpd({ ent: { ...P.ent, [k.slice(2)]: v } });
}
// the multi-select from the trade form, for one rule list of the open phase
function grMsHTML(list) {
  const P = GR[grPh],
    { kind, ph } = GR_LISTS[list],
    cap = list === "capB" || list === "capC",
    lab = cap ? grCapLab : grLab,
    sel = cap ? grCapSel(P, list) : P[list],
    other = cap
      ? grCapSel(P, list === "capB" ? "capC" : "capB")
      : list === "req"
        ? P.extras
        : list === "extras"
          ? P.req
          : [],
    why = { req: "is an extra", extras: "is required", capB: "gives C", capC: "is at most B" }[list],
    open = grMs === list;
  return `<div class="ms grms${open ? " open" : ""}" data-grms="${list}"><button type="button" class="ms-field" aria-haspopup="listbox" aria-expanded="${open}">${sel.length ? sel.map(k => `<span class="chip-sel ${kind}">${esc(lab(k))}<span class="x" data-grx="${k}" aria-label="Remove ${esc(lab(k))}">×</span></span>`).join("") : `<span class="ph">${ph}</span>`}<span class="caret">▾</span></button>
  <ul class="ms-list" role="listbox" aria-multiselectable="true" ${open ? "" : "hidden"}>${(cap
    ? GR_CAP_GROUPS
    : GR_GROUPS
  )
    .map(
      ([g, keys]) =>
        `<li class="ms-grp" role="presentation">${g}</li>` +
        keys
          .filter(k => list !== "flags" || GR_CAN_AGAINST.has(k))
          .map(k => {
            const l = lab(k).replace(/^(Weekly|Daily|4H) /, ""),
              on = sel.includes(k),
              dis = other.includes(k);
            return `<li role="option" aria-selected="${on}" aria-disabled="${dis}" data-grk="${k}" class="${dis ? "dis" : ""}"><span class="box ${kind}">${on ? "✓" : ""}</span>${esc(l[0].toUpperCase() + l.slice(1))}${dis ? `<em>${why}</em>` : ""}</li>`;
          })
          .join("")
    )
    .join("")}</ul></div>`;
}
function grRender() {
  const box = $("#grEd");
  if (!box) return;
  const P = GR[grPh],
    names = (ks, empty) => (ks.length ? ks.map(grLab).join(", ") : empty),
    overview = ["1", "2", "3", "4"]
      .map(ph => {
        const R = GR[ph];
        return `<tr class="${ph === grPh ? "on" : ""}" data-grgo="${ph}"><td><b>${ph}</b></td><td>${esc(
          [
            names(R.req, ""),
            R.inner === "x" ? "outer structure" : "",
            ...PLAN.entries.filter(e => R.ent[e] === "x").map(e => "no " + e),
          ]
            .filter(Boolean)
            .join(", ") || "—"
        )}</td><td>${R.min ? `${R.min} of ${esc(names(R.extras, "—"))}` : "never"}${R.inner === "b" ? " · inner at most B" : ""}${PLAN.entries
          .filter(e => R.ent[e] === "b")
          .map(e => ` · ${esc(e)} at most B`)
          .join("")}</td><td class="num">${R.flags.length}</td></tr>`;
      })
      .join("");
  box.innerHTML = `${grPreview()}
    <div class="grph"><b>Phase ${grPh}</b><div class="segs">${["1", "2", "3", "4"].map(p => `<label class="seg"><input type="radio" name="grph" value="${p}" ${p === grPh ? "checked" : ""}><span>${p}</span></label>`).join("")}</div></div>
    <div class="grline"><span><span class="grade gC">C</span> unless with you <em class="opt">requirements</em></span>${grMsHTML("req")}</div>
    <div class="grline"><span><span class="grade gC">C</span> if marked against <em class="opt">red flags</em></span>${grMsHTML("flags")}</div>
    <div class="grline"><span><span class="grade gA">A</span> with at least <select id="grMin" aria-label="Extras needed for A">${[
      1, 2, 3, 4,
    ]
      .map(n => `<option value="${n}" ${P.min === n ? "selected" : ""}>${n}</option>`)
      .join(
        ""
      )}<option value="0" ${P.min === 0 ? "selected" : ""}>no</option></select> of</span>${grMsHTML("extras")}</div>
    <div class="grline"><span>At most <span class="grade gB">B</span> with</span>${grMsHTML("capB")}</div>
    <div class="grline"><span><span class="grade gC">C</span> with</span>${grMsHTML("capC")}</div>
    <p class="hint" style="margin:0">Anything else is <span class="grade gB">B</span>.</p>
    <b class="eyebrow grovh">All phases</b>
    <table class="grov"><thead><tr><th>Phase</th><th>C unless with you</th><th>A with</th><th class="num">Flags</th></tr></thead><tbody>${overview}</tbody></table>
    <button type="button" class="btn small ghost" id="grReset">Reset all phases to default</button>`;
  seg("seg-grplan", "grplan", [
    ["plan", "On plan"],
    ["off", "Off plan"],
    ["", "Both"],
  ]);
  seg("seg-grmode", "grmode", [
    ["live", "Live"],
    ["backtest", "Backtest"],
    ["", "Both"],
  ]);
  setRadio("grplan", grF.plan);
  setRadio("grmode", grF.mode);
}
document.addEventListener("click", e => {
  const ms = e.target.closest && e.target.closest(".grms");
  if (grMs && !ms) {
    grMs = "";
    grRender();
  }
  const go = e.target.closest && e.target.closest("[data-grgo]");
  if (go) {
    grPh = go.dataset.grgo;
    grMs = "";
    return grRender();
  }
  if (!ms) return;
  const list = ms.dataset.grms,
    P = GR[grPh],
    x = e.target.closest("[data-grx]"),
    li = e.target.closest("[data-grk]");
  const cap = list === "capB" || list === "capC";
  if (x) {
    if (cap) grCapSet(list, x.dataset.grx, false);
    else grUpd({ [list]: P[list].filter(k => k !== x.dataset.grx) });
    return;
  }
  if (li) {
    if (li.classList.contains("dis")) return;
    const k = li.dataset.grk;
    if (cap) grCapSet(list, k, !grCapSel(P, list).includes(k));
    else grUpd({ [list]: P[list].includes(k) ? P[list].filter(v => v !== k) : [...P[list], k] });
    return;
  }
  if (e.target.closest(".ms-field")) {
    grMs = grMs === list ? "" : list;
    grRender();
  }
});
document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Escape" && grMs) {
      e.stopImmediatePropagation();
      grMs = "";
      grRender();
    }
  },
  true
);
const grUpd = patch => {
  const cur = getSet().gradeRules || {},
    r = grNorm(cur);
  r[grPh] = { ...r[grPh], ...patch };
  grSave(r);
};
document.addEventListener("click", e => {
  if (e.target.id === "grReset") grSave(null);
});
document.addEventListener("change", e => {
  const t = e.target;
  if (!t.closest || !t.closest("#grEd")) return;
  if (t.name === "grph") {
    grPh = t.value;
    grRender();
  } else if (t.name === "grplan" || t.name === "grmode") {
    grF[t.name.slice(2)] = t.value;
    grRender();
  } else if (t.id === "grFrom" || t.id === "grTo") {
    grF[t.id === "grFrom" ? "from" : "to"] = t.value;
    grRender();
  } else if (t.id === "grMin") grUpd({ min: +t.value });
});
let setTab = "look";
function showSetTab(k) {
  setTab = k;
  document.querySelectorAll("[data-settab]").forEach(b => b.setAttribute("aria-selected", b.dataset.settab === k));
  document.querySelectorAll("[data-setpane]").forEach(p => (p.hidden = p.dataset.setpane !== k));
}
document
  .querySelectorAll("[data-settab]")
  .forEach(b => b.addEventListener("click", () => showSetTab(b.dataset.settab)));

const wipeSel = () => {
  const w = $("#wipeWhat").value;
  return docs.filter(
    d => d.id !== "settings" && d.kind !== "settings" && (w === "all" || (d.kind !== "account" && mktOf(d) === w))
  );
};
function wipeCheck() {
  const n = wipeSel(),
    t = n.filter(d => !d.kind).length,
    o = n.length - t;
  $("#wipeCount").textContent =
    `This deletes ${t} trade${t === 1 ? "" : "s"}${o ? ` and ${o} other item${o === 1 ? "" : "s"} (projects${$("#wipeWhat").value === "all" ? ", accounts" : ""})` : ""}.`;
  $("#wipeGo").disabled = !($("#wipeTxt").value.trim() === "DELETE" && $("#wipeBk").checked && n.length);
}
$("#wipeOpen").onclick = () => {
  $("#wipeBox").hidden = false;
  $("#wipeOpen").hidden = true;
  $("#wipeTxt").value = "";
  $("#wipeBk").checked = false;
  $("#wipeWhat").value = market;
  wipeCheck();
};
$("#wipeCancel").onclick = () => {
  $("#wipeBox").hidden = true;
  $("#wipeOpen").hidden = false;
};
["#wipeWhat", "#wipeTxt", "#wipeBk"].forEach(id => {
  $(id).addEventListener("input", wipeCheck);
  $(id).addEventListener("change", wipeCheck);
});
$("#wipeGo").onclick = async () => {
  const list = wipeSel();
  if (!list.length || $("#wipeTxt").value.trim() !== "DELETE" || !$("#wipeBk").checked) return;
  $("#wipeGo").disabled = true;
  $("#setIo").textContent = `Deleting ${list.length} items…`;
  holdRender = true;
  try {
    for (const d of list) await deleteDoc(d.id);
  } finally {
    holdRender = false;
  }
  activeProject = null;
  render();
  $("#setIo").textContent = `Deleted ${list.length} items.`;
  $("#wipeBox").hidden = true;
  $("#wipeOpen").hidden = false;
  toast("Data deleted");
};

/* ---------- news calendar: subscribe links to the feed built by GitHub Actions ---------- */
const NEWS_BASE = window.TJ_CONFIG
    ? location.host + location.pathname.replace(/[^/]*$/, "") + "news/"
    : "dashicledev.github.io/TradeJournal/news/",
  NSTEPS = [5, 10, 15, 30, 45, 60, 120, 180, 240, 1440];
const nLab = m => (m >= 1440 ? "1 day" : m >= 60 ? m / 60 + " hour" + (m > 60 ? "s" : "") : m + " min");
const nRemsOf = st =>
  Array.isArray(st.newsRems)
    ? st.newsRems
        .map(Number)
        .filter(m => NSTEPS.includes(m))
        .slice(0, 2)
    : [60, 15];
function nSave(patch) {
  const cur = docs.find(x => x.id === "settings") || { id: "settings", kind: "settings" };
  saveDoc({ ...cur, ...patch });
  newsLinks();
}
function newsLinks() {
  const st = getSet(),
    lvl = st.newsLvl || "news",
    rems = nRemsOf(st),
    uniq = [...new Set(rems)].sort((a, b) => b - a),
    suf = "-r" + (uniq.length ? uniq.join("-") : "0");
  const https = "https://" + NEWS_BASE + lvl + suf + ".ics",
    webcal = "webcal://" + NEWS_BASE + lvl + suf + ".ics";
  $("#nLvl").value = lvl;
  $("#nRems").innerHTML =
    rems
      .map(
        (m, i) =>
          `<div class="nrem"><select data-nrv="${i}" aria-label="Reminder ${i + 1}">${NSTEPS.map(v => `<option value="${v}" ${v === m ? "selected" : ""}>${nLab(v)} before</option>`).join("")}</select><button type="button" class="acx" data-nrx="${i}" aria-label="Remove reminder">✕</button></div>`
      )
      .join("") || `<p class="hint" style="margin:0 0 6px">No reminders.</p>`;
  $("#nRemAdd").hidden = rems.length >= 2;
  $("#nGoogle").href = "https://calendar.google.com/calendar/r?cid=" + encodeURIComponent(webcal);
  $("#nApple").href = webcal;
  $("#nOutlook").href =
    `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${encodeURIComponent("Forex news")}`;
  $("#nCopy").dataset.url = https;
}
$("#nLvl").onchange = () => nSave({ newsLvl: $("#nLvl").value });
$("#nRemAdd").onclick = () => {
  const r = nRemsOf(getSet());
  r.push(r.includes(15) ? 5 : 15);
  nSave({ newsRems: r });
};
$("#nRems").addEventListener("change", e => {
  const i = e.target.dataset.nrv;
  if (i == null) return;
  const r = nRemsOf(getSet());
  r[i] = Number(e.target.value);
  nSave({ newsRems: r });
});
$("#nRems").addEventListener("click", e => {
  const x = e.target.closest("[data-nrx]");
  if (!x) return;
  const r = nRemsOf(getSet());
  r.splice(Number(x.dataset.nrx), 1);
  nSave({ newsRems: r });
});
$("#nCopy").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("#nCopy").dataset.url);
    toast("Link copied");
  } catch {
    $("#nMsg").textContent = $("#nCopy").dataset.url;
  }
};
function openSettings() {
  const xt = document.querySelector('[data-settab="ext"]');
  xt.hidden = !feat("ext");
  if (xt.hidden && setTab === "ext") setTab = "look";
  $("#extGuide").innerHTML = feat("ext") ? extGuideHTML() : "";
  showSetTab(setTab);
  newsLinks();
  $("#wipeBox").hidden = true;
  $("#wipeOpen").hidden = false;
  $("#setIo").textContent = "";
  $("#csvMk").textContent = (market === "stocks" ? "Invest" : "Forex") + " trades only";
  const st = getSet();
  setRadio("stheme", st.theme);
  setRadio("saccent", st.accent);
  setRadio("saccent2", st.accent2);
  setRadio("speriod", st.period);
  setRadio("speriod2", st.periodSt);
  $("#sCgtOn").checked = st.cgtOn !== false;
  $("#sCgtRate").value = st.cgtRate;
  $("#sCgtEx").value = st.cgtEx;
  grRender();
  tplRender();
  $("#setSheet").hidden = false;
}
$("#openSettings").onclick = openSettings;
$("#openAdmin").onclick = async () => {
  admMsg("");
  roleDel = false;
  $("#admSheet").hidden = false;
  try {
    ROLES = roleSort(await TJF.roles());
  } catch {}
  admRender();
  usersLoad();
};
document.querySelectorAll("[data-closeadm]").forEach(
  b =>
    (b.onclick = () => {
      $("#admSheet").hidden = true;
    })
);
document.querySelectorAll("[data-closeset]").forEach(
  b =>
    (b.onclick = () => {
      $("#setSheet").hidden = true;
    })
);
$("#setForm").addEventListener("change", e => {
  const n = e.target.name;
  if (n === "stheme") saveSetting("theme", e.target.value);
  else if (n === "saccent") saveSetting("accent", e.target.value);
  else if (n === "saccent2") saveSetting("accent2", e.target.value);
  else if (n === "speriod") saveSetting("period", e.target.value);
  else if (n === "speriod2") saveSetting("periodSt", e.target.value);
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applySettings);
