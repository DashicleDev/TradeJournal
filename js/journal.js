/*
 * journal.js — Journal and Backtest views: equity charts, trade tables, capital gains tax (BE), projects
 * including the account simulation for invest backtests.
 */
/* ---------- journal charts ---------- */
function axisY(lo, hi, ticks, fmt, W, y, L, R) {
  return ticks
    .map(
      v =>
        `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" ${v === 0 ? 'stroke-width="1.25" stroke="var(--muted)" opacity=".5"' : ""}/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`
    )
    .join("");
}
function ticksFor(lo, hi, n = 4) {
  const st = niceStep((hi - lo) / n || 1),
    a = Math.floor(lo / st) * st,
    b = Math.ceil(hi / st) * st,
    t = [];
  for (let v = a; v <= b + 1e-9; v += st) t.push(+v.toFixed(6));
  return t;
}
const rLab = v => (v > 0 ? "+" : "") + +v.toFixed(1) + (market === "stocks" ? "%" : "R");
function lineChart(pts, { fmt = rLab, lo, hi, zero = true, label }) {
  /* pts: [{v,tip,x}] */
  const W = 640,
    H = 220,
    L = 52,
    R = 12,
    T = 12,
    B = 26;
  if (pts.length < 2) return `<p class="hint">Need at least 2 trades in this period.</p>`;
  const vs = pts.map(p => p.v);
  lo = lo ?? Math.min(zero ? 0 : Infinity, ...vs);
  hi = hi ?? Math.max(zero ? 0 : -Infinity, ...vs);
  if (hi - lo < 1e-9) {
    hi += 1;
    lo -= 1;
  }
  const tk = ticksFor(lo, hi);
  lo = tk[0];
  hi = tk[tk.length - 1];
  const x = i => L + (i / (pts.length - 1)) * (W - L - R),
    y = v => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const path = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const hits = pts
    .map((p, i) => {
      const w = (W - L - R) / Math.max(pts.length - 1, 1);
      return `<rect x="${(x(i) - w / 2).toFixed(1)}" y="${T}" width="${w.toFixed(1)}" height="${H - T - B}" fill="transparent" data-tip="${esc(p.tip)}" data-hx="${x(i).toFixed(1)}" data-hy="${y(p.v).toFixed(1)}"/>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="jchart" role="img" aria-label="${esc(label)}">${axisY(lo, hi, tk, fmt, W, y, L, R)}
  <text x="${L}" y="${H - 6}">${esc(pts[0].x || "")}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${esc(last.x || "")}</text>
  <polyline points="${path}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${x(pts.length - 1)}" cy="${y(last.v)}" r="4.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
  <g class="hover"><line class="hx" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-dasharray="3 3" opacity="0"/><circle class="hc" r="4.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2" opacity="0"/></g>${hits}</svg>`;
}
function barChart(bars, { label, fmt, narrow, wide }) {
  /* bars: [{v,x,tip}] diverging around 0 */
  const W = narrow ? 360 : wide ? 1040 : 640,
    H = narrow ? (wide ? 180 : 240) : wide ? 190 : 220,
    L = 52,
    R = 12,
    T = 12,
    B = 26;
  if (!bars.length) return `<p class="hint">No trades in this period.</p>`;
  let lo = Math.min(0, ...bars.map(b => b.v)),
    hi = Math.max(0, ...bars.map(b => b.v));
  if (hi - lo < 1e-9) hi = 1;
  const tk = ticksFor(lo, hi);
  lo = tk[0];
  hi = tk[tk.length - 1];
  const y = v => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const slot = (W - L - R) / bars.length,
    bw = Math.max(4, Math.min(36, slot - 6));
  const every = Math.ceil(bars.length / 8);
  return `<svg viewBox="0 0 ${W} ${H}" class="jchart" role="img" aria-label="${esc(label)}">${axisY(lo, hi, tk, fmt || rLab, W, y, L, R)}
  ${bars
    .map((b, i) => {
      const cx = L + slot * i + slot / 2,
        y0 = y(0),
        y1 = y(b.v),
        h = Math.max(Math.abs(y1 - y0), b.v ? 2 : 0),
        top = Math.min(y0, y1),
        r = Math.min(4, bw / 2, h / 2);
      const col = b.v > 0 ? "var(--good)" : b.v < 0 ? "var(--bad)" : "var(--muted)";
      const d =
        b.v >= 0
          ? `M${cx - bw / 2},${y0} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${y0} Z`
          : `M${cx - bw / 2},${y0} V${top + h - r} Q${cx - bw / 2},${top + h} ${cx - bw / 2 + r},${top + h} H${cx + bw / 2 - r} Q${cx + bw / 2},${top + h} ${cx + bw / 2},${top + h - r} V${y0} Z`;
      return `<path d="${d}" fill="${col}" class="bar"/>${i % every === 0 ? `<text x="${cx}" y="${H - 6}" text-anchor="middle">${esc(b.x)}</text>` : ""}<rect x="${cx - slot / 2}" y="${T}" width="${slot}" height="${H - T - B}" fill="transparent" data-tip="${esc(b.tip)}"/>`;
    })
    .join("")}</svg>`;
}
function bucketKey(d, mode) {
  const x = new Date(d + "T12:00:00");
  if (mode === "month") return d.slice(0, 7);
  const mon = new Date(x);
  mon.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return isoD(mon);
}
function chartsHTML(tk, P) {
  if (!tk.length) return "";
  const span =
    P.from && P.to
      ? (new Date(P.to) - new Date(P.from)) / 864e5
      : tk.length
        ? (new Date(tk[tk.length - 1].date) - new Date(tk[0].date)) / 864e5
        : 0;
  const mode = span > 100 ? "month" : "week";
  // cumulative R
  let c = 0;
  const cum = [{ v: 0, x: fmtD(tk[0].date), tip: "Start · 0R" }].concat(
    tk.map((t, i) => {
      c += t.r;
      return { v: c, x: fmtD(t.date), tip: `${fmtD(t.date)} · ${t.pair || ""} ${fmtR(t.r)} · total ${fmtR(c)}` };
    })
  );
  // R per bucket
  const bk = {};
  tk.forEach(t => {
    const k = bucketKey(t.date, mode);
    bk[k] = bk[k] || { r: 0, n: 0, w: 0, l: 0 };
    bk[k].r += t.r;
    bk[k].n++;
    if (t.r > 0) bk[k].w++;
    if (t.r < 0) bk[k].l++;
  });
  const bars = Object.keys(bk)
    .sort()
    .map(k => {
      const b = bk[k],
        lab =
          mode === "month"
            ? MONTHS[+k.slice(5, 7) - 1].slice(0, 3) + " " + k.slice(2, 4)
            : fmtD(k).replace(/ \d{4}$/, "");
      return {
        v: +b.r.toFixed(2),
        x: lab,
        tip: `${mode === "month" ? lab : "Week of " + lab} · ${fmtR(b.r)} · ${b.n} trade${b.n > 1 ? "s" : ""} · ${b.w + b.l ? Math.round((b.w / (b.w + b.l)) * 100) + "% win rate" : "all BE"}`,
      };
    });
  // rolling win rate
  const N = Math.min(10, Math.max(3, Math.floor(tk.length / 2)));
  const roll = tk
    .map((t, i) => {
      if (i < N - 1) return null;
      const sl = tk.slice(i - N + 1, i + 1),
        ww = sl.filter(z => z.r > 0).length,
        dd = ww + sl.filter(z => z.r < 0).length;
      if (!dd) return null;
      const w = ww / dd;
      return { v: w * 100, x: fmtD(t.date), tip: `${fmtD(t.date)} · last ${N} trades: ${Math.round(w * 100)}% wins` };
    })
    .filter(Boolean);
  // distribution
  const D = [
    ["≤ −1R", r => r <= -1],
    ["−1 to 0", r => r > -1 && r < 0],
    ["BE", r => r === 0],
    ["0 to 1R", r => r > 0 && r < 1],
    ["1–2R", r => r >= 1 && r < 2],
    ["2–3R", r => r >= 2 && r < 3],
    ["3R +", r => r >= 3],
  ];
  const dist = D.map(([l, f]) => {
    const n = tk.filter(t => f(t.r)).length;
    return { l, n, pos: l.includes("BE") ? 0 : l.startsWith("≤") || l.startsWith("−") ? -1 : 1 };
  });
  const dmax = Math.max(1, ...dist.map(d => d.n));
  const distHTML = `<div class="dist">${dist.map(d => `<div class="drow" data-tip="${esc(d.l)} · ${d.n} trade${d.n === 1 ? "" : "s"} (${Math.round((d.n / tk.length) * 100)}%)"><span class="dl">${d.l}</span><span class="db"><i style="width:${(d.n / dmax) * 100}%;background:${d.pos > 0 ? "var(--good)" : d.pos < 0 ? "var(--bad)" : "var(--be)"}"></i></span><span class="dn num">${d.n}</span></div>`).join("")}</div>`;
  return `<div class="grid2 jcharts">
    <div class="panel"><span class="eyebrow">Equity</span><h2>Cumulative R</h2>${lineChart(cum, { label: `Cumulative R over ${P.label}` })}</div>
    <div class="panel"><span class="eyebrow">Per ${mode}</span><h2>R per ${mode}</h2>${barChart(bars, { label: `R per ${mode}, ${P.label}` })}</div>
    <div class="panel"><span class="eyebrow">Consistency</span><h2>Win rate, rolling ${N} trades</h2>${roll.length > 1 ? lineChart(roll, { fmt: v => v + "%", lo: 0, hi: 100, zero: false, label: `Rolling win rate over ${N} trades` }) : `<p class="hint">Need at least ${N + 1} trades in this period.</p>`}</div>
    <div class="panel"><span class="eyebrow">Outcomes</span><h2>R distribution</h2>${distHTML}</div>
  </div>`;
}
function overviewHTML(tk, ps, o, P) {
  if (!tk.length)
    return `<div class="ov"><div class="panel ov-empty"><h2>No results in ${esc(P.label)}</h2><p class="hint" style="margin:0">Trades with a result in this period show up here as statistics and charts.</p></div></div>`;
  const n = tk.length,
    seg = (k, c, l) =>
      o[k]
        ? `<div class="bseg" style="flex:${o[k]};background:${c}" data-tip="${l} · ${o[k]} trade${o[k] > 1 ? "s" : ""} (${Math.round((o[k] / n) * 100)}%)"></div>`
        : "";
  const tile = (l, v, c = "") => `<div class="tile"><span class="eyebrow">${l}</span><b class="${c}">${v}</b></div>`;
  const tabs = [
    ["equity", "Equity"],
    ["period", "R per period"],
    ["winrate", "Win rate"],
    ["dist", "Distribution"],
  ];
  return `<div class="ov">
  <div class="ov-left">
    <div class="tiles">${
      market === "stocks"
        ? (() => {
            const rs = tk.map(t => t.retPct).filter(v => v != null),
              ar = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
              open = trades().filter(t => t.status !== "missed" && !isPend(t) && !t.closeDate).length;
            const oi = o.openN ?? tk.filter(t => t.openR).length,
              cn = tk.filter(t => !t.openR).length;
            return (
              `<div class="tile"><span class="eyebrow">Trades</span><b>${cn + oi}</b><small class="hint" style="margin:0">${cn} closed · ${oi} open</small></div>` +
              tile("Win rate", fmtP(ps.wr)) +
              plTile(tk) +
              tile("Avg ROI", fmtR(ps.avg), ps.avg > 0 ? "pos" : ps.avg < 0 ? "neg" : "")
            );
          })()
        : tile("Trades", n) +
          tile("Win rate", fmtP(ps.wr)) +
          tile("Total R", fmtR(ps.total), ps.total > 0 ? "pos" : ps.total < 0 ? "neg" : "") +
          tile("Average R", fmtR(ps.avg), ps.avg > 0 ? "pos" : ps.avg < 0 ? "neg" : "")
    }</div>
    <div class="panel"><span class="eyebrow">Outcomes</span>
      <div class="bstack" role="img" aria-label="${o.wins} wins, ${o.bes} break-even, ${o.losses} losses">${seg("wins", "var(--good)", "Win")}${seg("bes", "var(--be)", "BE")}${seg("losses", "var(--bad)", "Loss")}</div>
      <div class="blegend"><span><i style="background:var(--good)"></i>Win <b class="num">${o.wins}</b> <em>${Math.round((o.wins / n) * 100)}%</em></span><span><i style="background:var(--be)"></i>BE <b class="num">${o.bes}</b> <em>${Math.round((o.bes / n) * 100)}%</em></span><span><i style="background:var(--bad)"></i>Loss <b class="num">${o.losses}</b> <em>${Math.round((o.losses / n) * 100)}%</em></span></div>
      <dl class="minis">${
        market === "stocks"
          ? (() => {
              const cg = tk.map(t => capPct(t, sPnl(t))).filter(v => v != null),
                g = cg.length ? cg.reduce((a, b) => a + b, 0) : null,
                h = tk.filter(t => t.date && t.closeDate).map(t => daysBetween(t.date, t.closeDate)),
                ah = h.length ? Math.round(h.reduce((a, b) => a + b, 0) / h.length) : null;
              return `<div><dt>Capital growth</dt><dd class="num ${g > 0 ? "pos" : g < 0 ? "neg" : ""}">${g == null ? "—" : pct(g)}</dd></div><div><dt>Avg hold</dt><dd class="num">${ah == null ? "—" : ah + " days"}</dd></div>`;
            })()
          : `<div><dt>Profit factor</dt><dd class="num">${ps.pf == null ? "—" : isFinite(ps.pf) ? ps.pf.toFixed(2) : "∞"}</dd></div><div><dt>Longest losing streak</dt><dd class="num">${o.maxStreak}</dd></div>`
      }<div><dt>Avg winner / loser</dt><dd class="num">${fmtR(ps.avgWin)} / ${fmtR(ps.avgLoss)}</dd></div></dl>
    </div>
  </div>
  <div class="panel ov-right">
    <span class="eyebrow">Profit over time</span><h2>Total R after each trade</h2>
    <p class="hint" style="margin:0">Line going up means you're making money. At 1% risk, 1R is about 1% of your account.</p>
    <div class="cbody">${equityChart(tk)}</div>
  </div></div>`;
}
let jTab = "equity",
  lastTk = [];
const eqW = cb => (cb.clientWidth < 600 ? Math.max(340, Math.round(cb.clientWidth)) : 760);
function fitEquity() {
  requestAnimationFrame(() => {
    const cb = document.querySelector(".ov-right .cbody");
    if (!cb || !cb.clientWidth) return;
    {
      const w = eqW(cb);
      cb.innerHTML = equityChart(lastTk, (w * cb.clientHeight) / cb.clientWidth, w);
    }
  });
}
addEventListener("resize", () => {
  clearTimeout(fitEquity.h);
  fitEquity.h = setTimeout(fitEquity, 120);
});
document.addEventListener("change", e => {
  if (e.target.name === "jtab") {
    jTab = e.target.value;
    renderLive();
  }
});
function jChart(tk, P) {
  if (jTab === "equity") return equityChart(tk);
  const full = chartsHTML(tk, P),
    parts = full
      .split('<div class="panel">')
      .slice(1)
      .map(x => x.replace(/<\/div>\s*$/, ""));
  const idx = { period: 1, winrate: 2, dist: 3 }[jTab];
  const part = parts[idx] || "";
  return part.replace(/^<span class="eyebrow">.*?<\/span><h2>(.*?)<\/h2>/, '<h3 class="ctitle">$1</h3>');
}
function equityChart(tk, H = 300, W = 760) {
  H = Math.max(200, Math.round(H));
  const L = 52,
    R = 14,
    T = 14,
    B = 34;
  let c = 0;
  const v = [0, ...tk.map(t => (c += t.r))];
  if (v.length < 2) return "";
  let lo = Math.min(0, ...v),
    hi = Math.max(0, ...v);
  if (hi - lo < 1) {
    hi += 0.5;
    lo -= 0.5;
  }
  const yt = ticksFor(lo, hi, 5);
  lo = yt[0];
  hi = yt[yt.length - 1];
  const n = v.length - 1,
    x = i => L + (i / n) * (W - L - R),
    y = val => T + ((hi - val) / (hi - lo)) * (H - T - B);
  const xs = niceStep(n / 6) >= 1 ? niceStep(n / 6) : 1,
    xt = [];
  for (let i = xs; i <= n; i += xs) xt.push(i);
  const pts = v.map((val, i) => `${x(i).toFixed(1)},${y(val).toFixed(1)}`).join(" ");
  let pk = 0,
    pkI = 0,
    dd = 0,
    ddA = 0,
    ddB = 0;
  v.forEach((val, i) => {
    if (val > pk) {
      pk = val;
      pkI = i;
    }
    if (val - pk < dd) {
      dd = val - pk;
      ddA = pkI;
      ddB = i;
    }
  });
  const hits = v
    .map((val, i) => {
      const t = tk[i - 1],
        w = (W - L - R) / n;
      return `<rect x="${(x(i) - w / 2).toFixed(1)}" y="${T}" width="${w.toFixed(1)}" height="${H - T - B}" fill="transparent" data-tip="${esc(i ? `Trade ${i} · ${fmtD(t.date)} · ${t.pair || ""} ${fmtR(t.r)} · total ${fmtR(val)}` : "Start · 0R")}" data-hx="${x(i).toFixed(1)}" data-hy="${y(val).toFixed(1)}"/>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="jchart eq" role="img" aria-label="Cumulative R per trade, ending at ${fmtR(v[n])}">
  <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".12"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".02"/></linearGradient></defs>
  ${axisY(lo, hi, yt, rLab, W, y, L, R)}
  ${xt.map(i => `<text x="${x(i)}" y="${H - B + 16}" text-anchor="middle">${i}</text>`).join("")}<text x="${(L + W - R) / 2}" y="${H - 2}" text-anchor="middle" class="axt">Trade number</text>
  <polygon points="${x(0)},${y(0)} ${pts} ${x(n)},${y(0)}" fill="url(#eqg)"/>
  <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${x(n)}" cy="${y(v[n])}" r="4.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
  <text x="${x(n) - 10}" y="${y(v[n]) - 12}" text-anchor="end" class="endl">${fmtR(v[n])}</text>
  <g class="hover"><line class="hx" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-dasharray="3 3" opacity="0"/><circle class="hc" r="4.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2" opacity="0"/></g>${hits}</svg>`;
}
/* tooltip */
const tipEl = document.createElement("div");
tipEl.className = "jtip";
tipEl.hidden = true;
document.body.appendChild(tipEl);
document.addEventListener("pointermove", e => {
  const t = e.target.closest && e.target.closest("[data-tip]");
  document.querySelectorAll(".jchart .hover").forEach(g => {
    g.querySelector(".hx").setAttribute("opacity", "0");
    g.querySelector(".hc").setAttribute("opacity", "0");
  });
  if (!t || !(t.closest("#liveCharts") || t.closest("#results"))) {
    tipEl.hidden = true;
    return;
  }
  tipEl.textContent = t.dataset.tip;
  tipEl.hidden = false;
  const pad = 12,
    r = tipEl.getBoundingClientRect();
  let x = e.clientX + pad,
    y = e.clientY + pad;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - pad;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - pad;
  tipEl.style.left = x + "px";
  tipEl.style.top = y + "px";
  if (t.dataset.hx) {
    const g = t.closest("svg").querySelector(".hover");
    const hx = g.querySelector(".hx"),
      hc = g.querySelector(".hc");
    hx.setAttribute("x1", t.dataset.hx);
    hx.setAttribute("x2", t.dataset.hx);
    hx.setAttribute("opacity", "1");
    hc.setAttribute("cx", t.dataset.hx);
    hc.setAttribute("cy", t.dataset.hy);
    hc.setAttribute("opacity", "1");
  }
});
document.addEventListener("pointerleave", () => {
  tipEl.hidden = true;
});
function sparkSVG(c) {
  const W = 720,
    H = 96,
    P = 6,
    lo = Math.min(0, ...c),
    hi = Math.max(0, ...c),
    rg = hi - lo || 1;
  const x = i => P + (i / (c.length - 1)) * (W - 2 * P),
    y = v => P + ((hi - v) / rg) * (H - 2 * P),
    last = c[c.length - 1],
    col = last >= 0 ? "var(--good)" : "var(--bad)";
  const pts = c.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Cumulative R over the period, ending at ${fmtR(last)}"><line x1="${P}" x2="${W - P}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)" stroke-dasharray="4 4"/><polygon points="${x(0)},${y(0)} ${pts} ${x(c.length - 1)},${y(0)}" fill="${col}" opacity=".12"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.25" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}
document.addEventListener("change", e => {
  if (e.target.name === "jper") {
    jPeriod = e.target.value;
    selDay = null;
    if (jPeriod === "custom" && !jFrom) {
      const r = jRange();
      jFrom = `${calMonth}-01`;
      jTo = isoD(new Date());
    }
    renderLive();
  } else if (e.target.id === "jFrom" || e.target.id === "jTo") {
    if (e.target.id === "jFrom") jFrom = e.target.value;
    else jTo = e.target.value;
    renderLive();
  }
});
const EXT_ZIP = "https://github.com/DashicleDev/TradeJournal-Extension/archive/refs/heads/main.zip",
  EXT_REPO = "https://github.com/DashicleDev/TradeJournal-Extension";
function extGuideHTML() {
  const ua = navigator.userAgent,
    mob = /Android|iPhone|iPad|Mobile/i.test(ua),
    edge = /Edg\//.test(ua),
    chromium = edge || /Chrome\//.test(ua),
    url = edge ? "edge://extensions" : "chrome://extensions";
  return `<div class="extguide"><b>TradingView extension</b>
    <p class="hint" style="margin:0">A panel on your TradingView chart with the same fields as here, for forex and invest. It walks you through each timeframe, takes the chart snapshots, reads dates and prices from your Long/Short Position tool and saves the trade: live trades into an account, backtests into a project. In bar replay it can also skip ahead to the next candle that hits your drawings.</p>
    ${
      mob
        ? `<p class="hint" style="margin:0">Works on a computer with Edge or Chrome. Open the journal there to install it.</p>`
        : !chromium
          ? `<p class="hint" style="margin:0">Works in Edge, Chrome, Brave and Opera. Open the journal in one of those to install it.</p>`
          : `<ol class="extsteps"><li><a class="btn small primary" href="${EXT_ZIP}" target="_blank" rel="noopener">Download extension</a> and unzip it.</li>
      <li>Open <code>${url}</code> in a new tab <button type="button" class="btn small ghost" data-copyext="${url}">Copy</button> and turn on <b>Developer mode</b>${edge ? " (in the ☰ menu on the left)" : " (top right)"}.</li>
      <li>Click <b>Load unpacked</b> and pick the unzipped folder, the one with <code>manifest.json</code> in it.</li>
      <li>Open a chart on <a href="https://www.tradingview.com/chart/" target="_blank" rel="noopener">TradingView</a>, click the <b>TJ</b> button and sign in with your journal account.</li>
      <li>Pick <b>Forex</b> or <b>Invest</b> and <b>Journal</b> or <b>Backtest</b> on the start screen, then <b>+</b> to log a trade.</li></ol>
    <p class="hint" style="margin:8px 0 0">To update: download again, replace the folder and click ⟳ in the panel. <a href="${EXT_REPO}" target="_blank" rel="noopener">About the extension</a></p>`
    }</div>`;
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-copyext]");
  if (!b) return;
  try {
    await navigator.clipboard.writeText(b.dataset.copyext);
    b.textContent = "Copied";
  } catch {
    b.textContent = "Select and copy it";
  }
  setTimeout(() => {
    b.textContent = "Copy";
  }, 1500);
});
function renderBacktest() {
  const ps = projects();
  if (activeProject && activeProject !== "none" && !ps.some(p => p.id === activeProject)) {
    activeProject = null;
    btOpen = false;
  }
  if (activeProject === "none" && !btTrades("none").length) {
    activeProject = null;
    btOpen = false;
  }
  const open = btOpen && !!activeProject;
  $("#btFront").hidden = open;
  if (open) {
    $("#btSlot").appendChild($("#jv"));
    renderLive();
    return;
  }
  const card = p => {
    const l = btTrades(p.id),
      s = stats(l),
      tg = +p.target || 0;
    return `<div class="projwrap"><button type="button" class="proj ${p.status === "closed" ? "closed" : ""}" data-proj="${p.id}">
      <div class="row spread"><h3>${esc(p.name)}</h3>${p.status === "closed" ? '<span class="pill">Closed</span>' : p.method ? `<span class="pill ${p.method === "scroll" ? "warn" : "ok"}">${METHOD[p.method]}</span>` : ""}</div>
      <span class="meta">${esc(p.pairs || "All pairs")}${p.from || p.to ? ` · ${esc(p.from || "…")} → ${esc(p.to || "…")}` : ""}</span>
      ${tg ? `<div class="bar" aria-label="${s.n} of ${tg} trades"><i style="width:${Math.min(100, (s.n / tg) * 100)}%"></i></div>` : ""}
      <span class="nums"><span>${s.n}${tg ? "/" + tg : ""} trades</span><span>${fmtP(s.wr)}</span><span class="${s.avg > 0 ? "pos" : s.avg < 0 ? "neg" : ""}">${fmtR(s.avg)}</span></span></button><div class="projacts"><button type="button" class="btn small ghost" data-editproj="${p.id}">Edit</button><button type="button" class="btn small ghost danger" data-delproj="${p.id}" data-label="Delete">Delete</button></div></div>`;
  };
  const un = btTrades("none");
  $("#projList").innerHTML =
    ps.map(card).join("") +
    (un.length
      ? `<button type="button" class="proj" data-proj="none" aria-pressed="${activeProject === "none"}"><h3>No project</h3><span class="meta">Older backtest trades</span><span class="nums"><span>${stats(un).n} trades</span><span>${fmtR(stats(un).avg)}</span></span></button>`
      : "") +
    `<button type="button" class="proj new" data-newproj>+ New project</button>`;
  $("#view-live").appendChild($("#jv"));
  $("#btSlot").innerHTML = "";
}
/* open stock trades count in Analyze with the R realised so far (partial exits) */
function sPct(t) {
  const o = sWithOpenR(t);
  let p = t.retPct;
  if (p == null && o.openR) {
    const sh = Number(t.sShares) || 0,
      en = Number(t.sEntry) || 0,
      real = (t.sExits || []).reduce((a, x) => a + (Number(x.shares) || 0) * ((Number(x.price) || 0) - en), 0);
    p = sh && en ? (real / (sh * en)) * 100 : null;
  }
  return { ...o, r: p != null ? +(+p).toFixed(2) : null };
}
function sWithOpenR(t) {
  if (t.r != null || t.status === "missed" || !sIsOpen(t) || !(t.sExits || []).length) return t;
  const sh = Number(t.sShares) || 0,
    en = Number(t.sEntry) || 0,
    sl = Number(t.sStop);
  if (!sh || !en || !(en > sl)) return t;
  const real = (t.sExits || []).reduce((a, x) => a + (Number(x.shares) || 0) * ((Number(x.price) || 0) - en), 0);
  return {
    ...t,
    r: +(real / (sh * (en - sl))).toFixed(2),
    outcome: real > 0 ? "win" : real < 0 ? "loss" : "be",
    openR: true,
  };
}
const capOf = (acct, cur, fx) => {
  const a = acOf(acct);
  if (!a) return null;
  const cap = acInit(a) ?? a.current;
  if (!cap) return null;
  const rate = !a.currency || a.currency === cur ? 1 : Number(fx) || null;
  return rate ? { cap, rate } : null;
};
const FXK = "tj-fx-v1";
let fxCache = (() => {
  try {
    return JSON.parse(localStorage.getItem(FXK) || "{}");
  } catch {
    return {};
  }
})();
async function fxGet(date, from, to) {
  if (!date || from === to) return 1;
  const k = date + from + to;
  if (fxCache[k]) return fxCache[k];
  try {
    const r = await fetch(`https://api.frankfurter.dev/v1/${date}?base=${from}&symbols=${to}`);
    if (!r.ok) {
      console.warn("FX lookup failed", r.status);
      return null;
    }
    const j = await r.json(),
      v = j && j.rates && j.rates[to];
    if (v) {
      fxCache[k] = v;
      try {
        localStorage.setItem(FXK, JSON.stringify(fxCache));
      } catch {}
    }
    return v || null;
  } catch (e) {
    console.warn("FX lookup blocked", e);
    return null;
  }
}
async function fxFill(t) {
  const a = acOf(t.account),
    to = a && a.currency,
    from = stCur(t);
  if (!to || to === from || !t.date) return null;
  let ch = false;
  const nt = { ...t, sExits: (t.sExits || []).map(x => ({ ...x })) };
  if (!nt.fxIn) {
    const v = await fxGet(t.date, from, to);
    if (v) {
      nt.fxIn = v;
      ch = true;
    }
  }
  for (const x of nt.sExits) {
    if (x.date && Number(x.price) > 0 && !x.fx) {
      const v = await fxGet(x.date, from, to);
      if (v) {
        x.fx = v;
        ch = true;
      }
    }
  }
  if (ch) {
    nt.fxTo = to;
    return nt;
  }
  return null;
}
let fxBusy = false,
  fxTried = new Set(),
  fxLast = 0;
const fxDone = t => {
  const a = acOf(t.account);
  if (!a || !a.currency || a.currency === stCur(t) || !t.date) return true;
  return !!t.fxIn && (t.sExits || []).every(x => !x.date || !(Number(x.price) > 0) || x.fx);
};
async function fxBackfill() {
  if (fxBusy || Date.now() - fxLast < 60000) return;
  fxBusy = true;
  fxLast = Date.now();
  try {
    for (const t of docs.filter(d => !d.kind && mktOf(d) === "stocks" && !fxTried.has(d.id))) {
      const nt = await fxFill(t);
      if (nt) {
        saveDoc(nt);
        fxTried.add(t.id);
      } else if (fxDone(t)) fxTried.add(t.id);
    }
  } finally {
    fxBusy = false;
    render();
  }
}
const capAcct = (t, pnl) => {
  const a = acOf(t.account);
  if (a && a.currency && a.currency !== stCur(t) && !t.sFx && t.fxIn && t.fxTo === a.currency) {
    const xs = (t.sExits || []).filter(x => Number(x.shares) > 0 && Number(x.price) > 0);
    if (xs.every(x => x.fx))
      return xs.reduce((s, x) => s + Number(x.shares) * (Number(x.price) * x.fx - Number(t.sEntry || 0) * t.fxIn), 0);
  }
  return null;
};
/* ---------- capital gains (BE meerwaardebelasting) ---------- */
document.addEventListener("click", e => {
  const y = e.target.closest("[data-taxyear]");
  if (y) {
    taxYear = y.dataset.taxyear;
    $("#taxBox").innerHTML = taxHTML();
    return;
  }
  const r = e.target.closest("tr[data-taxopen]");
  if (r) {
    const t = docs.find(d => d.id === r.dataset.taxopen);
    if (t) openStock(t);
  }
});
const fmtEur = (v, d = 2) => {
  try {
    return new Intl.NumberFormat("nl-BE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(v);
  } catch {
    return "€" + (+v).toFixed(d);
  }
};
const fmtRate = v => (v ? (+v).toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : "—");
function taxSales() {
  const out = [];
  docs
    .filter(t => !t.kind && mktOf(t) === "stocks" && t.mode === "live" && t.status !== "missed" && !isPend(t))
    .forEach(t => {
      const cur = stCur(t),
        en = Number(t.sEntry) || 0;
      (t.sExits || []).forEach((x, i) => {
        const sh = Number(x.shares) || 0,
          pr = Number(x.price) || 0;
        if (!sh || !pr || !x.date) return;
        const rin = cur === "EUR" ? 1 : (t.fxTo === "EUR" && t.fxIn) || fxCache[(t.date || "") + cur + "EUR"] || null,
          rout = cur === "EUR" ? 1 : (t.fxTo === "EUR" && x.fx) || fxCache[x.date + cur + "EUR"] || null;
        const cost = rin && en ? sh * en * rin : null,
          proc = rout ? sh * pr * rout : null;
        out.push({
          t,
          i,
          acc: acOf(t.account),
          date: x.date,
          year: x.date.slice(0, 4),
          ticker: t.ticker || t.pair || "?",
          cur,
          sh,
          en,
          pr,
          rin,
          rout,
          cost,
          proc,
          gain: cost != null && proc != null ? proc - cost : null,
          pre: (t.date || "") < "2026-01-01",
        });
      });
    });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
let taxYear = "";
document.addEventListener("change", e => {
  if (e.target.id !== "taxAct") return;
  const cur = docs.find(x => x.id === "settings") || { id: "settings", kind: "settings" },
    A = { ...(cur.cgtActual || {}) },
    v = e.target.value.trim();
  if (v === "") delete A[taxYear];
  else A[taxYear] = Math.max(0, Number(v) || 0);
  setTimeout(() => saveDoc({ ...cur, cgtActual: A }), 0);
});
document.addEventListener("change", e => {
  const id = e.target.id;
  if (!["sCgtOn", "sCgtRate", "sCgtEx"].includes(id)) return;
  const cur = docs.find(x => x.id === "settings") || { id: "settings", kind: "settings" },
    n = v => {
      const x = Number(v);
      return isFinite(x) && x >= 0 ? x : null;
    };
  const o = { cgtOn: $("#sCgtOn").checked };
  const r = n($("#sCgtRate").value),
    x = n($("#sCgtEx").value);
  if (r != null) o.cgtRate = r;
  if (x != null) o.cgtEx = x;
  saveDoc({ ...cur, ...o });
});
function taxHTML() {
  const all = taxSales().filter(x => getSet().cgtOn === false || x.year >= "2026");
  if (!all.length) return "";
  const yrs = [...new Set(all.map(x => x.year))].sort().reverse();
  if (!yrs.includes(taxYear)) taxYear = yrs[0];
  const S = getSet(),
    on = S.cgtOn !== false,
    RT = (Number(S.cgtRate) || 0) / 100,
    EX = Number(S.cgtEx) || 0;
  const L = all.filter(x => x.year === taxYear),
    ok = L.filter(x => x.gain != null),
    miss = L.length - ok.length,
    g = ok.filter(x => x.gain > 0).reduce((a, x) => a + x.gain, 0),
    l = ok.filter(x => x.gain < 0).reduce((a, x) => a + x.gain, 0),
    net = g + l;
  const whL = ok.filter(x => x.gain > 0 && !(x.acc && x.acc.cgtWh === false)),
    WH = whL.length > 0 || L.some(x => !(x.acc && x.acc.cgtWh === false)),
    est = whL.reduce((a, x) => a + x.gain, 0) * RT,
    act = (S.cgtActual || {})[taxYear],
    hasAct = act !== undefined && act !== null && act !== "";
  const due = Math.max(0, net - EX) * RT,
    wh = hasAct ? Number(act) : est,
    back = Math.max(0, wh - due),
    pc = +(RT * 100).toFixed(2);
  const row = x =>
    `<tr data-taxopen="${x.t.id}"><td>${esc(fmtD(x.date))}</td><td><b>${esc(x.ticker)}</b></td><td class="r num">${x.sh}</td><td class="r num">${x.cur === "EUR" ? "—" : fmtRate(x.rin) + " → " + fmtRate(x.rout)}</td><td class="r num">${x.cost != null ? fmtEur(x.cost) : "—"}</td><td class="r num">${x.proc != null ? fmtEur(x.proc) : "—"}</td><td class="r num ${x.gain > 0 ? "pos" : x.gain < 0 ? "neg" : ""}">${x.gain != null ? (x.gain > 0 ? "+" : "") + fmtEur(x.gain) : "rate missing"}</td></tr>`;
  return `<div class="panel taxp"><div class="row spread" style="align-items:center"><div><span class="eyebrow">${on ? "Capital gains tax" : "Realised gains"}</span><h2 style="margin:2px 0 0">Capital gains ${esc(taxYear)}</h2></div>${yrs.length > 1 ? `<div class="segs">${yrs.map(y => `<button type="button" class="rvb${y === taxYear ? " on" : ""}" data-taxyear="${y}">${y}</button>`).join("")}</div>` : ""}</div>
    <div class="prtiles" style="margin-top:14px"><div class="prst"><span>Gains</span><b class="num pos">${fmtEur(g, 0)}</b></div><div class="prst"><span>Losses</span><b class="num ${l < 0 ? "neg" : ""}">${fmtEur(l, 0)}</b></div><div class="prst"><span>Net</span><b class="num ${net > 0 ? "pos" : net < 0 ? "neg" : ""}">${fmtEur(net, 0)}</b></div>${on && EX ? `<div class="prst"><span>Exemption left</span><b class="num">${fmtEur(Math.max(0, EX - Math.max(0, net)), 0)}</b><small>of ${fmtEur(EX, 0)}</small></div>` : ""}</div>
    ${on ? `<div class="taxsum">${WH || hasAct ? `<div class="taxact"><span>Withheld by your broker<small>${hasAct ? "From your broker's tax overview" : `Estimate: ${pc}% of gains, ${fmtEur(est)}. Enter the real amount from your broker`}</small></span><input type="number" min="0" step="0.01" inputmode="decimal" id="taxAct" value="${hasAct ? esc(String(act)) : ""}" placeholder="${esc(est.toFixed(2))}" aria-label="Actually withheld in ${esc(taxYear)}"></div>` : ""}<div><span>Tax due${EX ? " after exemption" : ""} (est. ${pc}%)</span><b class="num">${fmtEur(due)}</b></div>${WH || hasAct ? `<div><span>Reclaimable via your tax return${hasAct ? "" : " (est.)"}</span><b class="num pos">${fmtEur(back)}</b></div>` : ""}</div>` : ""}
    <div style="overflow-x:auto;margin-top:12px"><table class="rvdt taxt"><thead><tr><th>Sold</th><th>Ticker</th><th class="r">Shares</th><th class="r">Rate buy → sell</th><th class="r">Cost</th><th class="r">Proceeds</th><th class="r">Gain</th></tr></thead><tbody>${L.map(row).join("")}</tbody></table></div>
    <p class="hint" style="margin:10px 0 0">Estimate only. Euro amounts use the ECB rate on the purchase and sale date (rate shown as 1 unit of the trade currency in EUR), each trade as its own lot, costs not included. Your broker's annual statement is what counts for your tax return.${miss ? ` ${miss} sale${miss === 1 ? "" : "s"} still need${miss === 1 ? "s" : ""} an exchange rate; it loads in the app when online.` : ""}${L.some(x => x.pre) ? " Positions bought before 2026 officially use the value on 31 Dec 2025 (or a higher proven price); here the purchase price is used." : ""}</p></div>`;
}
const capPct = (t, pnl) => {
  if (pnl == null) return null;
  {
    const sm = simOf(t);
    if (sm) return sm.wait ? null : sm.cap;
  }
  {
    const a = acOf(t.account),
      cap = a && (acInit(a) ?? a.current),
      v = capAcct(t, pnl);
    if (v != null && cap) return (v / cap) * 100;
  }
  const c = capOf(t.account, stCur(t), t.sFx);
  return c ? ((pnl * c.rate) / c.cap) * 100 : null;
};
const sPnl = t => {
  const sm = simOf(t);
  if (sm) return sm.wait ? null : (t.sExits || []).length ? sm.pnl : null;
  if (t.mode === "backtest" && mktOf(t) === "stocks" && Number(t.sShares) === 1) return null;
  return sPnl0(t);
};
const sPnl0 = t =>
  t.pnl != null && !sIsOpen(t)
    ? t.pnl
    : (t.sExits || []).length
      ? (t.sExits || []).reduce(
          (a, x) => a + (Number(x.shares) || 0) * ((Number(x.price) || 0) - (Number(t.sEntry) || 0)),
          0
        )
      : null;
const pct = v => (v == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(v !== 0 && Math.abs(v) < 1 ? 2 : 1) + "%");
const inAcct = (t, v) => {
  const a = acOf(t.account),
    c = stCur(t);
  if (v == null) return [c, 0];
  {
    const sm = simOf(t);
    if (sm && !sm.wait) return [sm.ac, v * sm.rate];
  }
  if (!a || !a.currency || a.currency === c) return [c, v];
  const x = capAcct(t, v);
  if (x != null) return [a.currency, x];
  if (t.sFx) return [a.currency, v * Number(t.sFx)];
  return [c, v];
};
const plTile = list => {
  const by = {};
  list.forEach(t => {
    const [c, v] = inAcct(t, sPnl(t));
    if (sPnl(t) != null) by[c] = (by[c] || 0) + v;
  });
  const e = Object.entries(by),
    cl = v => (v > 0 ? "pos" : v < 0 ? "neg" : "");
  return `<div class="tile"><span class="eyebrow">Realised P&amp;L</span>${!e.length ? "<b>—</b>" : e.length > 1 ? e.map(([c, v]) => `<b class="${cl(v)}" style="font-size:18px;line-height:1.25">${esc(fmtMoney(v, c))}</b>`).join("") : `<b class="${cl(e[0][1])}">${esc(fmtMoney(e[0][1], e[0][0]))}</b>`}${e.length > 1 ? `<small class="hint" style="margin:0">${fxBusy ? "Loading exchange rates…" : "No exchange rates yet"}</small>` : ""}</div>`;
};
let simT;
const simRefresh = () => {
  clearTimeout(simT);
  simT = setTimeout(() => render(), 250);
};
function simOf(t, o) {
  o = o || {};
  const proj = o.project !== undefined ? o.project : t.project;
  if ((o.mode || t.mode) !== "backtest" || mktOf(t) !== "stocks" || Number(o.shares ?? t.sShares) !== 1) return null;
  const p = docs.find(d => d.id === proj && d.kind === "project");
  if (!p || !p.simAccount || !(p.simMax > 0)) return null;
  const a = accounts("stocks").find(x => x.name === p.simAccount);
  if (!a) return null;
  const ac = a.currency || "EUR",
    cur = o.cur || t.sCur || "USD",
    en = Number(o.entry ?? t.sEntry),
    dt = o.date ?? t.date;
  if (!en) return null;
  const rate = cur === ac ? 1 : fxCache[(dt || "") + cur + ac];
  if (!rate) {
    if (dt)
      fxGet(dt, cur, ac)
        .then(r => {
          if (r) simRefresh();
        })
        .catch(() => {});
    return { wait: true };
  }
  const size = p.simMode === "fixed" && p.simSize ? p.simSize : acSize(a),
    maxAmt = p.simUnit === "pct" ? ((size || 0) * p.simMax) / 100 : p.simMax,
    shares = Math.floor(maxAmt / (en * rate)),
    ex = o.exits || t.sExits || [];
  const pnl = shares * ex.reduce((s, x) => s + (Number(x.shares) || 0) * ((Number(x.price) || 0) - en), 0),
    pnlAcc = pnl * rate;
  return {
    shares,
    rate,
    ac,
    cur,
    size,
    cost: shares * en,
    pnl,
    pnlAcc,
    cap: size && ex.length ? (pnlAcc / size) * 100 : null,
    account: a.name,
  };
}
const sSold = t => (t.sExits || []).reduce((a, x) => a + (Number(x.shares) || 0), 0);
const sIsOpen = t =>
  t.status !== "missed" && !isPend(t) && !(t.closeDate && (!Number(t.sShares) || sSold(t) >= Number(t.sShares) - 1e-6));
const daysBetween = (a, b) =>
  Math.max(
    0,
    Math.round(
      (new Date((b || new Date().toISOString().slice(0, 10)) + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5
    )
  );
function stocksOverviewHTML(all, per, P) {
  const cls = v => (v > 0 ? "pos" : v < 0 ? "neg" : ""),
    cur = stCur;
  const open = all.filter(sIsOpen).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const closed = per
    .filter(t => t.status !== "missed" && !sIsOpen(t) && t.pnl != null)
    .sort((a, b) => (a.closeDate || a.date || "").localeCompare(b.closeDate || b.date || ""));
  const realised = t =>
    (t.sExits || []).reduce(
      (a, x) => a + (Number(x.shares) || 0) * ((Number(x.price) || 0) - (Number(t.sEntry) || 0)),
      0
    );
  const openWin = per.filter(t => sIsOpen(t) && (t.sExits || []).length && realised(t) > 0).length;
  const w = closed.filter(t => t.pnl > 0).length + openWin,
    l = closed.filter(t => t.pnl < 0).length,
    rets = closed.map(t => t.retPct).filter(v => v != null);
  const perOpen = per.filter(sIsOpen);
  const inAcct = (t, v) => {
    const a = acOf(t.account),
      c = stCur(t);
    if (!a || !a.currency || a.currency === c) return [c, v];
    const x = capAcct(t, v);
    if (x != null) return [a.currency, x];
    if (t.sFx) return [a.currency, v * Number(t.sFx)];
    return [c, v];
  };
  const avg = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : null,
    byCur = {},
    add = ([c, v]) => {
      byCur[c] = (byCur[c] || 0) + v;
    };
  closed.forEach(t => add(inAcct(t, t.pnl)));
  perOpen.forEach(t => {
    if ((t.sExits || []).length) add(inAcct(t, realised(t)));
  });
  const pnlTxt = Object.keys(byCur).length
      ? Object.entries(byCur)
          .map(([c, v]) => fmtMoney(v, c))
          .join(" · ")
      : "—",
    pnlSum = Object.values(byCur).reduce((a, b) => a + b, 0);
  const hold = closed.filter(t => t.date && t.closeDate).map(t => daysBetween(t.date, t.closeDate)),
    ah = hold.length ? Math.round(hold.reduce((a, b) => a + b, 0) / hold.length) : null;
  const tile = (lab, v, c = "") =>
    `<div class="tile"><span class="eyebrow">${lab}</span><b class="${c}">${v}</b></div>`;
  const openRows = open
    .map(t => {
      const sh = Number(t.sShares) || 0,
        left = sh - sSold(t),
        real = (t.sExits || []).reduce(
          (a, x) => a + (Number(x.shares) || 0) * ((Number(x.price) || 0) - (Number(t.sEntry) || 0)),
          0
        );
      return `<tr class="clickrow" data-edit="${t.id}" tabindex="0" title="Open trade"><td class="c-pair"><b>${esc(t.ticker || t.pair || "")}</b></td><td>${esc([t.sPhase ? "Phase " + t.sPhase : "", t.swPat || ""].filter(Boolean).join(" · ") || "—")}</td>
      <td class="num">${esc(fmtD(t.date) || "")} <span class="hint" style="margin:0">· ${daysBetween(t.date)}d</span></td><td class="r num">${sh ? `${left} / ${sh}` : "—"}</td>
      <td class="r num">${t.sEntry != null ? t.sEntry : "—"}</td>${(() => {
        const has = (t.sExits || []).length,
          c = sh * (Number(t.sEntry) || 0),
          pc = has && c ? (real / c) * 100 : null;
        return `<td class="r num ${cls(real)}">${pc != null ? (pc > 0 ? "+" : "") + pc.toFixed(1) + "%" : "—"}</td><td class="r num ${cls(real)}">${has ? esc(fmtMoney(real, cur(t))) : "—"}</td>`;
      })()}<td class="r">${shotCount(t) ? `<button class="camb chico" data-view="${t.id}" title="View charts"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>${shotCount(t)}</button>` : ""}</td></tr>`;
    })
    .join("");
  // limit orders not filled yet (Status: Pending); not counted anywhere else
  const pend = all.filter(isPend).sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    pendRows = pend
      .map(
        t =>
          `<tr class="clickrow" data-edit="${t.id}" tabindex="0" title="Open trade"><td class="c-pair"><b>${esc(t.ticker || t.pair || "")}</b></td><td>${esc([t.sPhase ? "Phase " + t.sPhase : "", t.swPat || ""].filter(Boolean).join(" · ") || "—")}</td><td class="num">${esc(fmtD(t.date) || "")} <span class="hint" style="margin:0">· ${daysBetween(t.date)}d</span></td><td class="r num">${t.sEntry != null ? t.sEntry : "—"}</td><td class="r num">${t.sStop != null ? t.sStop : "—"}</td><td class="r">${shotCount(t) ? `<button class="camb chico" data-view="${t.id}" title="View charts"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>${shotCount(t)}</button>` : ""}</td></tr>`
      )
      .join("");
  const bars = closed.map(t => ({
    v: +(t.retPct || 0).toFixed(1),
    x: t.ticker || t.pair || "",
    tip: `${t.ticker || ""} · ${fmtD(t.closeDate || t.date)} · ${t.retPct != null ? (t.retPct > 0 ? "+" : "") + t.retPct.toFixed(2) + "%" : "—"} · ${fmtMoney(t.pnl, cur(t))}`,
  }));
  return `<div class="sov" style="margin-top:16px"><div class="panel"><div class="row spread"><div><span class="eyebrow">Now</span><h2>Open positions</h2></div><span class="hint" style="margin:0">${open.length} open</span></div>
    ${open.length ? `<div class="tbl"><table class="opentab"><thead><tr><th>Ticker</th><th>Setup</th><th>Since</th><th class="r">Shares left</th><th class="r">Entry</th><th class="r">Realised %</th><th class="r">Realised</th><th></th></tr></thead><tbody>${openRows}</tbody></table></div>` : `<p class="hint" style="margin:0">No open positions.</p>`}</div>
${pend.length ? `<div class="panel" style="margin-top:16px"><div class="row spread"><div><span class="eyebrow">Waiting for a fill</span><h2>Pending orders</h2></div><span class="hint" style="margin:0">${pend.length} pending</span></div><div class="tbl"><table class="opentab"><thead><tr><th>Ticker</th><th>Setup</th><th>Since</th><th class="r">Entry</th><th class="r">Stop</th><th></th></tr></thead><tbody>${pendRows}</tbody></table></div></div>` : ""}
</div>`;
}
function stockTableHTML(list, title) {
  list = list.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.created || 0) - (a.created || 0));
  const cls = v => (v > 0 ? "pos" : v < 0 ? "neg" : "");
  const res = t => {
    const sold = (t.sExits || []).reduce((a, x) => a + (Number(x.shares) || 0), 0),
      sh = Number(t.sShares) || 0,
      hol = t.status === "missed" ? " hollow" : "";
    if (!(t.closeDate && (!sh || sold >= sh)))
      return isPend(t)
        ? `<span class="restag open${hol}">Pending</span>`
        : `<span class="restag open${hol}">Open${sh ? `<b class="num">${sh - sold}/${sh}</b>` : ""}</span>`;
    const oc = t.outcome || (t.pnl > 0 ? "win" : t.pnl < 0 ? "loss" : "be");
    return `<span class="restag ${oc}${hol}">${{ win: "Win", loss: "Loss", be: "BE", open: "Open" }[oc]}${t.retPct != null ? `<b class="num">${t.retPct > 0 ? "+" : ""}${t.retPct.toFixed(1)}%</b>` : ""}</span>`;
  };
  return `<div class="panel"><div class="row spread"><div><span class="eyebrow">${list.length} trades</span><h2>${title}</h2></div>
    <div class="row tblacts"></div></div>
    <p class="hint ioMsg"></p>
    ${
      list.length
        ? `<div class="tbl"><table class="trades"><thead><tr><th>Date</th><th>Ticker</th><th>Setup</th><th>Result</th><th class="r">P&amp;L</th><th class="r">ROI</th><th class="r">Of capital</th><th></th></tr></thead><tbody>
    ${list
      .map(t => {
        const cur = stCur(t),
          setup = [t.sPhase ? "Phase " + t.sPhase : "", t.swPat || ""].filter(Boolean).join(" · "),
          ex = t.sExits || [],
          sim = simOf(t),
          pl =
            sim && !sim.wait
              ? ex.length
                ? sim.pnl
                : null
              : t.mode === "backtest"
                ? null
                : t.pnl != null
                  ? t.pnl
                  : ex.length
                    ? ex.reduce(
                        (a, x) => a + (Number(x.shares) || 0) * ((Number(x.price) || 0) - (Number(t.sEntry) || 0)),
                        0
                      )
                    : null,
          rp = ex.length ? sPct(t).r : null,
          cp = sim && !sim.wait ? sim.cap : capPct(t, pl);
        return `<tr class="clickrow" data-edit="${t.id}" tabindex="0" title="Open trade"><td class="num c-date">${esc(t.date || "")}</td><td class="c-pair">${esc(t.ticker || t.pair || "")}${t.status === "missed" ? `<span class="misstag">Missed</span>` : ""}</td>
      <td class="c-concept">${esc(setup || "—")}</td><td class="c-res">${res(t)}</td>
      <td class="r num c-entry ${cls(pl)}">${pl != null ? esc(fmtMoney(pl, cur)) : "—"}</td><td class="r num c-status ${cls(rp)}">${pct(rp)}</td><td class="r num c-status ${cls(cp)}">${pct(cp)}</td><td class="c-charts">${shotCount(t) ? `<button class="camb chico" data-view="${t.id}" title="View charts"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>${shotCount(t)}</button>` : ""}</td></tr>`;
      })
      .join("")}
    </tbody></table></div>`
        : `<p class="hint">No trades here yet. Tap + to log one.</p>`
    }</div>`;
}
function tableHTML(list, title, showMode) {
  if (market === "stocks") return stockTableHTML(list, title);
  list = list.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.created || 0) - (a.created || 0));
  const statusTxt = { taken: "Taken", missed: "Missed", skipped: "Skipped" };
  return `<div class="panel"><div class="row spread"><div><span class="eyebrow">${list.length} trades</span><h2>${title}</h2></div>
    <div class="row tblacts"></div></div>
    <p class="hint ioMsg"></p>
    ${
      list.length
        ? `<div class="tbl"><table class="trades"><thead><tr><th>Date</th><th>Pair</th><th>Phase</th><th>Concept</th><th>4H entry</th><th>Grade</th><th>Result</th><th>Plan</th><th></th></tr></thead><tbody>
    ${list
      .map(t => {
        const oc = t.outcome || (t.r > 0 ? "win" : t.r < 0 ? "loss" : t.r === 0 ? "be" : ""),
          err = t.evaluation && t.evaluation !== "plan";
        return `<tr class="clickrow${err ? " errrow" : ""}${t.status === "missed" ? " missrow" : ""}" data-edit="${t.id}" tabindex="0" title="Open trade"><td class="num c-date">${esc(t.date)}</td><td class="c-pair">${esc(t.pair)} ${t.dir ? `<span class="dirar ${t.dir}" title="${t.dir === "long" ? "Long" : "Short"}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${t.dir === "long" ? '<path d="M12 19V5M6 11l6-6 6 6"/>' : '<path d="M12 5v14M6 13l6 6 6-6"/>'}</svg></span>` : ""}${t.status === "missed" ? `<span class="misstag">Missed</span>` : isPend(t) ? `<span class="misstag">Pending</span>` : ""}</td><td class="num c-phase">${t.fase || "—"}</td><td class="c-concept">${esc(t.concept || "—")}${t.sub && t.sub !== "—" ? `<br><span class="hint" style="margin:0">${esc(t.sub)}</span>` : ""}<span class="monly">${t.fase ? " · Phase " + t.fase : ""}${t.entry4h ? " · " + esc(t.entry4h) : ""}${tGrade(t) ? `<span class="grade g${tGrade(t)}">${tGrade(t)}</span>` : ""}</span></td><td class="c-entry">${esc(t.entry4h || "—")}</td><td class="c-score">${(g => (g ? `<span class="grade g${g.g}" title="${esc(g.why)}">${g.g}</span>` : ""))(gradeOf(t))}</td><td class="c-res">${oc ? `<span class="restag ${oc}${t.status === "missed" ? " hollow" : ""}">${{ win: "Win", loss: "Loss", be: "BE", open: "Open" }[oc]}${oc === "open" ? "" : `<b class="num">${fmtR(t.r)}</b>`}</span>` : "—"}</td><td class="c-eval">${err ? `<span class="errtag">Not to plan</span>` : ""}</td><td class="c-charts">${shotCount(t) ? `<button class="camb chico" data-view="${t.id}" title="View charts"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>${shotCount(t)}</button>` : ""}</td>
</tr>`;
      })
      .join("")}
    </tbody></table></div>`
        : `<p class="hint">No trades here yet. Tap + to log one.</p>`
    }</div>`;
}

/* ---------- projects ---------- */
function openNewProj() {
  $("#npForm").reset();
  $("#newProj").hidden = false;
  setTimeout(() => $("#npName").focus(), 30);
}
function closeNewProj() {
  $("#newProj").hidden = true;
}
$("#npForm").onsubmit = e => {
  e.preventDefault();
  const name = $("#npName").value.trim();
  if (!name) return;
  const p = {
    kind: "project",
    market,
    id: uid(),
    name,
    pairs: "",
    from: "",
    to: "",
    method: "",
    target: null,
    focus: "",
    status: "active",
    created: Date.now(),
  };
  closeNewProj();
  activeProject = p.id;
  btOpen = true;
  if (tab !== "backtest") show("backtest");
  saveDoc(p);
  toast("Project created");
};
function openProjForm(p) {
  if (!p) {
    openNewProj();
    return;
  }
  editingProj = p ? p.id : null;
  const f = $("#projForm");
  $("#projSheet").hidden = false;
  delete $("#pDelete").dataset.confirm;
  $("#projFormTitle").textContent = p ? "Edit project" : "New backtest project";
  $("#pSave").textContent = p ? "Save project" : "Start project";
  $("#pDelete").hidden = !p;
  $("#pDelete").textContent = "Delete project";
  $("#pName").value = p?.name || "";
  $("#pPairs").value = p?.pairs || "";
  $("#pFrom").value = p?.from || "";
  $("#pTo").value = p?.to || "";
  $("#pMethod").value = p?.method || "";
  $("#pTarget").value = p?.target || "";
  $("#pFocus").value = p?.focus || "";
  $("#projForm").classList.toggle("st", ((p && p.market) || market) === "stocks");
  setTimeout(() => $("#pName").focus(), 30);
}
function closeProjSheet() {
  $("#projSheet").hidden = true;
}
const acSize = a => (a ? (a.current ?? acInit(a)) : null);
/* simulation panel on an invest backtest project page: settings save as you change them */
function renderSim(p) {
  const box = $("#liveSim");
  if (!p || mktOf(p) !== "stocks") {
    box.innerHTML = "";
    box.dataset.pid = "";
    return;
  }
  if (box.dataset.pid === p.id && box.contains(document.activeElement)) return;
  box.dataset.pid = p.id;
  const A = accounts("stocks"),
    a = A.find(x => x.name === p.simAccount),
    cur = a ? a.currency || "EUR" : "",
    fixed = p.simMode === "fixed";
  box.innerHTML = `<div class="panel simp"><div class="row spread"><div><span class="eyebrow">Project</span><h2>Simulate with an account</h2></div><span class="hint nstat" id="simStat" style="margin:0"></span></div>
    <p class="hint" style="margin:0 0 10px">${a ? "Each trade buys as many whole shares as the max per position allows, so you see P&amp;L and % of capital as if you'd taken it." : "Pick an account to see each backtest trade's shares, P&amp;L and % of capital as if you'd taken it."}</p>
    <div class="fields simf">
      <label class="f"><span>Account</span><select id="simAcc"><option value="">No simulation</option>${A.map(x => `<option value="${esc(x.name)}" ${x.name === p.simAccount ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      ${
        a
          ? `<div class="f"><span>Max per position</span><div class="simmax"><input type="number" id="simMax" min="0" step="any" inputmode="decimal" placeholder="${p.simUnit === "pct" ? "20" : "2000"}" value="${p.simMax ?? ""}"><div class="segs">${[
              ["amt", cur],
              ["pct", "%"],
            ]
              .map(
                ([v, l]) =>
                  `<label class="seg"><input type="radio" name="simUnit" value="${v}" ${(p.simUnit || "amt") === v ? "checked" : ""}><span>${esc(l)}</span></label>`
              )
              .join("")}</div></div></div>
      <div class="f"><span>Account size</span><div class="segs">${[
        ["follow", "Follow account"],
        ["fixed", "Fixed"],
      ]
        .map(
          ([v, l]) =>
            `<label class="seg"><input type="radio" name="simMode" value="${v}" ${(p.simMode || "follow") === v ? "checked" : ""}><span>${l}</span></label>`
        )
        .join("")}</div></div>
      ${fixed ? `<label class="f"><span>Fixed size <em class="opt">${esc(cur)}</em></span><input type="number" id="simSize" min="0" step="any" inputmode="decimal" value="${p.simSize ?? acSize(a) ?? ""}"></label>` : `<div class="f"><span>Account size now</span><b class="num" style="padding:9px 0">${esc(fmtMoney(acSize(a) || 0, cur).replace(/^\+/, ""))}</b></div>`}`
          : ""
      }
    </div></div>`;
}
async function simSave(patch, rebuild) {
  const box = $("#liveSim"),
    p = docs.find(d => d.id === box.dataset.pid);
  if (!p) return;
  const st = $("#simStat");
  if (st) st.textContent = "Saving…";
  const np = { ...p, ...patch };
  if (np.simMode === "fixed" && np.simSize == null) {
    const a = accounts("stocks").find(x => x.name === np.simAccount);
    np.simSize = acSize(a);
  }
  await saveDoc(np);
  if (rebuild) {
    box.dataset.pid = "";
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    renderSim(np);
  }
  const s2 = $("#simStat");
  if (s2) s2.textContent = "Saved";
}
document.addEventListener("change", e => {
  const id = e.target.id;
  if (!e.target.closest || !e.target.closest("#liveSim")) return;
  const num = v => (v === "" ? null : Number(v));
  if (id === "simAcc") simSave({ simAccount: e.target.value }, true);
  else if (e.target.name === "simUnit") simSave({ simUnit: e.target.value }, true);
  else if (e.target.name === "simMode")
    simSave({ simMode: e.target.value, ...(e.target.value === "follow" ? { simSize: null } : {}) }, true);
});
document.addEventListener("input", e => {
  if (!e.target.closest || !e.target.closest("#liveSim")) return;
  const id = e.target.id,
    v = e.target.value === "" ? null : Number(e.target.value);
  if (id !== "simMax" && id !== "simSize") return;
  clearTimeout(simSave.h);
  simSave.h = setTimeout(() => simSave(id === "simMax" ? { simMax: v } : { simSize: v }), 600);
});
$("#newProjBtn").onclick = () => openProjForm(null);
$("#pCancel").onclick = closeProjSheet;
$("#pDelete").onclick = () => {
  const b = $("#pDelete");
  if (b.dataset.confirm) {
    delete b.dataset.confirm;
    deleteDoc(editingProj);
    closeProjSheet();
    activeProject = null;
    btOpen = false;
    toast("Project deleted");
  } else {
    b.dataset.confirm = "1";
    b.textContent = "Really delete? Trades stay, without project";
  }
};
$("#projForm").onsubmit = e => {
  e.preventDefault();
  const old = docs.find(d => d.id === editingProj) || {};
  const p = {
    ...old,
    kind: "project",
    market: (old && old.market) || market,
    id: editingProj || uid(),
    name: $("#pName").value.trim() || "Untitled project",
    pairs: $("#pPairs").value.trim().toUpperCase(),
    from: $("#pFrom").value,
    to: $("#pTo").value,
    method: $("#pMethod").value,
    target: $("#pTarget").value ? Number($("#pTarget").value) : null,
    focus: $("#pFocus").value.trim(),
    status: old.status || "active",
    created: old.created || Date.now(),
  };

  activeProject = p.id;
  btOpen = true;
  closeProjSheet();
  saveDoc(p);
  toast("Project saved");
};
