/*
 * accounts.js — Accounts tab: trading accounts (FTMO challenges/funded, personal, invest) and their balances.
 */
/* ---------- trading accounts ---------- */
const accounts = mk =>
  docs
    .filter(d => d.kind === "account" && (!mk || (d.market || "fx") === mk))
    .sort(
      (a, b) => (acStat(a) === "active" ? 0 : 1) - (acStat(b) === "active" ? 0 : 1) || a.name.localeCompare(b.name)
    );
const acKey = t => {
  if (!t.account) return null;
  const have = new Set(accounts(mktOf(t)).map(a => a.name)),
    parts = String(t.account)
      .split(/\s*,\s*/)
      .filter(p => have.has(p));
  return parts.length ? parts.join(", ") : "Removed account";
};
const acOf = name => docs.find(d => d.kind === "account" && d.name === name);
const acRemember = (mk, name) => {
  try {
    localStorage.setItem("tj-lastacct-" + mk, name || "");
  } catch {}
};
function acFill(sel, mk, cur) {
  const list = accounts(mk).filter(a => acStat(a) === "active" || a.name === cur);
  let v = cur;
  if (v === null) {
    try {
      v = localStorage.getItem("tj-lastacct-" + mk) || "";
    } catch {
      v = "";
    }
    if (v && !list.some(a => a.name === v)) v = "";
  }
  const extra = v && !list.some(a => a.name === v) ? [`<option value="${esc(v)}">${esc(v)}</option>`] : [];
  $(sel).innerHTML =
    `<option value="">No account</option>` +
    list.map(a => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join("") +
    extra.join("");
  $(sel).value = v || "";
}
const acInit = a =>
  a.initial != null
    ? a.initial
    : (() => {
        const m = String(a.size || "").match(/^(\d+(?:\.\d+)?)\s*K$/i);
        return m ? Number(m[1]) * 1000 : null;
      })();
const stCur = t => t.sCur || "USD";
const fmtMoney = (v, c) => {
  try {
    return (
      (v > 0 ? "+" : "") +
      new Intl.NumberFormat("en-US", { style: "currency", currency: c || "USD", maximumFractionDigits: 0 }).format(v)
    );
  } catch {
    return (v > 0 ? "+" : "") + Math.round(v) + " " + (c || "");
  }
};
function acRender() {
  const L = accounts(market),
    mk = market === "fx" ? "Forex" : "Invest";
  $("#acHead").textContent = mk + " accounts";
  {
    const tb = $("#taxBox");
    if (tb) tb.innerHTML = market === "stocks" ? taxHTML() : "";
  }
  const card = (a, name, list, removable) => {
    const tk = taken(list),
      st = stats(list),
      last = list
        .map(t => t.date)
        .filter(Boolean)
        .sort()
        .pop(),
      live = list.filter(t => t.mode === "live").length;
    return `<div class="panel accard ${a && acStat(a) !== "active" ? "dim" : ""}"><div class="row spread"><div>${a ? `<button type="button" class="acname" data-acren="${a.id}" title="Click to rename">${esc(name)}</button>` : `<b>${esc(name)}</b>`}
      <small class="hint" style="display:block;margin:0">${a ? ACTYPE[a.type] || "No type set" : "Trades without an account"}</small></div>
      ${a ? `<span class="acbadge st-${acStat(a)}">${ACSTAT[acStat(a)]}</span>` : ""}
      ${removable ? `<button type="button" class="acx" data-acdel="${a.id}" aria-label="Remove ${esc(name)}" title="Remove account">✕</button>` : ""}</div>
      <dl class="scstats"><div><dt>Trades</dt><dd class="num">${list.length}</dd></div><div><dt>Win rate</dt><dd class="num">${fmtP(st.wr)}</dd></div><div><dt>Total R</dt><dd class="num ${st.total > 0 ? "pos" : st.total < 0 ? "neg" : ""}">${tk.length ? fmtR(st.total) : "—"}</dd></div><div><dt>Last trade</dt><dd class="num">${last ? esc(fmtD(last)) : "—"}</dd></div></dl>
      ${
        a
          ? (() => {
              const ini = acInit(a),
                cur = a.current ?? ini,
                chg = ini && cur != null ? ((cur - ini) / ini) * 100 : null;
              return `<div class="acmoney"><label>Initial size<input type="number" min="0" step="any" inputmode="decimal" value="${ini ?? ""}" data-acnum="initial" data-acid="${a.id}"></label><label>Current size<input type="number" min="0" step="any" inputmode="decimal" value="${cur ?? ""}" data-acnum="current" data-acid="${a.id}"></label><label>Currency<select data-accur="${a.id}">${["USD", "EUR", "GBP", "CHF", "CAD", "AUD", "JPY"].map(c => `<option ${(a.currency || "USD") === c ? "selected" : ""}>${c}</option>`).join("")}</select></label></div>
      ${chg != null ? `<span class="acchg ${chg > 0 ? "pos" : chg < 0 ? "neg" : ""}">${chg > 0 ? "+" : ""}${chg.toFixed(2)}% since start · ${fmtMoney(cur - ini, a.currency)}</span>` : ""}${(() => {
        if (market !== "fx" || !ini || cur == null) return "";
        const tt = taken(list.filter(t => t.mode === "live"));
        if (!tt.length) return "";
        const exp = (tt.reduce((x, t) => x + t.r, 0) * ini) / 100,
          c = cur - ini - exp,
          pt = c / tt.length;
        return `<span class="accost" title="Account change minus what your logged R should have made at 1% of the initial size">Costs ≈ ${fmtMoney(c, a.currency)} · ${fmtMoney(pt, a.currency)}/trade (${(pt / (ini / 100) > 0 ? "+" : "") + (pt / (ini / 100)).toFixed(2)}R)</span>`;
      })()}`;
            })()
          : ""
      }
      ${
        a
          ? `<div class="acmoney acsel"><label>Status<select data-acstat="${a.id}">${Object.entries(ACSTAT)
              .map(([k, l]) => `<option value="${k}" ${acStat(a) === k ? "selected" : ""}>${l}</option>`)
              .join(
                ""
              )}</select></label><label>Type<select data-actype="${a.id}"><option value="">—</option>${Object.entries(
              ACTYPE
            )
              .map(([k, l]) => `<option value="${k}" ${a.type === k ? "selected" : ""}>${l}</option>`)
              .join("")}</select></label></div>`
          : ""
      }${a && a.market === "stocks" && getSet().cgtOn !== false ? `<label class="checkline acwh"><input type="checkbox" data-acwh="${a.id}" ${a.cgtWh !== false ? "checked" : ""}><span>Tax withheld on sales<small>This broker keeps ${+(Number(getSet().cgtRate) || 0)}% of each gain for the tax office. Untick if you chose opt-out.</small></span></label>` : ""}</div>`;
  };
  const all = docs.filter(t => !t.kind && mktOf(t) === market);
  const cards = L.map(a =>
    card(
      a,
      a.name,
      all.filter(t => t.account === a.name),
      true
    )
  );
  const known = new Set(L.map(a => a.name)),
    other = [...new Set(all.map(t => t.account).filter(n => n && !known.has(n)))];
  $("#acList").innerHTML = cards.length
    ? cards.join("")
    : `<div class="panel"><p class="hint" style="margin:0">No ${mk.toLowerCase()} accounts yet. Add one above.</p></div>`;
}
function acAdd() {
  const name = $("#acName").value.trim();
  if (!name) {
    $("#acName").focus();
    return;
  }
  if (acOf(name)) {
    toast("That account already exists.");
    return;
  }
  const ini = $("#acSize").value === "" ? null : Number($("#acSize").value);
  saveDoc({
    id: uid(),
    kind: "account",
    name,
    market,
    type: $("#acType").value,
    initial: ini,
    current: ini,
    currency: $("#acCur").value,
    created: Date.now(),
  });
  $("#acName").value = "";
  $("#acSize").value = "";
  $("#acType").value = "";
  acRender();
  $("#acName").focus();
}
$("#acAddBtn").onclick = acAdd;
$("#acName").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    acAdd();
  }
});
$("#acList").addEventListener("change", e => {
  const n = e.target.closest("[data-acnum]"),
    c = e.target.closest("[data-accur]");
  if (n) {
    const a = docs.find(d => d.id === n.dataset.acid);
    if (!a) return;
    const v = n.value === "" ? null : Number(n.value);
    const nd = { ...a, [n.dataset.acnum]: v };
    if (nd.initial == null) nd.initial = acInit(a);
    if (n.dataset.acnum === "initial" && a.current == null) nd.current = v;
    saveDoc(nd);
  }
  if (c) {
    const a = docs.find(d => d.id === c.dataset.accur);
    if (a) saveDoc({ ...a, currency: c.value });
  }
  const so = e.target.closest("[data-acstat]");
  if (so) {
    const a = docs.find(d => d.id === so.dataset.acstat);
    if (a) {
      const nd = { ...a, status: so.value };
      delete nd.archived;
      saveDoc(nd);
    }
  }
  const ty = e.target.closest("[data-actype]");
  if (ty) {
    const a = docs.find(d => d.id === ty.dataset.actype);
    if (a) saveDoc({ ...a, type: ty.value });
  }
  const wh = e.target.closest("[data-acwh]");
  if (wh) {
    const a = docs.find(d => d.id === wh.dataset.acwh);
    if (a) saveDoc({ ...a, cgtWh: wh.checked });
  }
});
$("#acList").addEventListener("click", e => {
  const so = e.target.closest("[data-acsetstat]");
  if (so) {
    const a = docs.find(d => d.id === so.dataset.acsetstat);
    if (a) {
      const nd = { ...a, status: so.dataset.v };
      delete nd.archived;
      saveDoc(nd);
    }
    return;
  }
  const ty = e.target.closest("[data-acsettype]");
  if (ty) {
    const a = docs.find(d => d.id === ty.dataset.acsettype);
    if (a) saveDoc({ ...a, type: a.type === ty.dataset.v ? "" : ty.dataset.v });
    return;
  }
  const del = e.target.closest("[data-acdel]");
  if (del) {
    const a = docs.find(d => d.id === del.dataset.acdel);
    if (!a) return;
    const n = docs.filter(t => !t.kind && t.account === a.name).length;
    if (!del.classList.contains("armed")) {
      del.classList.add("armed");
      del.textContent = n ? `Remove (${n} trades keep the name)` : "Remove";
      setTimeout(() => {
        if (del.isConnected) {
          del.classList.remove("armed");
          del.textContent = "✕";
        }
      }, 3000);
      return;
    }
    deleteDoc(a.id);
    acRender();
    toast("Account removed");
    return;
  }
  const rn = e.target.closest("[data-acren]");
  if (rn) {
    const a = docs.find(d => d.id === rn.dataset.acren);
    if (!a) return;
    const inp = document.createElement("input");
    inp.className = "acedit";
    inp.value = a.name;
    inp.maxLength = 60;
    inp.setAttribute("aria-label", "Rename account");
    rn.replaceWith(inp);
    inp.focus();
    inp.select();
    const done = save => {
      if (inp.dataset.done) return;
      inp.dataset.done = 1;
      const nn = inp.value.trim();
      if (save && nn && nn !== a.name) {
        if (acOf(nn)) {
          toast("That name is already used.");
          acRender();
          return;
        }
        const oldn = a.name;
        saveDoc({ ...a, name: nn });
        docs.filter(t => !t.kind && t.account === oldn).forEach(t => saveDoc({ ...t, account: nn }));
        toast("Account renamed");
      }
      acRender();
    };
    inp.addEventListener("keydown", ev => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        done(true);
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        done(false);
      }
    });
    inp.addEventListener("blur", () => done(true));
  }
});
/* seed the list once from account names already used on trades */
let acSeeding = false;
function acSeed() {
  if (acSeeding) return;
  const st = docs.find(d => d.id === "settings");
  if (st && st.accountsSeeded) return;
  if (!docs.some(d => !d.kind)) return;
  acSeeding = true;
  const names = [...new Set(docs.filter(t => !t.kind && t.account && !t.account.includes(",")).map(t => t.account))];
  names
    .filter(n => !acOf(n))
    .forEach(n => {
      const tr = docs.find(t => !t.kind && t.account === n),
        lo = n.toLowerCase();
      saveDoc({
        id: uid(),
        kind: "account",
        name: n,
        market: mktOf(tr),
        type: lo.includes("challenge")
          ? "challenge"
          : lo.includes("funded")
            ? "funded"
            : lo.includes("demo")
              ? "demo"
              : "",
        size: (n.match(/\d+\s?K/i) || [""])[0].toUpperCase().replace(/\s/g, ""),
        currency: "USD",
        archived: false,
        created: Date.now(),
      });
    });
  saveDoc({ ...(docs.find(d => d.id === "settings") || { id: "settings", kind: "settings" }), accountsSeeded: true });
  acSeeding = false;
}
applySettings();
const fmtD = d => {
  if (!d) return "";
  const x = new Date(d + "T12:00:00");
  return `${x.getDate()} ${MONTHS[x.getMonth()].slice(0, 3)} ${x.getFullYear()}`;
};
const isoD = x =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
function jRange() {
  const [y, m] = calMonth.split("-").map(Number),
    now = new Date();
  if (jPeriod === "month")
    return { from: `${calMonth}-01`, to: isoD(new Date(y, m, 0)), label: `${MONTHS[m - 1]} ${y}` };
  if (jPeriod === "quarter") {
    const q = Math.floor((m - 1) / 3);
    return { from: isoD(new Date(y, q * 3, 1)), to: isoD(new Date(y, q * 3 + 3, 0)), label: `Q${q + 1} ${y}` };
  }
  if (jPeriod === "year") return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
  if (jPeriod === "week") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: isoD(mon), to: isoD(sun), label: "This week" };
  }
  if (jPeriod === "custom") return { from: jFrom, to: jTo, label: "Custom range" };
  return { from: "", to: "", label: "All time" };
}
