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
    gradeA: 4,
    gradeB: 2,
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
    "The setup score and A/B/C grade on forex trades, in the trade form, tables and reviews, as Analyze filters and splits, and the grade and scoring settings.",
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
  GRADE = { a: Number(st.gradeA), b: Math.min(Number(st.gradeB), Number(st.gradeA)) };
  SW = { ...SW_DEF, ...(st.scoreW || {}) };
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
        gradeA: st.gradeA,
        gradeB: st.gradeB,
        scoreW: st.scoreW,
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
const SW_ROWS = [
  ["Weekly"],
  ["ms", "Weekly MS", "With", "Against"],
  ["msr", "Weekly MS against, ranging", 2],
  ["trend", "Market trend"],
  ["fibc", "FC"],
  ["fiba", "Fib active"],
  ["ic", "IC"],
  ["pattern", "Pattern"],
  ["whl", "High / Low"],
  ["sd", "S&D zone"],
  ["pz", "Proven zone"],
  ["lcc", "Last CC"],
  ["Daily"],
  ["dMs", "Daily MS", "With", "Against"],
  ["d:fc", "FC", 1],
  ["d:dcc", "Last CC", 1],
  ["d:sd", "S&D zone", 1],
  ["4H"],
  ["hMs", "4H MS", "With", "Against"],
  ["Structure"],
  ["outer", "Outer", 1],
  ["inner", "Inner", 1],
];
function swRender() {
  const inp = (k, i) =>
    `<input type="number" step="0.5" inputmode="decimal" data-sw="${k}" data-i="${i}" value="${SW[k][i]}" aria-label="${k} ${i ? "con" : "pro"}">`;
  $("#sScore").innerHTML =
    `<div class="swh"><span></span><span>Pro</span><span>Con</span></div>` +
    SW_ROWS.map(r =>
      r.length === 1
        ? `<div class="swg">${r[0]}</div>`
        : `<div class="swr"><span>${esc(r[1])}</span>${r[2] === 2 ? '<span class="swna">—</span>' : inp(r[0], 0)}${r[2] === 1 ? '<span class="swna">—</span>' : inp(r[0], 1)}</div>`
    ).join("");
}
function swSave(w) {
  const cur = docs.find(x => x.id === "settings") || { id: "settings", kind: "settings" };
  saveDoc({ ...cur, scoreW: w });
  applySettings();
  render();
}
document.addEventListener("change", e => {
  const el = e.target.closest("[data-sw]");
  if (!el) return;
  const k = el.dataset.sw,
    i = +el.dataset.i;
  let v = Number(el.value);
  if (!isFinite(v)) v = SW_DEF[k][i];
  const w = { ...SW };
  w[k] = [...w[k]];
  w[k][i] = v;
  swSave(w);
});
document.addEventListener("click", e => {
  if (e.target.id !== "swReset") return;
  swSave(null);
  setTimeout(swRender, 0);
});
function gcHint() {
  const a = Number($("#sGA").value),
    b = Number($("#sGB").value);
  $("#sGC").textContent = isFinite(a) && isFinite(b) ? `${b - 1} or less` : "";
}
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
  $("#sGA").value = st.gradeA;
  $("#sGB").value = st.gradeB;
  $("#sCgtOn").checked = st.cgtOn !== false;
  $("#sCgtRate").value = st.cgtRate;
  $("#sCgtEx").value = st.cgtEx;
  gcHint();
  swRender();
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
  else if (e.target.id === "sGA" || e.target.id === "sGB") {
    let a = Math.round(Number($("#sGA").value)),
      b = Math.round(Number($("#sGB").value));
    if (!isFinite(a)) a = 4;
    if (!isFinite(b)) b = 2;
    if (b > a) {
      b = a;
      $("#sGB").value = b;
    }
    const cur = docs.find(x => x.id === "settings") || { id: "settings", kind: "settings" };
    saveDoc({ ...cur, gradeA: a, gradeB: b });
    applySettings();
    gcHint();
  }
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applySettings);
