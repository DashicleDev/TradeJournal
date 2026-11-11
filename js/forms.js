/*
 * forms.js — Trade forms: forex trade form (weekly → daily → 4H flow), invest trade form with multiple exits,
 * and chart screenshots/links.
 */
/* ---------- trade form ---------- */
const formMode = () => (tab === "backtest" ? "backtest" : "live");
$("#fab").onclick = () => {
  if (tab === "backtest" && !(btOpen && activeProject)) {
    openProjForm(null);
    return;
  }
  if (market === "stocks") {
    openStock();
    return;
  }
  openSheet2();
};
/* ---------- stocks trade form ---------- */
let sEditing = null,
  sMode = "live";
const SLINKS = ["m12", "m6", "m3", "mo", "wk"];
const EXITS = {
  A: [
    ["6M BOC", 40],
    ["3M BOC", 30],
    ["6M −27 FC", 15],
    ["Weekly TS", 15],
  ],
  B: [
    ["3M FS", 60],
    ["6M BOC", 40],
  ],
};
const EXOTHER = ["3M FS", "Weekly TS", "BE", "Stop loss", "Manual"];
const exHows = x => (Array.isArray(x.hows) ? x.hows : x.how ? [x.how] : []);
const exPct = (ph, hows) => {
  const ps = hows.map(h => ((EXITS[ph] || []).find(x => x[0] === h) || [])[1]).filter(v => v != null);
  return ps.length ? ps.reduce((a, b) => a + b, 0) : null;
};
let sExits = [];
let exOpen = -1;
function exChips(i, hows) {
  const ph = radio("sphase"),
    plan = (EXITS[ph] || []).map(x => x[0]),
    all = [...new Set([...plan, ...EXOTHER, ...hows])],
    pc = o => ((EXITS[ph] || []).find(x => x[0] === o) || [])[1];
  return `<div class="ms exms ${exOpen === i ? "open" : ""}"><button type="button" class="ms-field" data-exfield="${i}" aria-haspopup="listbox" aria-expanded="${exOpen === i}">${hows.length ? hows.map(h => `<span class="chip-sel exc">${esc(h)}<span class="x" data-exx="${esc(h)}" data-exi2="${i}" aria-label="Remove ${esc(h)}">×</span></span>`).join("") : '<span class="ph">Choose strategy…</span>'}<span class="caret">▾</span></button>
  <ul class="ms-list" role="listbox" aria-multiselectable="true" ${exOpen === i ? "" : "hidden"}>${all
    .map(o => {
      const on = hows.includes(o);
      return `<li role="option" aria-selected="${on}" data-exhow="${esc(o)}" data-exi2="${i}"><span class="box exb">${on ? "✓" : ""}</span>${esc(o)}</li>`;
    })
    .join("")}</ul></div>`;
}
const sBt = () => sMode === "backtest";
const exPosPct = (x, sh) => (x.shares == null || !sh ? "" : +((x.shares / sh) * 100).toFixed(2));
function exRender() {
  const sh = Number($("#sShares").value) || 0;
  $("#sExits").innerHTML = sExits.length
    ? sExits
        .map(
          (x, i) => `<div class="exrow" data-exi="${i}">
    ${sBt() ? `<label><span>% of position</span><input type="number" min="0" max="100" step="any" inputmode="decimal" data-exk="pct" value="${exPosPct(x, sh)}"></label>` : `<label><span>Shares</span><input type="number" min="0" step="any" inputmode="decimal" data-exk="shares" value="${x.shares ?? ""}"></label>`}
    <label><span>Price</span><input type="number" min="0" step="any" inputmode="decimal" data-exk="price" value="${x.price ?? ""}"></label>
    <label><span>Date</span><input type="date" data-exk="date" value="${esc(x.date || "")}"></label>
    <button type="button" class="acx" data-exdel="${i}" aria-label="Remove exit" title="Remove">✕</button>
    <div class="exhow"><span>Exit strategy</span>${exChips(i, exHows(x))}</div><div class="exfx" data-exfx="${i}"></div></div>`
        )
        .join("")
    : "";
  const ph = radio("sphase");
  $("#sPlanHint").textContent = EXITS[ph]
    ? "Plan: " +
      (() => {
        const E = EXITS[ph],
          raw = E.map(([n, p]) => (sh * p) / 100),
          q = raw.map(Math.floor);
        let left = sh - q.reduce((a, b) => a + b, 0);
        raw
          .map((v, i) => [v - q[i], i])
          .sort((a, b) => b[0] - a[0] || a[1] - b[1])
          .forEach(([, i]) => {
            if (left > 0) {
              q[i]++;
              left--;
            }
          });
        return E.map(([n, p], i) => `${p}% ${n}` + (sh && !sBt() ? ` (${q[i]})` : "")).join(" · ");
      })()
    : "";
  exCalc();
  if (!sBt()) exFx();
}
async function exFx() {
  const cur = $("#sCur").value || "USD",
    en = Number($("#sEntry").value) || 0,
    d0 = $("#sDate").value,
    line = $("#sFxLine");
  const st = sEditing && docs.find(d => d.id === sEditing),
    same = st && st.date === d0 && stCur(st) === cur && st.fxTo === "EUR";
  const rin = cur === "EUR" ? 1 : same && st.fxIn ? st.fxIn : d0 ? await fxGet(d0, cur, "EUR") : null;
  if (line) {
    line.hidden = cur === "EUR" || !d0;
    line.textContent =
      cur === "EUR" || !d0
        ? ""
        : rin
          ? `Rate on ${fmtD(d0)}: 1 ${cur} = ${fmtRate(rin)} EUR`
          : `Rate on ${fmtD(d0)}: not available yet`;
  }
  for (let i = 0; i < sExits.length; i++) {
    const x = sExits[i],
      el = document.querySelector(`[data-exfx="${i}"]`);
    if (!el) continue;
    const sh = Number(x.shares) || 0,
      pr = Number(x.price) || 0;
    if (!x.date || !sh || !pr) {
      el.textContent = "";
      continue;
    }
    const ro = cur === "EUR" ? 1 : x.fx && (!st || st.fxTo === "EUR") ? x.fx : await fxGet(x.date, cur, "EUR");
    const g = ro && rin && en ? sh * (pr * ro - en * rin) : null;
    el.innerHTML = `${cur === "EUR" ? "" : ro ? `1 ${cur} = ${fmtRate(ro)} EUR · ` : "Rate not available yet · "}${g != null ? `Taxable gain <b class="num ${g > 0 ? "pos" : g < 0 ? "neg" : ""}">${g > 0 ? "+" : ""}${fmtEur(g)}</b>` : ""}`;
  }
}
function exCalc() {
  const sh = Number($("#sShares").value) || 0,
    en = Number($("#sEntry").value) || 0,
    sl = Number($("#sStop").value),
    xs = sExits.filter(x => Number(x.shares) > 0 && Number(x.price) > 0);
  const sold = xs.reduce((a, x) => a + Number(x.shares), 0),
    pnl = xs.reduce((a, x) => a + Number(x.shares) * (Number(x.price) - en), 0),
    left0 = sh - sold,
    left = Math.abs(left0) < 1e-9 ? 0 : left0;
  const risk = sh && en && sl && en > sl ? sh * (en - sl) : 0,
    cost = sh * en;
  const cur = $("#sCur").value || "USD",
    money = v => fmtMoney(v, cur);
  if (!sh || !en) {
    $("#sExSum").innerHTML = sExits.length
      ? `<span class="hint" style="margin:0">${sBt() ? "Fill in the entry to see the result." : "Fill in shares bought and entry to see the result."}</span>`
      : "";
    return null;
  }
  const r = risk ? pnl / risk : null,
    ret = cost ? (pnl / cost) * 100 : null;
  if (sBt()) {
    const pc = v => +((v / sh) * 100).toFixed(1) + "%";
    $("#sExSum").innerHTML =
      `<div><span>Closed</span><b class="num">${pc(sold)}</b></div><div><span>Still open</span><b class="num ${left < 0 ? "neg" : ""}">${pc(left)}${left < 0 ? " (over 100%)" : ""}</b></div>
    <div><span>Result</span><b class="num ${pnl > 0 ? "pos" : pnl < 0 ? "neg" : ""}">${xs.length && r != null ? (r > 0 ? "+" : "") + r.toFixed(2) + "R" : xs.length && !risk ? "set a stop" : "—"}</b></div><div><span>Return</span><b class="num ${pnl > 0 ? "pos" : pnl < 0 ? "neg" : ""}">${xs.length && ret != null ? (ret > 0 ? "+" : "") + ret.toFixed(2) + "%" : "—"}</b></div>`;
    {
      const sim = simOf(
        { market: "stocks", sCur: $("#sCur").value },
        {
          mode: "backtest",
          project: $("#sProject").value,
          shares: 1,
          cur: $("#sCur").value,
          entry: en,
          date: $("#sDate").value,
          exits: xs,
        }
      );
      if (sim && !sim.wait)
        $("#sExSum").innerHTML +=
          `<div><span>Sim: ${sim.shares} shares</span><b class="num ${sim.pnl > 0 ? "pos" : sim.pnl < 0 ? "neg" : ""}">${xs.length ? fmtMoney(sim.pnl, sim.cur) : "—"}</b></div><div><span>Of capital</span><b class="num ${sim.cap > 0 ? "pos" : sim.cap < 0 ? "neg" : ""}">${sim.cap != null ? (sim.cap > 0 ? "+" : "") + sim.cap.toFixed(2) + "%" : "—"}</b></div>`;
    }
    return { sold, left, pnl, r, ret };
  }
  const ac0 = 0,
    ac = acOf($("#sAccount").value),
    diff = !!(ac && ac.currency && ac.currency !== cur);
  $("#sFxF").hidden = true;
  if (diff) {
    $("#sFxL").textContent = `1 ${cur} in ${ac.currency} (optional)`;
    $("#sFx").placeholder = "auto from history";
  }
  const cc = capOf($("#sAccount").value, cur, $("#sFx").value);
  let cp = cc && xs.length ? ((pnl * cc.rate) / cc.cap) * 100 : null;
  if (diff && xs.length && !$("#sFx").value) {
    const to = ac.currency,
      pk = d => d && fxCache[d + cur + to],
      tt = {
        account: ac.name,
        sCur: cur,
        sEntry: en,
        fxIn: pk($("#sDate").value),
        fxTo: to,
        sExits: xs.map(x => ({ ...x, fx: pk(x.date) })),
      },
      v = tt.fxIn ? capAcct(tt) : null,
      cap = acInit(ac) ?? ac.current;
    if (v != null && cap) cp = (v / cap) * 100;
  }
  $("#sExSum").innerHTML =
    `<div><span>Sold</span><b class="num">${sold} / ${sh}</b></div><div><span>Still open</span><b class="num ${left < 0 ? "neg" : ""}">${left}${left < 0 ? " (oversold)" : ""}</b></div>
    <div><span>P&amp;L</span><b class="num ${pnl > 0 ? "pos" : pnl < 0 ? "neg" : ""}">${xs.length ? money(pnl) : "—"}</b></div><div><span>ROI</span><b class="num ${pnl > 0 ? "pos" : pnl < 0 ? "neg" : ""}">${xs.length && ret != null ? (ret > 0 ? "+" : "") + ret.toFixed(2) + "%" : "—"}</b></div>
    <div><span>Of capital</span><b class="num ${cp > 0 ? "pos" : cp < 0 ? "neg" : ""}">${cp != null ? (cp > 0 ? "+" : "") + cp.toFixed(2) + "%" : !ac ? "pick an account" : !(acInit(ac) ?? ac.current) ? "set account size" : "—"}</b></div>`;
  return { sold, left, pnl, r, ret };
}
$("#sAddExit").onclick = () => {
  const sh = Number($("#sShares").value) || 0,
    ph = radio("sphase"),
    plan = EXITS[ph] || [],
    used = sExits.flatMap(exHows),
    nx = plan.find(([n]) => !used.includes(n));
  const soldNow = sExits.reduce((a, x) => a + (Number(x.shares) || 0), 0);
  sExits.push({
    shares: sBt()
      ? (nx ? (sh * nx[1]) / 100 : Math.max(0, sh - soldNow)) || null
      : nx && sh
        ? Math.floor((sh * nx[1]) / 100)
        : null,
    price: null,
    date: new Date().toISOString().slice(0, 10),
    hows: nx ? [nx[0]] : [],
  });
  exRender();
  const last = $("#sExits").lastElementChild;
  if (last) last.querySelector('[data-exk="price"]').focus();
};
$("#sExits").addEventListener("input", e => {
  const r = e.target.closest("[data-exi]"),
    k = e.target.dataset.exk;
  if (!r || !k || k === "how") return;
  const x = sExits[+r.dataset.exi];
  if (k === "pct") {
    const sh = Number($("#sShares").value) || 1;
    x.shares = e.target.value === "" ? null : (Number(e.target.value) / 100) * sh;
  } else x[k] = e.target.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value;
  if (k === "date") delete x.fx;
  exCalc();
  clearTimeout(exFx.h);
  exFx.h = setTimeout(exFx, 300);
});

$("#sExits").addEventListener("click", e => {
  const d = e.target.closest("[data-exdel]");
  if (d) {
    sExits.splice(+d.dataset.exdel, 1);
    exRender();
    return;
  }
  const f = e.target.closest("[data-exfield]");
  const xx = e.target.closest("[data-exx]");
  if (f && !xx) {
    e.preventDefault();
    exOpen = exOpen === +f.dataset.exfield ? -1 : +f.dataset.exfield;
    exRender();
    return;
  }
  const c = xx || e.target.closest("[data-exhow]");
  if (!c) return;
  e.preventDefault();
  const x = sExits[+c.dataset.exi2],
    ph = radio("sphase"),
    sh = Number($("#sShares").value) || 0,
    prev = exHows(x),
    h = c.dataset.exhow || c.dataset.exx;
  const next = prev.includes(h) ? prev.filter(v => v !== h) : [...prev, h];
  if (xx) exOpen = -1;
  x.hows = next;
  delete x.how;
  const pp = exPct(ph, prev),
    np = exPct(ph, next);
  if (sh && np && (x.shares == null || (pp && x.shares === Math.floor((sh * pp) / 100))))
    x.shares = Math.floor((sh * np) / 100);
  exRender();
});
["#sShares", "#sEntry", "#sStop", "#sCur"].forEach(id =>
  $(id).addEventListener("input", () => {
    exRender();
  })
);
$("#sAccount").addEventListener("change", exCalc);
$("#sFx").addEventListener("input", exCalc);
$("#sCur").addEventListener("change", exCalc);
document.addEventListener("click", e => {
  if (exOpen >= 0 && !e.target.closest(".exms")) {
    exOpen = -1;
    exRender();
  }
});
document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Escape" && exOpen >= 0) {
      e.stopImmediatePropagation();
      exOpen = -1;
      exRender();
    }
  },
  true
);
function sLinkShow(k) {
  const v = $("#sl-" + k).value.trim(),
    o = $("#slo-" + k),
    pv = $("#slp-" + k),
    tv = tvImg(v);
  o.hidden = !v;
  if (v) o.href = v;
  pv.hidden = !tv;
  if (tv) {
    pv.href = v;
    const im = pv.querySelector("img");
    if (im.getAttribute("src") !== tv) im.src = tv;
  }
}
SLINKS.forEach(k => {
  const i = $("#sl-" + k);
  i.addEventListener("change", () => {
    sLinkShow(k);
    sSum();
  });
  i.addEventListener("paste", () =>
    setTimeout(() => {
      sLinkShow(k);
      sSum();
    }, 0)
  );
});
seg("seg-sphase", "sphase", [
  ["A", "Phase A"],
  ["B", "Phase B"],
]);
seg("seg-s12bm", "s12bm", [
  ["FS", "FS"],
  ["100", "100"],
  ["PinP", "PinP"],
]);
seg("seg-s12ret", "s12ret", [
  ["FS", "FS"],
  ["100", "100"],
]);
seg("seg-s6bm", "s6bm", [
  ["FS", "FS"],
  ["100", "100"],
  ["PinP", "PinP"],
]);
seg("seg-s6ret", "s6ret", [
  ["FS", "FS"],
  ["100", "100"],
]);
seg("seg-swpat", "swpat", [
  ["BM", "BM"],
  ["IHS", "IHS"],
]);
function s12Vis() {
  const m = radio("s12mss");
  document.querySelectorAll("#stockForm .s12w").forEach(e => (e.hidden = m !== "for"));
  document.querySelectorAll("#stockForm .s12a").forEach(e => (e.hidden = m !== "against"));
}
function sPhase() {
  s12Vis();
  const ph = radio("sphase");
  document.querySelectorAll("#stockForm .sA").forEach(e => (e.hidden = ph !== "A"));
  document.querySelectorAll("#stockForm .sB").forEach(e => (e.hidden = ph !== "B"));
  document.querySelectorAll("#stockForm .sAB").forEach(e => (e.hidden = !ph));
  const p = radio("swpat");
  $("#sEntryL").textContent = p === "IHS" ? "Entry (S1)" : p === "BM" ? "Entry (FS)" : "Entry";
  $("#sStopL").textContent = p === "IHS" ? "Initial stop (head)" : p === "BM" ? "Initial stop (BOC)" : "Initial stop";
  $("#sWHint").textContent = "";
  $("#sWHint").hidden = true;
  sSum();
}
function sSum() {
  s12Vis();
  const ph = radio("sphase"),
    c = id => $("#" + id).checked,
    L = k => ($("#sl-" + k).value.trim() ? " · chart ✓" : ""),
    j = a => a.filter(Boolean).join(" · ");
  const M = n => (radio(n) ? (radio(n) === "for" ? "MS ✓" : "MS ✗") : "");
  const m12 = radio("s12mss"),
    t12 = j([
      M("s12mss"),
      m12 === "for" && radio("s12bm") ? radio("s12bm") : "",
      m12 === "against" && radio("s12ret") ? "Back to " + radio("s12ret") : "",
    ]);
  const t6 = j([
    M("s6mss"),
    ...(ph === "B"
      ? [radio("s6ret") ? "Back to " + radio("s6ret") : ""]
      : ph === "A"
        ? [radio("s6bm") ? "BM " + radio("s6bm") : ""]
        : []),
  ]);
  const t3 = j([
    M("s3mss"),
    ...(ph === "B"
      ? [c("s3roomB") ? "Room" : ""]
      : ph === "A"
        ? [c("s3bm") ? "BM" : "", c("s3room") ? "Room" : ""]
        : []),
  ]);
  const tm = j([
    M("s1mss"),
    ...(ph === "B"
      ? [c("s1cc") ? "Bullish CC" : ""]
      : ph === "A"
        ? [c("s1room") ? "Room" : "", c("s1cc") ? "Bullish CC" : ""]
        : []),
  ]);
  const p = radio("swpat"),
    tw = j([M("swmss"), p]);
  [
    ["#sSum12", t12, "m12"],
    ["#sSum6", t6, "m6"],
    ["#sSum3", t3, "m3"],
    ["#sSumM", tm, "mo"],
    ["#sSumW", tw, "wk"],
  ].forEach(([id, t, k]) => ($(id).textContent = (t + L(k)).replace(/^ · /, "")));
}
$("#stockForm").addEventListener("change", e => {
  if (["sphase", "swpat"].includes(e.target.name)) {
    sPhase();
    exRender();
  } else {
    if (e.target.name === "s12mss") s12Vis();
    if (["sCur", "sDate", "sEntry", "sAccount"].includes(e.target.id)) exFx();
    sSum();
  }
});
$("#stockForm").addEventListener("input", e => {
  if (e.target.matches("#sEntry,#sStop")) sSum();
});
function openStock(t, dup) {
  const f = $("#stockForm");
  f.reset();
  sEditing = t && !dup ? t.id : null;
  sMode = t ? t.mode : tab === "backtest" ? "backtest" : "live";
  const live = sMode === "live";
  $("#sChip").textContent = live ? "Live" : "Backtest";
  $("#sChip").classList.toggle("bt", !live);
  $("#sChip").classList.toggle("live", live);
  f.classList.toggle("mode-live", live);
  $("#sTitle").textContent =
    (t && !dup ? "Edit " : "New ") + (live ? "invest trade" : "backtest invest trade") + (dup ? " (copy)" : "");
  $("#sSave").textContent = t && !dup ? "Save changes" : "Save trade";
  $("#sSave").className = "btn " + (live ? "liveb" : "btb");
  $("#sProjField").hidden = live;
  $("#sBtField").hidden = true;
  $("#sBtDate").value = btDefault(t, dup);
  if (!live) {
    $("#sProject").innerHTML =
      projects()
        .map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
        .join("") + '<option value="none">No project</option>';
    $("#sProject").value = t ? (projName(t.project) ? t.project : "none") : activeProject || "none";
  }
  const st = docs.filter(d => !d.kind && mktOf(d) === "stocks");
  $("#sTickers").innerHTML = [...new Set(st.map(d => d.ticker).filter(Boolean))]
    .sort()
    .map(x => `<option>${esc(x)}</option>`)
    .join("");
  $("#sTicker").value = t ? t.ticker || "" : "";
  $("#sDate").value = t ? t.date || "" : new Date().toISOString().slice(0, 10);
  $("#sClose").value = t ? t.closeDate || "" : "";
  $("#sMissed").checked = !!t && t.status === "missed";
  acFill("#sAccount", "stocks", t ? t.account || "" : null);
  const A = t || {};
  setRadio("sphase", A.sPhase || "");
  setRadio("s6bm", A.s6bm || "");
  setRadio("s6ret", A.s6ret || "");
  setRadio("swpat", A.swPat || "");
  ["s3bm", "s3room", "s3roomB", "s1room", "s1cc"].forEach(k => ($("#" + k).checked = !!A[k]));
  setRadio("s12mss", A.s12Ms || "");
  setRadio("s12bm", A.s12bm || "");
  setRadio("s12ret", A.s12ret || "");
  setRadio("s6mss", A.s6Ms || (A.s6ms ? "for" : ""));
  setRadio("s3mss", A.s3Ms || (A.s3ms ? "for" : ""));
  setRadio("s1mss", A.s1Ms || "");
  setRadio("swmss", A.swMs || "");
  $("#sEntry").value = A.sEntry ?? "";
  $("#sStop").value = A.sStop ?? "";
  $("#sShares").value = A.sShares ?? (live ? "" : 1);
  $("#sFx").value = A.sFx ?? "";
  $("#sNotes").value = (t && t.notes) || "";
  $("#sCur").value =
    A.sCur ||
    (t && !dup
      ? stCur(t)
      : (
          docs
            .filter(d => !d.kind && mktOf(d) === "stocks" && d.sCur)
            .sort((a, b) => (b.created || 0) - (a.created || 0))[0] || {}
        ).sCur || "USD");
  sExits = (A.sExits || []).map(x => ({ ...x }));
  SLINKS.forEach(k => {
    $("#sl-" + k).value = (A.shotLinks || {})[k] || "";
    sLinkShow(k);
  });
  document.querySelectorAll("#stockForm details.subsec").forEach(d => (d.open = false));
  sPhase();
  sSimOn();
  exRender();
  $("#sDup").hidden = $("#sDel").hidden = !t || !!dup;
  $("#sShare").hidden = $("#sCopyAn").hidden = !t || !!dup || !feat("share");
  f2ShareShow(t && !dup && feat("share") ? t.id : null, undefined, "s");
  {
    const b = $("#sDel");
    delete b.dataset.armed;
    b.textContent = "Delete";
  }
  $("#sheetS").hidden = false;
  document.body.style.overflow = "hidden";
  $("#sheetS .sheet-inner").scrollTop = 0;
  if (!t && matchMedia("(hover:hover) and (pointer:fine)").matches) setTimeout(() => $("#sTicker").focus(), 30);
}
function sSimOn() {
  const p = sMode === "backtest" && docs.find(d => d.id === $("#sProject").value && d.kind === "project");
  $("#stockForm").classList.toggle("sim-on", !!(p && p.simAccount && p.simMax > 0));
}
$("#sProject").addEventListener("change", () => {
  sSimOn();
  exCalc();
});
$("#sCur").addEventListener("change", () => exCalc());
function closeStock() {
  $("#sheetS").hidden = true;
  document.body.style.overflow = "";
  sEditing = null;
}
document.querySelectorAll("[data-closesheets]").forEach(b => (b.onclick = closeStock));
$("#sTicker").addEventListener("input", e => {
  const i = e.target,
    p = i.selectionStart;
  i.value = i.value.toUpperCase().replace(/\s+/g, "");
  i.setSelectionRange(p, p);
});
$("#stockForm").onsubmit = e => {
  e.preventDefault();
  const old = sEditing ? docs.find(d => d.id === sEditing) : null;
  const t = {
    ...(old || {}),
    id: old ? old.id : uid(),
    market: "stocks",
    mode: old ? old.mode : sMode,
    dir: "long",
    project: (old ? old.mode : sMode) === "backtest" && $("#sProject").value !== "none" ? $("#sProject").value : null,
    ticker: $("#sTicker").value.trim().toUpperCase(),
    pair: $("#sTicker").value.trim().toUpperCase(),
    date: $("#sDate").value,
    closeDate: $("#sClose").value,
    status: $("#sMissed").checked ? "missed" : "taken",
    account: $("#sAccount").value,
    btDate: (old ? old.mode : sMode) === "backtest" ? $("#sBtDate").value || todayISO() : null,
    sPhase: radio("sphase"),
    s6bm: radio("s6bm"),
    s6ret: radio("s6ret"),
    swPat: radio("swpat"),
    ...Object.fromEntries(["s3bm", "s3room", "s3roomB", "s1room", "s1cc"].map(k => [k, $("#" + k).checked])),
    s12Ms: radio("s12mss"),
    s12bm: radio("s12mss") === "for" ? radio("s12bm") : "",
    s12ret: radio("s12mss") === "against" ? radio("s12ret") : "",
    s6Ms: radio("s6mss"),
    s3Ms: radio("s3mss"),
    s1Ms: radio("s1mss"),
    swMs: radio("swmss"),
    sEntry: $("#sEntry").value === "" ? null : Number($("#sEntry").value),
    sStop: $("#sStop").value === "" ? null : Number($("#sStop").value),
    notes: $("#sNotes").value.trim(),
    sCur: $("#sCur").value,
    sFx: $("#sFx").value === "" ? null : Number($("#sFx").value),
    sShares: $("#sShares").value === "" ? null : Number($("#sShares").value),
    sExits: sExits
      .filter(x => x.shares || x.price || exHows(x).length)
      .map(x => ({
        shares: x.shares ?? null,
        price: x.price ?? null,
        date: x.date || "",
        hows: exHows(x),
        how: exHows(x).join(" + "),
      })),
    shotLinks: Object.fromEntries(SLINKS.map(k => [k, $("#sl-" + k).value.trim()]).filter(([, v]) => v)),
    created: old ? old.created || Date.now() : Date.now(),
  };
  {
    const c = exCalc(),
      xs = t.sExits.filter(x => Number(x.shares) > 0 && Number(x.price) > 0);
    if (c && xs.length && c.left <= (t.mode === "backtest" ? 0.0005 : 0)) {
      t.r = c.r != null ? +c.r.toFixed(2) : null;
      t.pnl = +c.pnl.toFixed(2);
      t.retPct = c.ret != null ? +c.ret.toFixed(2) : null;
      t.outcome = c.pnl > 0 ? "win" : c.pnl < 0 ? "loss" : "be";
      if (!t.closeDate)
        t.closeDate =
          xs
            .map(x => x.date)
            .filter(Boolean)
            .sort()
            .pop() || "";
    } else {
      t.r = null;
      t.pnl = c && xs.length ? +c.pnl.toFixed(2) : null;
      t.retPct = null;
      t.outcome = "";
    }
    if (t.mode === "backtest") t.pnl = null;
  }
  saveDoc(t);
  fxFill(t).then(nt => {
    if (nt) saveDoc(nt);
  });
  acRemember("stocks", t.account);
  if (t.date && !old) {
    calMonth = t.date.slice(0, 7);
    calTouched = true;
  }
  toast(old ? "Changes saved" : "Trade saved");
  closeStock();
};
$("#sDup").onclick = () => {
  const id = sEditing;
  if (!id) return;
  closeStock();
  dupTrade(id);
};
$("#sDel").onclick = e => {
  const b = e.currentTarget,
    id = sEditing;
  if (!id) return;
  if (!b.dataset.armed) {
    b.dataset.armed = "1";
    b.textContent = "Click again to delete";
    setTimeout(() => {
      if (b.dataset.armed) {
        delete b.dataset.armed;
        b.textContent = "Delete";
      }
    }, 3000);
    return;
  }
  closeStock();
  deleteDoc(id);
  toast("Trade deleted");
};
document.querySelectorAll('input[name="mkt"]').forEach(i => {
  i.checked = i.value === market;
  i.addEventListener("change", () => {
    market = i.value;
    try {
      localStorage.setItem("tj-market", market);
    } catch {}
    {
      const st = getSet();
      jPeriod = (market === "stocks" ? st.periodSt : st.period) || "month";
      jFrom = "";
      jTo = "";
    }
    activeProject = null;
    btOpen = false;
    selDay = null;
    calTouched = false;
    calMonth = new Date().toISOString().slice(0, 7);
    document.documentElement.dataset.market = market;
    useMarketDefs();
    sets = [newSet({ mode: "all" })];
    render();
    window.scrollTo(0, 0);
  });
});
document.documentElement.dataset.market = market;
useMarketDefs();
/* ---------- new trade form (rebuild) ---------- */
seg("seg-f2dir", "f2dir", [
  ["long", "Long"],
  ["short", "Short"],
]);
function wpFill(keep) {
  const v = $("#f2WPat").value,
    opts = v === "Reversal" ? [] : (PLAN.concepts[v] || []).filter(x => x !== "—"),
    sel = $("#f2WPatSub"),
    cur = keep ?? sel.value;
  $("#f2WPatSubF").hidden = !opts.length;
  sel.innerHTML =
    `<option value="">Not set</option>` +
    opts.map(o => `<option ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("");
}
function f2FillVariant() {
  const c = $("#f2Concept").value,
    v = PLAN.concepts[c],
    sel = $("#f2Variant");
  const none = !c || c === "Weekly - 4H" || !v || (v.length === 1 && v[0] === "—");
  $("#f2VarField").hidden = none;
  if (none) {
    sel.innerHTML = '<option value=""></option>';
    return;
  }
  sel.innerHTML = '<option value="">None</option>' + v.map(x => `<option>${esc(x)}</option>`).join("");
}
$("#f2Concept").addEventListener("change", f2FillVariant);
/* Setup: Weekly - Daily - 4H (with a daily pattern) or Weekly - 4H. Both write the stored
   concept field (#f2Concept): the daily pattern's name, or "Weekly - 4H". */
seg("seg-f2setup", "f2setup", [
  ["wd4", "Weekly - Daily - 4H"],
  ["w4", "Weekly - 4H"],
]);
function f2SetupShow() {
  const c = $("#f2Concept").value;
  setRadio("f2setup", !c ? "" : c === "Weekly - 4H" ? "w4" : "wd4");
  $("#f2DPat").value = c && c !== "Weekly - 4H" ? c : "";
  $("#f2DPatField").hidden = radio("f2setup") !== "wd4";
}
function f2SetConcept(v) {
  const c = $("#f2Concept");
  c.value = v;
  c.dispatchEvent(new Event("change", { bubbles: true }));
}
$("#seg-f2setup").addEventListener("change", () => {
  const s = radio("f2setup");
  $("#f2DPatField").hidden = s !== "wd4";
  if (s === "w4") f2SetConcept("Weekly - 4H");
  else {
    f2SetConcept($("#f2DPat").value);
    const d = $("#f2DPat").closest("details");
    if (d && !d.open) d.open = true;
  }
});
$("#f2DPat").addEventListener("change", () => f2SetConcept($("#f2DPat").value));
$("#f2WPat").addEventListener("change", () => {
  const v = $("#f2WPat").value;
  if (v && v !== "?") wcSel.pattern = "for";
  else if (!v) delete wcSel.pattern;
  wpFill();
  msRender();
  f2Summaries();
});
$("#f2WPatSub").addEventListener("change", () => f2Summaries());
seg("seg-f2eval", "f2eval", [
  ["plan", "Yes"],
  ["off", "No"],
]);
seg("seg-f2out", "f2out", [
  ["win", "Win"],
  ["be", "BE"],
  ["loss", "Loss"],
  ["open", "Open"],
]);
$("#f2Exit").innerHTML += PLAN.exits
  .filter(x => x !== "Invalid, cancelled")
  .map(x => `<option value="${x}">${x === "Break-even" ? "Out on BE" : x}</option>`)
  .join("");
$("#seg-f2out").addEventListener("change", () => {
  const o = radio("f2out"),
    r = $("#f2R");
  if (o === "open") r.value = "";
  if (o === "be" && r.value === "") r.value = "0";
  if (o === "loss" && r.value !== "" && +r.value > 0) r.value = -r.value;
  if (o === "win" && r.value !== "" && +r.value < 0) r.value = -r.value;
});
const WCRIT = [
  ["trend", "Market trend"],
  ["fibc", "FC"],
  ["fiba", "Fib active"],
  ["ic", "IC"],
  ["pattern", "Pattern"],
  ["whl", "High / Low"],
  ["sd", "S&D zone"],
  ["pz", "Proven zone"],
  ["lcc", "Last CC"],
  ["ec", "Engulfing candle"],
];
let wcSel = {}; /* key -> "for"|"against" */
function msRender() {
  setRadio("f2wms", wcSel.ms || "");
  if (wcSel.trend === "range") {
    delete wcSel.trend;
    const r = $("#f2Range");
    if (r) r.checked = true;
  }
  setRadio("f2trend", wcSel.trend || "");
  [
    ["#f2Pros", WCRIT.filter(([k]) => k !== "pattern" && k !== "trend"), wcSel],
    ["#f2Cons", WCRIT.filter(([k]) => k !== "pattern" && k !== "trend"), wcSel],
    ["#f2DPros", DCRIT, dSel],
  ].forEach(([id, CR, SEL]) => {
    const box = $(id);
    if (!box) return;
    const kind = box.dataset.kind,
      open = box.classList.contains("open");
    const mine = CR.filter(([k]) => SEL[k] === kind);
    box.innerHTML = `<button type="button" class="ms-field" aria-haspopup="listbox" aria-expanded="${open}" aria-labelledby="${id.slice(1)}Lbl">${mine.length ? mine.map(([k, l]) => `<span class="chip-sel ${kind}">${l}<span class="x" data-msx="${k}" aria-label="Remove ${l}">×</span></span>`).join("") : '<span class="ph">Choose criteria…</span>'}<span class="caret">▾</span></button>
  <ul class="ms-list" role="listbox" aria-multiselectable="true" ${open ? "" : "hidden"}>${CR.map(([k, l]) => {
    const other = SEL[k] && SEL[k] !== kind,
      on = SEL[k] === kind;
    return `<li role="option" aria-selected="${on}" aria-disabled="${!!other}" data-msk="${k}" class="${other ? "dis" : ""}"><span class="box ${kind}">${on ? "✓" : ""}</span>${l}${other ? `<em>in ${kind === "for" ? "cons" : "pros"}</em>` : ""}</li>`;
  }).join("")}</ul>`;
  });
}
document.addEventListener("click", e => {
  const box = e.target.closest(".ms:not(.exms):not(.rvms):not(.grms)");
  document.querySelectorAll(".ms.open:not(.exms):not(.rvms):not(.grms)").forEach(b => {
    if (b !== box) {
      b.classList.remove("open");
      msRender();
    }
  });
  if (!box) return;
  const kind = box.dataset.kind,
    SEL = box.id === "f2DPros" ? dSel : wcSel;
  const x = e.target.closest("[data-msx]");
  if (x) {
    delete SEL[x.dataset.msx];
    msRender();
    $("#tradeForm2").dispatchEvent(new Event("change"));
    return;
  }
  const li = e.target.closest("[data-msk]");
  if (li) {
    if (li.classList.contains("dis")) return;
    const k = li.dataset.msk;
    if (SEL[k] === kind) delete SEL[k];
    else SEL[k] = kind;
    msRender();
    $("#tradeForm2").dispatchEvent(new Event("change"));
    return;
  }
  if (e.target.closest(".ms-field")) {
    box.classList.toggle("open");
    msRender();
  }
});
document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Escape" && document.querySelector(".ms.open:not(.grms)")) {
      e.stopImmediatePropagation();
      document.querySelectorAll(".ms.open").forEach(b => b.classList.remove("open"));
      msRender();
    }
  },
  true
);
const wcVals = () => ({ ...wcSel });
const wcScore = w =>
  w ? Object.values(w).reduce((a, v) => a + (v === "for" ? 1 : v === "against" ? -1 : 0), 0) : null;
/* market structure row: click a checked option again to clear; W is linked to the weekly pros/cons */
document.querySelectorAll(".mstf input").forEach(i => {
  i.closest("label").addEventListener("pointerdown", () => {
    i.dataset.was = i.checked ? "1" : "";
  });
  i.addEventListener("click", () => {
    if (i.dataset.was) {
      i.checked = false;
      i.dataset.was = "";
    }
    if (i.name === "f2wms") {
      const v = radio("f2wms");
      if (v) wcSel.ms = v;
      else delete wcSel.ms;
      msRender();
    }
    if (i.name === "f2trend") {
      const v = radio("f2trend");
      if (v) wcSel.trend = v;
      else delete wcSel.trend;
      msRender();
    }
    (i.form || $("#tradeForm2")).dispatchEvent(new Event("change"));
  });
});
seg("seg-f2struct", "f2struct", [
  ["bos", "Break of structure (BoS)"],
  ["som", "Switch of momentum (SoM)"],
]);
seg("seg-f2ectf", "f2ectf", [
  ["1h", "1 hour"],
  ["2h", "2 hour"],
]);
$("#f2Entry").addEventListener("change", () => {
  const ec = $("#f2Entry").value === "Engulfing Candle";
  $("#f2EcBlock").hidden = !ec;
  if (!ec) {
    delete f2Shots.ltf;
    setRadio("f2ectf", "");
    if (f2Active === "ltf") f2Active = null;
  }
  renderF2Shots();
});
$("#seg-f2ectf").addEventListener("change", renderF2Shots);
function f2CheckVals() {
  const en = $("#f2Entry").value,
    rev = en === "Reversal";
  if (!hasStruct(en)) return { struct: "", bos: "", dfs: "", som: "", room: "" };
  const st = radio("f2struct"),
    bos = st === "bos",
    som = st === "som";
  return {
    struct: st,
    bos: bos ? "ja" : som ? "nee" : "",
    dfs: "",
    som: som && rev ? "ja" : "",
    room: som ? ($("#f2Room").checked ? "ja" : "nee") : "",
  };
}
function f2Check() {
  const v = f2CheckVals(),
    e = $("#f2Entry").value;
  const sv = hasStruct(e);
  $("#f2StructF").hidden = !sv;
  if (!sv) {
    setRadio("f2struct", "");
    $("#f2Room").checked = false;
  }
  $("#f2RoomL").hidden = v.room === "";
  // Channel: an extra confirmation on a Reversal entry (no effect on the take / invalid check)
  const rev = e === "Reversal";
  $("#f2ChanL").hidden = !rev;
  if (!rev) $("#f2Chan").checked = false;
}
function f2Summaries() {
  f2Check();
  const n = k => ((f2Shots[k] && f2Shots[k] !== "uploading") || f2Links[k] ? " · chart ✓" : "");
  const f = radio("f2fase"),
    w = wcVals();
  delete w.ms;
  const tr = w.trend;
  delete w.trend;
  delete w.pattern;
  const fo = Object.values(w).filter(v => v === "for").length,
    ag = Object.values(w).filter(v => v === "against").length;
  $("#f2SumW").textContent =
    [
      f ? "Phase " + f : "",
      radio("f2wstruct") ? (radio("f2wstruct") === "inner" ? "Inner" : "Outer") + " structure" : "",
      tr ? (tr === "for" ? "Trend ✓" : "Trend ✗") : "",
      radio("f2wms") ? (radio("f2wms") === "for" ? "MS ✓" : "MS ✗") : "",
      $("#f2Range").checked ? "Ranging" : "",
      $("#f2WPat").value && $("#f2WPat").value !== "?"
        ? $("#f2WPat").value + ($("#f2WPatSub").value ? " · " + $("#f2WPatSub").value : "")
        : "",
      Object.keys(w).length ? `${fo} pro${fo === 1 ? "" : "s"} · ${ag} con${ag === 1 ? "" : "s"}` : "",
    ]
      .filter(Boolean)
      .join(" · ") + n("weekly");
  const msl = n => (radio(n) ? (radio(n) === "for" ? "MS ✓" : "MS ✗") : "");
  $("#f2SumD").textContent =
    [
      radio("f2setup") === "wd4" ? [$("#f2DPat").value, $("#f2Variant").value].filter(Boolean).join(" · ") : "",
      msl("f2dms"),
      ...DCRIT.filter(([k]) => dSel[k]).map(([, l]) => l),
    ]
      .filter(Boolean)
      .join(" · ") + n("daily");
  const e = $("#f2Entry").value,
    tf = radio("f2ectf");
  $("#f2SumH").textContent =
    [
      e ? e + (e === "Engulfing Candle" && tf ? " · " + tf.toUpperCase() : "") : "",
      radio("f2hms") ? msl("f2hms") : "",
      radio("f2struct") && !$("#f2StructF").hidden ? radio("f2struct").replace("bos", "BoS").replace("som", "SoM") : "",
      ...[
        ["#f2Room", "Room"],
        ["#f2Chan", "Channel"],
        ["#f2Scale", "Scale-in"],
      ]
        .filter(([id]) => $(id).checked && !$(id).closest("[hidden]"))
        .map(([, l]) => l),
    ]
      .filter(Boolean)
      .join(" · ") +
    n("h4") +
    (e === "Engulfing Candle" ? n("ltf").replace("chart", "LTF chart") : "");
}
{
  const _f2s = f2Summaries;
  f2Summaries = function () {
    _f2s();
    {
      const tt = {
          weekly: wcVals(),
          wRange: $("#f2Range").checked,
          dMs: radio("f2dms") || "",
          hMs: radio("f2hms") || "",
          dPros: Object.keys(dSel),
          wStruct: radio("f2wstruct") || "",
          fase: radio("f2fase") || "",
          concept: $("#f2Concept").value,
          channel: $("#f2Entry").value === "Reversal" && $("#f2Chan").checked,
        },
        g = gradeOf(tt);
      $("#f2Score").innerHTML = g
        ? `Setup grade <span class="grade g${g.g}">${g.g}</span> <span class="hint" style="margin:0">${esc(g.why)}</span>`
        : "Setup grade: pick the weekly phase and fill in the analysis";
    }
    ["#f2SumW", "#f2SumD", "#f2SumH"].forEach(id => {
      const e = $(id);
      if (e) e.textContent = e.textContent.replace(/^ · /, "");
    });
  };
}
$("#tradeForm2").addEventListener("change", f2Summaries);
const f2Subs = () => [...document.querySelectorAll("#f2Analysis details.subsec")];
function f2SyncChev() {
  const open = f2Subs().some(d => d.open);
  $("#f2Analysis").classList.toggle("subs-closed", !open);
  $("#f2Analysis .legend-toggle").setAttribute("aria-expanded", String(open));
}
$("#f2Analysis .legend-toggle").addEventListener("click", () => {
  const open = f2Subs().some(d => d.open);
  f2Subs().forEach(d => (d.open = !open));
  f2SyncChev();
});
f2Subs().forEach(d => d.addEventListener("toggle", f2SyncChev));
function f2RR() {
  const sl = num("f2SlPips"),
    tp = num("f2TpPips");
  $("#f2RR").textContent = sl > 0 && tp != null ? "1 : " + (tp / sl).toFixed(2) : "—";
}
["#f2SlPips", "#f2TpPips"].forEach(id => $(id).addEventListener("input", f2RR));
const PAIRS = [...document.querySelectorAll("#pairs option")].map(o => o.value);
const pIn = $("#f2Pair"),
  pList = $("#f2PairList");
let pIdx = -1,
  pItems = [];
function pairRender() {
  const v = pIn.value;
  pItems = v ? PAIRS.filter(x => x.includes(v)).sort((a, b) => b.startsWith(v) - a.startsWith(v)) : PAIRS.slice();
  if (pIdx >= pItems.length) pIdx = pItems.length - 1;
  pList.innerHTML = pItems.length
    ? pItems
        .map(
          (x, i) =>
            `<li role="option" id="pOpt${i}" data-pair="${x}" aria-selected="${i === pIdx}">${x.slice(0, 3)}<span>${x.slice(3)}</span></li>`
        )
        .join("")
    : '<li class="none">No match</li>';
  pIn.setAttribute("aria-activedescendant", pIdx >= 0 ? "pOpt" + pIdx : "");
  if (pIdx >= 0) pList.children[pIdx]?.scrollIntoView({ block: "nearest" });
}
function pairOpen() {
  pList.hidden = false;
  pIn.setAttribute("aria-expanded", "true");
  pIdx = pItems.indexOf ? PAIRS.indexOf(pIn.value) : -1;
  pairRender();
  if (pIdx < 0 && pIn.value) pIdx = -1;
}
function pairClose() {
  pList.hidden = true;
  pIn.setAttribute("aria-expanded", "false");
  pIdx = -1;
}
function pairPick(x) {
  pIn.value = x;
  pIn.setCustomValidity("");
  pairClose();
}
pIn.addEventListener("focus", pairOpen);
pIn.addEventListener("click", () => {
  if (pList.hidden) pairOpen();
});
pIn.addEventListener("blur", () =>
  setTimeout(() => {
    pairClose();
    if (pIn.value && !PAIRS.includes(pIn.value)) {
      const h = PAIRS.filter(x => x.includes(pIn.value));
      if (h.length === 1) pIn.value = h[0];
    }
    pIn.setCustomValidity(pIn.value && !PAIRS.includes(pIn.value) ? "Pick a pair from the list." : "");
  }, 120)
);
pIn.addEventListener("input", e => {
  const v = pIn.value.toUpperCase().replace(/[^A-Z]/g, "");
  if (pIn.value !== v) pIn.value = v;
  const hits = PAIRS.filter(x => x.startsWith(v));
  if (v.length >= 4 && hits.length === 1 && e.inputType && e.inputType.startsWith("insert")) {
    pairPick(hits[0]);
    return;
  }
  pIn.setCustomValidity(v && !PAIRS.includes(v) ? "Pick a pair from the list." : "");
  pList.hidden = false;
  pIn.setAttribute("aria-expanded", "true");
  pIdx = v ? 0 : -1;
  pairRender();
});
pIn.addEventListener("keydown", e => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (pList.hidden) {
      pairOpen();
      return;
    }
    if (!pItems.length) return;
    pIdx = e.key === "ArrowDown" ? Math.min(pItems.length - 1, pIdx + 1) : Math.max(0, pIdx - 1);
    pairRender();
  } else if (e.key === "Enter" && !pList.hidden) {
    e.preventDefault();
    if (pItems[pIdx] ?? pItems[0]) pairPick(pItems[pIdx] ?? pItems[0]);
  } else if (e.key === "Escape" && !pList.hidden) {
    e.stopPropagation();
    pairClose();
  } else if (e.key === "Tab" && !pList.hidden && pIdx >= 0) pairPick(pItems[pIdx]);
});
pList.addEventListener("mousedown", e => {
  e.preventDefault();
  const li = e.target.closest("[data-pair]");
  if (li) pairPick(li.dataset.pair);
});
$("#f2PairBtn").addEventListener("mousedown", e => {
  e.preventDefault();
  if (pList.hidden) {
    pIn.focus();
    pairOpen();
  } else pairClose();
});

seg("seg-f2fase", "f2fase", [
  ["1", "1"],
  ["2", "2"],
  ["3", "3"],
  ["4", "4"],
]);
seg("seg-f2wstruct", "f2wstruct", [
  ["inner", "Inner"],
  ["outer", "Outer"],
]);

let f2Mode = null,
  f2Market = "fx";
/* date the backtest was done: today for new trades, else saved value, else when it was logged */
const todayISO = () => {
  const d = new Date();
  return isoD(d);
};
const btDefault = (t, dup) => (!t || dup ? todayISO() : t.btDate || todayISO());
function openSheet2(t, dup) {
  const live = (t ? t.mode : formMode()) === "live",
    f = $("#tradeForm2");
  f.reset();
  $("#f2RevNote").hidden = true;
  editingId = t ? t.id : null;
  f2Mode = t ? t.mode : null;
  f2Market = t ? mktOf(t) : market;
  f.classList.toggle("mode-live", live);
  $("#f2ProjField").hidden = live;
  $("#f2BtField").hidden = true;
  $("#f2BtDate").value = btDefault(t, dup);
  $("#f2Chip").className = "chip " + (live ? "live" : "bt");
  $("#f2Chip").textContent = live ? "Live" : "Backtest";
  $("#f2Title").textContent = (t ? "Edit " : "New ") + (live ? "live trade" : "backtest trade");
  $("#f2Save").textContent = t ? "Save changes" : "Save trade";
  $("#f2Save").className = "btn " + (live ? "liveb" : "btb");
  if (!live) {
    $("#f2Project").innerHTML =
      projects()
        .map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
        .join("") + '<option value="none">No project</option>';
    $("#f2Project").value = activeProject || "none";
  }
  $("#f2Date").value = new Date().toISOString().slice(0, 10);
  $("#f2Missed").checked = false;
  acFill("#f2Account", "fx", null);
  f2Shots = {};
  f2Active = null;
  f2Links = {};
  wcSel = {};
  dSel = {};
  document.querySelectorAll(".ms.open").forEach(b => b.classList.remove("open"));
  msRender();
  $("#f2EcBlock").hidden = true;
  document.querySelectorAll("#tradeForm2 details.subsec").forEach(d => (d.open = false));
  $("#f2Analysis").classList.add("subs-closed");
  $("#f2Analysis .legend-toggle").setAttribute("aria-expanded", "false");
  setTimeout(f2Check);
  setTimeout(f2RR);
  renderF2Shots();
  f2FillVariant();
  f2SetupShow();
  if (t) f2Fill(t);
  $("#f2Dup").hidden = $("#f2Del").hidden = !t || !!dup;
  $("#f2Share").hidden = $("#f2CopyAn").hidden = !t || !!dup || !feat("share");
  f2ShareShow(t && !dup && feat("share") ? t.id : null);
  {
    const b = $("#f2Del");
    delete b.dataset.armed;
    b.textContent = "Delete";
  }
  if (dup) {
    editingId = null;
    $("#f2Title").textContent = (live ? "New live trade" : "New backtest trade") + " (copy)";
    $("#f2Save").textContent = "Save trade";
  }
  $("#sheet2").hidden = false;
  document.body.style.overflow = "hidden";
  $("#sheet2").scrollTop = 0;
  if (!t && matchMedia("(hover:hover) and (pointer:fine)").matches) setTimeout(() => $("#f2Pair").focus(), 30);
}
function f2Fill(t) {
  const ch = el => el.dispatchEvent(new Event("change", { bubbles: true }));
  if (t.mode === "backtest") $("#f2Project").value = projName(t.project) ? t.project : "none";
  $("#f2Pair").value = t.pair || "";
  $("#f2Date").value = t.date || "";
  $("#f2Close").value = t.closeDate || "";
  $("#f2Missed").checked = t.status === "missed";
  acFill("#f2Account", "fx", t.account || "");
  setRadio("f2dir", t.dir || "");
  $("#f2Concept").value = t.concept || "";
  f2SetupShow();
  f2FillVariant();
  $("#f2Variant").value = t.sub && t.sub !== "—" ? t.sub : "";
  setRadio("f2fase", t.fase || "");
  setRadio("f2wstruct", t.wStruct || "");
  {
    $("#f2WPat").value = t.wPat || "";
    wpFill(t.wPatSub || "");
  }
  setRadio("f2dms", t.dMs || "");
  setRadio("f2hms", t.hMs || "");
  wcSel = { ...(t.weekly || {}) };
  msRender();
  dSel = Object.fromEntries(dProsOf(t).map(k => [k, "for"]));
  msRender();
  $("#f2Entry").value = t.entry4h || "";
  ch($("#f2Entry"));
  setRadio("f2ectf", t.ecTf || "");
  setRadio("f2struct", t.struct || (t.bos === "ja" ? "bos" : t.bos === "nee" ? "som" : ""));
  $("#f2Room").checked = t.room === "ja";
  $("#f2Scale").checked = !!t.scaleIn;
  $("#f2Chan").checked = !!t.channel;
  $("#f2PlanEntry").value = t.planEntry ?? "";
  $("#f2SlPips").value = t.slPips ?? "";
  $("#f2TpPips").value = t.tpPips ?? "";
  setRadio("f2out", t.outcome || (t.r > 0 ? "win" : t.r < 0 ? "loss" : t.r === 0 ? "be" : ""));
  $("#f2R").value = t.r ?? "";
  $("#f2MaxR").value = t.maxR ?? "";
  $("#f2Range").checked = !!t.wRange || (t.weekly || {}).trend === "range";
  $("#f2Notes").value = t.notes || "";
  $("#f2Exit").value = t.exitReason || "";
  setRadio("f2eval", t.evaluation === "plan" ? "plan" : t.evaluation ? "off" : "");
  {
    const rv = editingId ? t.reviews || [] : [],
      n = $("#f2RevNote");
    n.hidden = !rv.length;
    if (rv.length) n.textContent = `Re-evaluated ${rv.length}× · last ${fmtD(rv[rv.length - 1].at.slice(0, 10))}`;
  }
  f2Shots = { ...(t.shots || {}) };
  f2Links = { ...(t.shotLinks || {}) };
  renderF2Shots();
  f2Check();
  f2RR();
  f2Summaries();
}
function dupTrade(id) {
  const t = docs.find(x => x.id === id);
  if (!t) return;
  if (mktOf(t) === "stocks") {
    if (tab !== "analyze") show(t.mode === "live" ? "live" : "backtest");
    openStock(t, true);
    return;
  }
  if (t.mode === "backtest") {
    activeProject = projName(t.project) ? t.project : "none";
    btOpen = true;
  }
  if (tab !== "analyze") show(t.mode === "live" ? "live" : "backtest");
  openSheet2(t, true);
}
/* a link like …#trade=<id> (e.g. from the TradingView extension) opens that trade */
function openFromHash() {
  const m = /^#trade=([\w-]+)/.exec(location.hash || "");
  if (!m) return;
  const id = m[1];
  const go = () => {
    if (!docs.some(d => d.id === id && !d.kind)) return false;
    history.replaceState(null, "", location.pathname + location.search);
    editTrade(id);
    return true;
  };
  if (go()) return;
  let n = 0;
  const iv = setInterval(() => {
    if (go() || ++n > 60) clearInterval(iv);
  }, 500);
}
addEventListener("hashchange", openFromHash);
setTimeout(openFromHash, 0);
function editTrade(id) {
  const t = docs.find(x => x.id === id);
  if (!t) return;
  if (mktOf(t) === "stocks") {
    if (t.mode === "backtest") {
      activeProject = projName(t.project) ? t.project : "none";
      btOpen = true;
    }
    if (tab !== "analyze") show(t.mode === "live" ? "live" : "backtest");
    openStock(t);
    return;
  }
  if (t.mode === "backtest") {
    activeProject = projName(t.project) ? t.project : "none";
    btOpen = true;
  }
  if (tab !== "analyze") show(t.mode === "live" ? "live" : "backtest");
  openSheet2(t);
}
$("#f2Dup").onclick = () => {
  const id = editingId;
  if (!id) return;
  closeSheet2();
  dupTrade(id);
};
$("#f2Del").onclick = e => {
  const b = e.currentTarget,
    id = editingId;
  if (!id) return;
  if (!b.dataset.armed) {
    b.dataset.armed = "1";
    b.textContent = "Click again to delete";
    setTimeout(() => {
      if (b.dataset.armed) {
        delete b.dataset.armed;
        b.textContent = "Delete";
      }
    }, 3000);
    return;
  }
  closeSheet2();
  deleteDoc(id);
  toast("Trade deleted");
};
function closeSheet2() {
  $("#sheet2").hidden = true;
  document.body.style.overflow = "";
  editingId = null;
}
$("#tradeForm2").onsubmit = e => {
  e.preventDefault();
  const old = editingId ? docs.find(d => d.id === editingId) : null,
    mode = old ? old.mode : f2Mode || formMode();
  const t = {
    id: old ? old.id : uid(),
    mode,
    market: old ? mktOf(old) : f2Market,
    project: mode === "backtest" && $("#f2Project").value !== "none" ? $("#f2Project").value : null,
    status: $("#f2Missed").checked ? "missed" : "taken",
    account: $("#f2Account").value,
    btDate: mode === "backtest" ? $("#f2BtDate").value || todayISO() : null,
    date: $("#f2Date").value,
    closeDate: $("#f2Close").value,
    concept: $("#f2Concept").value,
    fase: radio("f2fase") ? Number(radio("f2fase")) : null,
    wStruct: radio("f2wstruct") || "",
    wPat: $("#f2WPat").value === "?" ? "" : $("#f2WPat").value,
    wPatSub: $("#f2WPat").value && $("#f2WPat").value !== "?" ? $("#f2WPatSub").value : "",
    scaleIn: $("#f2Scale").checked,
    channel: $("#f2Entry").value === "Reversal" && $("#f2Chan").checked,
    dMs: radio("f2dms") || "",
    hMs: radio("f2hms") || "",
    weekly: wcVals(),
    sub: $("#f2Variant").value,
    dPros: DCRIT.map(([k]) => k).filter(k => dSel[k]),
    dailyFib: dSel.fc ? "ja" : "nee",
    outcome: radio("f2out"),
    r: radio("f2out") === "open" ? null : num("f2R"),
    maxR: num("f2MaxR"),
    wRange: $("#f2Range").checked,
    notes: $("#f2Notes").value.trim(),
    evaluation: radio("f2eval"),
    onPlan: radio("f2eval") ? radio("f2eval") === "plan" : null,
    exitReason: $("#f2Exit").value,
    entry4h: $("#f2Entry").value,
    planEntry: num("f2PlanEntry"),
    slPips: num("f2SlPips"),
    tpPips: num("f2TpPips"),
    ...f2CheckVals(),
    ecTf: $("#f2Entry").value === "Engulfing Candle" ? radio("f2ectf") : "",
    shots: Object.fromEntries(Object.entries(f2Shots).filter(([, v]) => v && v !== "uploading")),
    shotLinks: { ...f2Links },
    pair: $("#f2Pair").value.trim().toUpperCase(),
    dir: radio("f2dir"),
    created: Date.now(),
  };
  if (old) t.created = old.created || t.created;
  saveDoc(old ? { ...old, ...t } : t);
  acRemember("fx", t.account);
  if (t.date && !old) {
    calMonth = t.date.slice(0, 7);
    calTouched = true;
  }
  toast(old ? "Changes saved" : "Trade saved");
  closeSheet2();
};
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("#sheetS").hidden) {
    closeStock();
    return;
  }
  if (!$("#setSheet").hidden) {
    $("#setSheet").hidden = true;
    return;
  }
  if (!$("#admSheet").hidden) {
    $("#admSheet").hidden = true;
    return;
  }
  if (!$("#newProj").hidden) {
    closeNewProj();
    return;
  }
  if (!$("#projSheet").hidden) {
    closeProjSheet();
    return;
  }
  if (!$("#viewer").hidden) {
    $("#viewer").hidden = true;
    if ($("#sheet2").hidden) document.body.style.overflow = "";
    return;
  }
  if (!$("#sheet2").hidden) closeSheet2();
});

/* ---------- share links: a read-only page per trade (share.html) ---------- */
// With a share worker set in config.js (worker/share-worker.js) links get a trade preview in chat apps.
const shareUrl = tok =>
  window.TJ_CONFIG && TJ_CONFIG.shareBase
    ? TJ_CONFIG.shareBase.replace(/\/$/, "") + "/t/" + tok
    : new URL("share.html?t=" + tok, location.href).href;
// p = which form: "f2" (forex) or "s" (invest); each has its own share bar
async function f2ShareShow(id, tok, p = "f2") {
  const bar = $("#" + p + "ShareBar");
  bar.hidden = true;
  bar.dataset.id = id || "";
  if (!id || !ME) return;
  const { data } = await SB.from("shares").select("token,views,last_view").eq("doc_id", id).maybeSingle();
  tok = tok || (data && data.token);
  if (bar.dataset.id !== id || !tok) return;
  $("#" + p + "ShareUrl").value = shareUrl(tok);
  // views: once per browser per link, the owner's own opens don't count
  const v = (data && data.views) || 0;
  $("#" + p + "ShareViews").innerHTML = v
    ? `<b>${v}</b><span class="shrlast"> · last ${esc(fmtD(isoD(new Date(data.last_view))))}</span>`
    : "<b>0</b>";
  bar.hidden = false;
}
// the trade's share token, made on first use
async function shareToken(id, p = "f2") {
  if (!ME) return toast("Sign in to share trades."), null;
  let { data, error } = await SB.from("shares").select("token").eq("doc_id", id).maybeSingle();
  if (!error && !data) ({ data, error } = await SB.from("shares").insert({ doc_id: id }).select("token").single());
  if (error || !data) return toast("Couldn't make a share link. Try again."), null;
  await f2ShareShow(id, data.token, p);
  return data.token;
}
$("#f2Share").onclick = async () => {
  const id = editingId,
    tok = id && (await shareToken(id));
  if (!tok) return;
  try {
    await navigator.clipboard.writeText(shareUrl(tok));
    toast("Share link copied");
  } catch {
    $("#f2ShareUrl").select();
  }
};
/* copy analysis: the trade as text with its TradingView links and the share link, ready to paste in Discord, WhatsApp or anywhere else (plain text, no markdown) */
function analysisText(t, link) {
  const w = t.weekly || {},
    L = t.shotLinks || {},
    ok = (l, v) => (v === "for" ? "✓ " : v === "against" ? "✗ " : "") + l;
  const WK = [
    ["ms", "MS"],
    ["trend", "Trend"],
    ["fibc", "FC"],
    ["fiba", "Fib active"],
    ["ic", "IC"],
    ["whl", "High / Low"],
    ["sd", "S&D zone"],
    ["pz", "Proven zone"],
    ["lcc", "Last CC"],
    ["ec", "Engulfing candle"],
  ];
  const DK = { fc: "FC", dcc: "Last CC", sd: "S&D zone" };
  const block = (title, link, items) => {
    items = items.filter(Boolean);
    if (!link && !items.length) return "";
    return [title + ":", link || "", ...items.map(i => "- " + i)].filter(Boolean).join("\n");
  };
  const head = [
    `${t.pair || "Trade"}${t.dir ? " - " + (t.dir === "long" ? "Long" : "Short") : ""}`,
    t.fase ? "Phase " + t.fase : "",
    t.mode === "backtest" ? "Backtest" : "",
    t.date ? fmtD(t.date) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const parts = [
    // a concept other than Weekly - 4H is a pattern on the daily: the setup is Weekly - Daily - 4H
    head + (t.concept ? "\nConcept: " + (t.concept === "Weekly - 4H" ? "Weekly - 4H" : "Weekly - Daily - 4H") : ""),
    block("Weekly", L.weekly, [
      t.wStruct ? (t.wStruct === "inner" ? "Inner" : "Outer") + " structure" : "",
      t.wPat ? t.wPat + " pattern" + (t.wPatSub ? " (" + t.wPatSub + ")" : "") : "",
      ...WK.filter(([k]) => w[k]).map(([k, l]) => ok(l, w[k])),
    ]),
    block("Daily", L.daily, [
      t.concept && t.concept !== "Weekly - 4H"
        ? t.concept + " pattern" + (t.sub && t.sub !== "—" ? " (" + t.sub + ")" : "")
        : "",
      t.dMs ? ok("MS", t.dMs) : "",
      ...(Array.isArray(t.dPros) ? t.dPros : []).map(k => "✓ " + (DK[k] || k)),
    ]),
    block("4h", L.h4, [
      t.entry4h ? t.entry4h + (t.ecTf ? " " + t.ecTf.toUpperCase() : "") : "",
      { bos: "Break of structure", som: "Switch of momentum" }[t.struct] || "",
      t.channel ? "Channel" : "",
      t.hMs ? ok("MS", t.hMs) : "",
    ]),
    block(t.ecTf ? t.ecTf : "1h/2h", L.ltf, []),
    t.notes || "",
    link ? "Full trade: " + link : "",
  ];
  return parts.filter(Boolean).join("\n\n");
}
$("#f2CopyAn").onclick = async () => {
  const t = docs.find(d => d.id === editingId),
    tok = t && (await shareToken(t.id));
  if (!tok) return;
  try {
    await navigator.clipboard.writeText(analysisText(t, shareUrl(tok)));
    toast("Analysis copied");
  } catch {
    toast("Couldn't copy to the clipboard.");
  }
};
["f2", "s"].forEach(p => {
  $("#" + p + "ShareCopy").onclick = async () => {
    try {
      await navigator.clipboard.writeText($("#" + p + "ShareUrl").value);
      toast("Share link copied");
    } catch {
      $("#" + p + "ShareUrl").select();
    }
  };
  $("#" + p + "ShareOff").onclick = async () => {
    const id = $("#" + p + "ShareBar").dataset.id;
    const { error } = await SB.from("shares").delete().eq("doc_id", id);
    if (error) return toast("Couldn't turn the link off. Try again.");
    $("#" + p + "ShareBar").hidden = true;
    toast("Link turned off");
  };
});
/* invest: the same Share and Copy analysis buttons */
function investText(t, link) {
  const L = t.shotLinks || {},
    ph = t.sPhase,
    ms = v => (v === "for" ? "✓ MS" : v === "against" ? "✗ MS" : ""),
    block = (title, link, items) => {
      items = items.filter(Boolean);
      if (!link && !items.length) return "";
      return [title + ":", link || "", ...items.map(i => "- " + i)].filter(Boolean).join("\n");
    };
  const head =
    [t.ticker || t.pair || "Trade", t.mode === "backtest" ? "Backtest" : "", t.date ? fmtD(t.date) : ""]
      .filter(Boolean)
      .join(" · ") + (ph ? "\nPhase " + ph : "");
  return [
    head,
    block("12M", L.m12, [
      ms(t.s12Ms),
      t.s12Ms === "for" && t.s12bm ? t.s12bm : "",
      t.s12Ms === "against" && t.s12ret ? "Back to " + t.s12ret : "",
    ]),
    block("6M", L.m6, [
      ms(t.s6Ms),
      ph === "A" && t.s6bm ? "BM " + t.s6bm : "",
      ph === "B" && t.s6ret ? "Back to " + t.s6ret : "",
    ]),
    block("3M", L.m3, [
      ms(t.s3Ms),
      ph === "A" && t.s3bm ? "BM" : "",
      (ph === "A" && t.s3room) || (ph === "B" && t.s3roomB) ? "Room" : "",
    ]),
    block("Monthly", L.mo, [ms(t.s1Ms), ph === "A" && t.s1room ? "Room" : "", t.s1cc ? "Bullish CC" : ""]),
    block("Weekly", L.wk, [ms(t.swMs), t.swPat || ""]),
    t.notes || "",
    link ? "Full trade: " + link : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
$("#sShare").onclick = async () => {
  const tok = sEditing && (await shareToken(sEditing, "s"));
  if (!tok) return;
  try {
    await navigator.clipboard.writeText(shareUrl(tok));
    toast("Share link copied");
  } catch {
    $("#sShareUrl").select();
  }
};
$("#sCopyAn").onclick = async () => {
  const t = docs.find(d => d.id === sEditing),
    tok = t && (await shareToken(t.id, "s"));
  if (!tok) return;
  try {
    await navigator.clipboard.writeText(investText(t, shareUrl(tok)));
    toast("Analysis copied");
  } catch {
    toast("Couldn't copy to the clipboard.");
  }
};
/* ---------- chart screenshots ---------- */
const SLOTS = [
  ["weekly", "Weekly"],
  ["daily", "Daily"],
  ["h4", "4H"],
  ["ltf", "1H/2H"],
];
const PKEY = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘V" : "Ctrl+V";
let viewTrade = null;
const shotUrl = {},
  BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const shotKey = id => ME + "/" + id;
const shotSrc = id => shotUrl[id] || BLANK;
const shotIds = list => [
  ...new Set(list.flatMap(d => Object.values(d.shots || {})).filter(v => v && v !== "uploading")),
];
async function ensureShotUrls(list) {
  if (!ME) return;
  const ids = shotIds(list).filter(id => !shotUrl[id]);
  for (let i = 0; i < ids.length; i += 100) {
    const part = ids.slice(i, i + 100);
    const { data, error } = await SB.storage.from("shots").createSignedUrls(part.map(shotKey), 7 * 864e2);
    if (error) {
      console.warn(error);
      continue;
    }
    (data || []).forEach((r, j) => {
      if (r && r.signedUrl) shotUrl[part[j]] = r.signedUrl;
    });
  }
}
async function refreshShotUrls() {
  Object.keys(shotUrl).forEach(k => delete shotUrl[k]);
  await ensureShotUrls(docs);
}
setInterval(() => {
  if (ME) refreshShotUrls().then(render);
}, 864e5);
const LSLOTS = [
  ["m12", "12M"],
  ["m6", "6M"],
  ["m3", "3M"],
  ["mo", "Monthly"],
  ["wk", "Weekly"],
  ["monthly", "Monthly"],
  ["weekly", "Weekly"],
  ["daily", "Daily"],
  ["h4", "4H"],
  ["ltf", "1H/2H"],
];
// the lower-timeframe chart is named after its timeframe (1H or 2H) when the trade says which
const slotLab = (t, k, l) => (k === "ltf" && t && t.ecTf ? t.ecTf.toUpperCase() : l);
const hasShot = (t, k) => !!((t.shots && t.shots[k]) || (t.shotLinks && t.shotLinks[k]));
const shotCount = t => LSLOTS.filter(([k]) => hasShot(t, k)).length;
async function uploadShot(k, file, store, rerender) {
  if (!file || !file.type.startsWith("image/")) {
    toast("That is not an image.");
    return;
  }
  if (!ME) {
    toast("Sign in to save screenshots.");
    return;
  }
  const prev = store[k];
  store[k] = "uploading";
  rerender();
  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
  const id = uid() + "." + ext;
  try {
    const { error } = await SB.storage
      .from("shots")
      .upload(shotKey(id), file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = await SB.storage.from("shots").createSignedUrl(shotKey(id), 7 * 864e2);
    if (data && data.signedUrl) shotUrl[id] = data.signedUrl;
    store[k] = id;
  } catch (e) {
    console.warn(e);
    if (prev) store[k] = prev;
    else delete store[k];
    toast("Upload failed. Try again.");
  }
  rerender();
}
/* new form: chart screenshots */
let f2Shots = {},
  f2Active = null,
  f2Links = {};
const F2SLOTS = [
  ["weekly", "#f2ShotW", "Weekly chart"],
  ["daily", "#f2ShotD", "Daily chart"],
  ["h4", "#f2ShotH", "4H chart"],
  ["ltf", "#f2ShotL", "1H / 2H chart"],
];
function renderF2Shots() {
  if (typeof f2Summaries === "function") setTimeout(f2Summaries);
  {
    // all of this trade's charts in the zoom, ‹ › to click through them
    const n = vGallery({ shots: f2Shots, shotLinks: f2Links, ecTf: radio("f2ectf") }).length,
      b = $("#f2ViewCharts");
    b.hidden = !n;
    b.textContent = `View charts (${n}) ›`;
  }
  F2SLOTS.forEach(([k, sel, l]) => {
    if (k === "ltf" && radio("f2ectf")) l = radio("f2ectf").toUpperCase() + " chart";
    const id = f2Shots[k],
      ln = f2Links[k],
      tv = tvImg(ln);
    $(sel).innerHTML = `<div class="shot" data-f2slot="${k}"><span class="eyebrow">${l}</span>
  <div class="linkrow"><input type="url" class="shotlink" data-f2link="${k}" value="${esc(ln || "")}" placeholder="Paste a TradingView link" aria-label="${l} link" autocomplete="off" spellcheck="false">${ln ? `<a class="btn small" href="${esc(ln)}" target="_blank" rel="noopener">Open ↗</a>` : ""}</div>
  ${tv ? `<a class="shotprev" href="${esc(ln)}" target="_blank" rel="noopener" title="Click to zoom"><img src="${tv}" alt="${l} (TradingView)" loading="lazy" onerror="this.closest('.shotprev').hidden=true"></a>` : ""}
  ${id && id !== "uploading" ? `<div class="shotprev old"><img src="${shotSrc(id)}" alt="${l}" data-zoom="${id}" data-zlabel="${l}"><button type="button" class="btn small ghost danger" data-f2del="${k}">Remove old screenshot</button></div>` : ""}</div>`;
  });
}
F2SLOTS.forEach(([, sel]) => {
  const c = $(sel);
  c.addEventListener("click", e => {
    const d = e.target.closest("[data-f2del]");
    if (d) {
      delete f2Shots[d.dataset.f2del];
      renderF2Shots();
    }
  });
  c.addEventListener("input", e => {
    const k = e.target.dataset.f2link;
    if (k) {
      const v = e.target.value.trim();
      if (v) f2Links[k] = v;
      else delete f2Links[k];
    }
  });
  c.addEventListener("change", e => {
    if (e.target.dataset.f2link) renderF2Shots();
  });
  c.addEventListener("paste", e => {
    const i = e.target.closest("[data-f2link]");
    if (i)
      setTimeout(() => {
        i.dispatchEvent(new Event("input", { bubbles: true }));
        renderF2Shots();
      }, 0);
  });
});
function openViewer(id) {
  const t = docs.find(x => x.id === id);
  if (!t) return;
  viewTrade = t;
  $("#viewerTitle").textContent = `${t.pair || "Trade"} · ${t.date || ""}`;
  $("#viewerTabs").innerHTML = LSLOTS.filter(([k]) => hasShot(t, k))
    .map(
      ([k, l]) =>
        `<label class="seg"><input type="radio" name="vtab" value="${k}" data-vtab="${k}"><span>${slotLab(t, k, l)}</span></label>`
    )
    .join("");
  {
    const vn = $("#viewerNotes");
    vn.hidden = !t.notes;
    vn.innerHTML = t.notes ? `<span class="eyebrow">Notes</span><p>${esc(t.notes)}</p>` : "";
  }
  $("#viewer").hidden = false;
  document.body.style.overflow = "hidden";
  showVTab((LSLOTS.find(([k]) => hasShot(t, k)) || [])[0]);
}
function openImage(id, label) {
  viewTrade = null;
  $("#viewerNotes").hidden = true;
  $("#viewerTitle").textContent = label || "Chart";
  $("#viewerTabs").innerHTML = "";
  $("#viewerImg").innerHTML =
    `<a href="${shotSrc(id)}" target="_blank" rel="noopener" title="Open full size in a new tab"><img src="${shotSrc(id)}" alt="${esc(label || "Chart")}"></a>`;
  $("#viewer").hidden = false;
  document.body.style.overflow = "hidden";
}
function showVTab(k) {
  if (!viewTrade || !k) return;
  document.querySelectorAll('input[name="vtab"]').forEach(i => (i.checked = i.value === k));
  const l = slotLab(viewTrade, k, LSLOTS.find(s => s[0] === k)[1]),
    id = viewTrade.shots && viewTrade.shots[k],
    ln = viewTrade.shotLinks && viewTrade.shotLinks[k];
  $("#viewerImg").innerHTML = id
    ? `<a class="vzoom" href="${shotSrc(id)}" target="_blank" rel="noopener" title="Click to zoom"><img src="${shotSrc(id)}" alt="${l} chart for ${esc(viewTrade.pair || "trade")}"></a>`
    : (tvImg(ln)
        ? `<a class="tvwrap" href="${esc(ln)}" target="_blank" rel="noopener" title="Open in TradingView"><img src="${tvImg(ln)}" alt="${l} chart for ${esc(viewTrade.pair || "trade")}" onerror="this.closest('.tvwrap').hidden=true;this.closest('.tvwrap').nextElementSibling.hidden=false"></a><div hidden>`
        : "<div>") +
      `<div class="linkcard"><span class="eyebrow">${l} chart</span><p class="hint" style="margin:0">This chart is a TradingView snapshot link.</p><a class="btn" href="${esc(ln)}" target="_blank" rel="noopener">Open in TradingView ↗</a><code>${esc(ln)}</code></div></div>`;
}
// the trade's charts as a zoom gallery: [{k, label, src}]
function vGallery(t) {
  return LSLOTS.filter(([k]) => hasShot(t, k))
    .map(([k, l]) => ({
      k,
      label: slotLab(t, k, l),
      src: t.shots && t.shots[k] ? shotSrc(t.shots[k]) : tvImg(t.shotLinks && t.shotLinks[k]),
    }))
    .filter(g => g.src && g.src !== BLANK);
}
$("#f2ViewCharts").onclick = () => {
  const gal = vGallery({ shots: f2Shots, shotLinks: f2Links, ecTf: radio("f2ectf") });
  if (gal.length) zOpen(gal[0].src, false, gal, 0);
};
function tvImg(u) {
  const m = /tradingview\.com\/x\/([A-Za-z0-9]+)/.exec(u || "");
  return m ? `https://s3.tradingview.com/snapshots/${m[1][0].toLowerCase()}/${m[1]}.png` : "";
}
