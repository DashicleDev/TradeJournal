/*
 * share.js — The public, read-only page for one shared trade (share.html?t=<token>).
 * Needs no sign-in: the database function shared_trade() returns only the fields meant for viewing,
 * and screenshots of a shared trade are readable through a storage policy (see supabase/schema.sql).
 */
(async () => {
  const box = document.getElementById("shr");
  const esc = s =>
    String(s ?? "").replace(
      /[&<>"']/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  const fail = msg =>
    (box.innerHTML = `<div class="shr-card"><h2>Trade not found</h2><p class="hint">${msg}</p></div>`);
  const tok =
    new URLSearchParams(location.search).get("t") || (/\/t\/([a-f0-9]{32})/.exec(location.pathname) || [])[1] || "";
  if (!/^[a-f0-9]{32}$/.test(tok)) return fail("This share link is incomplete.");
  const CFG = window.TJ_CONFIG;
  const SB = window.supabase.createClient(CFG.url, CFG.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: "tj-share" },
  });
  const { data: t, error } = await SB.rpc("shared_trade", { tok });
  if (error) return fail("It couldn't be loaded. Try again in a moment.");
  if (!t) return fail("The link was turned off by its owner, or the trade was deleted.");

  const WCRIT = [
    ["ms", "Weekly MS"],
    ["trend", "Market trend"],
    ["fibc", "FC"],
    ["fiba", "Fib active"],
    ["ic", "IC"],
    ["whl", "High / Low"],
    ["sd", "S&D zone"],
    ["pz", "Proven zone"],
    ["lcc", "Last CC"],
    ["ec", "Engulfing candle"],
  ];
  const DCRIT = { fc: "FC", dcc: "Last CC", sd: "S&D zone" };
  const SLOTS = [
    ["weekly", "Weekly"],
    ["daily", "Daily"],
    ["h4", "4H"],
    ["ltf", "1H/2H"],
  ];
  const fmtR = r => (r == null || r === "" ? "—" : (r > 0 ? "+" : "") + Number(r).toFixed(2) + "R");
  const fmtD = d =>
    d ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const chip = (l, v) =>
    `<span class="shr-chip ${v === "against" ? "no" : "ok"}">${v === "against" ? "✗" : "✓"} ${esc(l)}</span>`;
  const row = (k, v) => (v ? `<div class="shr-row"><span>${esc(k)}</span><b>${v}</b></div>` : "");
  const ms = v => (v === "for" ? "✓ With" : v === "against" ? "✗ Against" : "");
  const arrow = d =>
    d
      ? `<span class="dirar ${d}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${d === "long" ? '<path d="M12 19V5M6 11l6-6 6 6"/>' : '<path d="M12 5v14M6 13l6 6 6-6"/>'}</svg></span>`
      : "";

  const w = t.weekly || {};
  const wChips = WCRIT.filter(([k]) => w[k])
    .map(([k, l]) => chip(l, w[k]))
    .join("");
  const dPros = Array.isArray(t.dPros) ? t.dPros : t.dailyFib === "ja" ? ["fc"] : [];
  const oc = t.outcome || (t.r > 0 ? "win" : t.r < 0 ? "loss" : t.r === 0 ? "be" : "");
  const struct = { bos: "Break of structure (BoS)", som: "Switch of momentum (SoM)" }[t.struct] || "";

  document.title = `${t.pair || "Trade"} ${fmtD(t.date)} · Trade Journal`;
  const shots = SLOTS.filter(([k]) => (t.shots && t.shots[k]) || (t.shotLinks && t.shotLinks[k]));

  box.innerHTML = `
    <div class="shr-head">
      <div><h2>${esc(t.pair || "Trade")} ${arrow(t.dir)}</h2>
        <p class="hint">${esc([t.dir ? (t.dir === "long" ? "Long" : "Short") : "", t.mode === "backtest" ? "Backtest" : "Live", t.status === "missed" ? "Missed" : ""].filter(Boolean).join(" · "))}
        · ${esc(fmtD(t.date))}${t.closeDate && t.closeDate !== t.date ? " → " + esc(fmtD(t.closeDate)) : ""}</p></div>
      ${oc ? `<span class="restag ${oc} shr-res">${{ win: "Win", loss: "Loss", be: "BE", open: "Open" }[oc]}${oc === "open" ? "" : `<b class="num">${fmtR(t.r)}</b>`}</span>` : ""}
    </div>
    <div class="shr-grid">
      <section class="shr-card"><span class="eyebrow">Weekly</span>
        ${row("Phase", t.fase ? esc(t.fase) : "")}
        ${row("Structure", t.wStruct ? (t.wStruct === "inner" ? "Inner" : "Outer") : "")}
        ${row("Pattern", t.wPat ? esc(t.wPat + (t.wPatSub ? " · " + t.wPatSub : "")) : "")}
        ${wChips ? `<div class="shr-chips">${wChips}</div>` : ""}
      </section>
      <section class="shr-card"><span class="eyebrow">Daily</span>
        ${row("Concept", t.concept ? esc(t.concept + (t.sub && t.sub !== "—" ? " · " + t.sub : "")) : "")}
        ${row("Market structure", ms(t.dMs))}
        ${dPros.length ? `<div class="shr-chips">${dPros.map(k => chip(DCRIT[k] || k, "for")).join("")}</div>` : ""}
      </section>
      <section class="shr-card"><span class="eyebrow">4H</span>
        ${row("Market structure", ms(t.hMs))}
        ${row("Entry", t.entry4h ? esc(t.entry4h + (t.ecTf ? " · " + t.ecTf.toUpperCase() : "")) : "")}
        ${row("Confirmation", esc(struct))}
        ${row("4H room", t.room === "ja" ? "Yes" : t.room === "nee" ? "No" : "")}
        ${row("Scale-in", t.scaleIn ? "Yes" : "")}
      </section>
      <section class="shr-card"><span class="eyebrow">Result</span>
        ${row("Result", oc && oc !== "open" ? esc(fmtR(t.r)) : "Open")}
        ${row("Max reached", t.maxR != null ? esc(fmtR(t.maxR)) : "")}
        ${row("Exit", esc(t.exitReason || ""))}
        ${row("According to plan", t.evaluation ? (t.evaluation === "plan" ? "Yes" : "No") : "")}
      </section>
    </div>
    ${t.notes ? `<section class="shr-card shr-notes"><span class="eyebrow">Notes</span><p>${esc(t.notes)}</p></section>` : ""}
    ${
      shots.length
        ? `<section class="shr-charts"><div class="shr-chead"><h3 class="shr-h">Charts</h3>
      <div class="segs" role="tablist">${shots.map(([k, l], i) => `<label class="seg"><input type="radio" name="shrtab" value="${i}" ${i ? "" : "checked"}><span>${l}</span></label>`).join("")}</div>
      ${shots.length > 1 ? `<span class="shr-nav"><button type="button" class="btn small ghost" data-step="-1" aria-label="Previous chart">‹</button><button type="button" class="btn small ghost" data-step="1" aria-label="Next chart">›</button></span>` : ""}</div>
      ${shots.map(([k, l], i) => `<figure class="shr-shot" data-k="${k}" ${i ? "hidden" : ""}><div class="shr-img"><p class="hint">Loading ${l} chart…</p></div></figure>`).join("")}</section>`
        : ""
    }
    <p class="hint shr-foot">Read-only view. Shared from Trade Journal.</p>`;

  // Screenshots: uploaded ones through signed URLs, TradingView snapshot links as their image.
  const tvImg = u => {
    const m = /tradingview\.com\/x\/([A-Za-z0-9]+)/.exec(u || "");
    return m ? `https://s3.tradingview.com/snapshots/${m[1][0].toLowerCase()}/${m[1]}.png` : "";
  };
  const up = shots.filter(([k]) => t.shots && t.shots[k]);
  let urls = {};
  if (up.length) {
    const { data } = await SB.storage.from("shots").createSignedUrls(
      up.map(([k]) => t.owner + "/" + t.shots[k]),
      3600
    );
    (data || []).forEach((r, i) => r && r.signedUrl && (urls[up[i][0]] = r.signedUrl));
  }
  shots.forEach(([k, l]) => {
    const el = box.querySelector(`[data-k="${k}"] .shr-img`),
      src = urls[k] || (!(t.shots && t.shots[k]) && tvImg(t.shotLinks && t.shotLinks[k]));
    const ln = t.shotLinks && t.shotLinks[k];
    el.innerHTML = src
      ? `<a href="${esc(ln && !urls[k] ? ln : src)}" target="_blank" rel="noopener" class="shr-zoom" data-zi="${shots.findIndex(x => x[0] === k)}" title="Click to zoom"><img src="${esc(src)}" alt="${l} chart for ${esc(t.pair || "trade")}"></a>`
      : ln
        ? `<a class="btn" href="${esc(ln)}" target="_blank" rel="noopener">Open ${l} chart in TradingView ↗</a>`
        : `<p class="hint">This chart couldn't be loaded.</p>`;
  });

  // Chart zoom (same as in the app's reviews), with ‹ › to switch timeframe.
  const ZO = document.getElementById("rvZoom"),
    st = document.getElementById("rvzStage"),
    inner = document.getElementById("rvzInner"),
    zimg = inner.querySelector("img"),
    Z = { s: 1, x: 0, y: 0, pts: new Map(), pinch: null, drag: null };
  const zApply = () => {
    inner.style.transform = `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`;
    document.getElementById("rvzPct").textContent = Math.round(Z.s * 100) + "%";
  };
  const zFit = () => {
    const ar = zimg.naturalWidth && zimg.naturalHeight ? zimg.naturalWidth / zimg.naturalHeight : 1.62;
    inner.style.width = Math.min(st.clientWidth, st.clientHeight * ar) + "px";
    Z.s = 1;
    Z.x = (st.clientWidth - inner.offsetWidth) / 2;
    Z.y = Math.max(0, (st.clientHeight - inner.offsetHeight) / 2);
    zApply();
  };
  const zAt = (ns, cx, cy) => {
    ns = Math.min(8, Math.max(1, ns));
    const r = st.getBoundingClientRect(),
      px = cx - r.left,
      py = cy - r.top;
    Z.x = px - ((px - Z.x) * ns) / Z.s;
    Z.y = py - ((py - Z.y) * ns) / Z.s;
    Z.s = ns;
    if (ns === 1) return zFit();
    zApply();
  };
  const zSrcs = () => figs.map(f => (f.querySelector(".shr-zoom img") || {}).src || "");
  let zi = 0;
  const zShow = i => {
    const S = zSrcs(),
      n = S.length;
    for (let k = 0; k < n; k++) {
      const j = (((i + k * (i < zi ? -1 : 1)) % n) + n) % n;
      if (S[j]) {
        zi = j;
        break;
      }
    }
    document.getElementById("shzTf").textContent = shots[zi][1];
    show(zi);
    zimg.onload = zFit;
    zimg.src = S[zi];
    if (zimg.complete) zFit();
  };
  const zOpen = i => {
    ZO.hidden = false;
    document.body.style.overflow = "hidden";
    ZO.querySelectorAll("[data-z=prev],[data-z=next]").forEach(b => (b.hidden = zSrcs().filter(Boolean).length < 2));
    zi = i;
    zShow(i);
  };
  const zClose = () => {
    ZO.hidden = true;
    document.body.style.overflow = "";
  };
  box.addEventListener("click", e => {
    const a = e.target.closest(".shr-zoom");
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    zOpen(+a.dataset.zi);
  });
  ZO.addEventListener("click", e => {
    const z = e.target.closest("[data-z]");
    if (!z) return;
    const r = st.getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    ({
      in: () => zAt(Z.s * 1.5, cx, cy),
      out: () => zAt(Z.s / 1.5, cx, cy),
      reset: zFit,
      prev: () => zShow(zi - 1),
      next: () => zShow(zi + 1),
      close: zClose,
    })[z.dataset.z]();
  });
  document.addEventListener("keydown", e => {
    if (ZO.hidden) return;
    if (e.key === "Escape") zClose();
    else if (e.key === "ArrowRight") zShow(zi + 1);
    else if (e.key === "ArrowLeft") zShow(zi - 1);
    else if (e.key === "+" || e.key === "=") zAt(Z.s * 1.5, innerWidth / 2, innerHeight / 2);
    else if (e.key === "-") zAt(Z.s / 1.5, innerWidth / 2, innerHeight / 2);
  });
  st.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      zAt(Z.s * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    },
    { passive: false }
  );
  st.addEventListener("dblclick", e => zAt(Z.s < 2 ? 2.5 : 1, e.clientX, e.clientY));
  ["gesturestart", "gesturechange", "gestureend"].forEach(t => ZO.addEventListener(t, e => e.preventDefault()));
  ZO.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  const mid = () => {
    const [a, b] = [...Z.pts.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
  };
  let tap = { t: 0, x: 0, y: 0 },
    moved = false,
    sw = null;
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
      Z.pinch = { d: m.d, s: Z.s, cx: (m.x - r.left - Z.x) / Z.s, cy: (m.y - r.top - Z.y) / Z.s };
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
  const zUp = e => {
    const was = Z.pts.size;
    Z.pts.delete(e.pointerId);
    if (Z.pts.size < 2 && Z.pinch) {
      Z.pinch = null;
      if (Z.s <= 1.02) zFit();
    }
    if (!Z.pts.size) {
      Z.drag = null;
      // swipe left/right at fit size switches timeframe on touch screens
      if (was === 1 && sw && Z.s <= 1.02 && e.pointerType !== "mouse" && e.type === "pointerup") {
        const dx = e.clientX - sw.x;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - sw.y)) return zShow(zi + (dx < 0 ? 1 : -1));
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
  st.addEventListener("pointerup", zUp);
  st.addEventListener("pointercancel", zUp);
  addEventListener("resize", () => !ZO.hidden && zFit());

  // Click through the charts: tabs, ‹ › buttons, arrow keys and swiping.
  const figs = [...box.querySelectorAll(".shr-shot")];
  let cur = 0;
  const show = i => {
    cur = (i + figs.length) % figs.length;
    figs.forEach((f, j) => (f.hidden = j !== cur));
    box.querySelectorAll('input[name="shrtab"]').forEach(r => (r.checked = +r.value === cur));
  };
  box.addEventListener("change", e => e.target.name === "shrtab" && show(+e.target.value));
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-step]");
    if (b) show(cur + +b.dataset.step);
  });
  document.addEventListener("keydown", e => {
    if (!ZO.hidden) return;
    if (figs.length > 1 && (e.key === "ArrowRight" || e.key === "ArrowLeft"))
      show(cur + (e.key === "ArrowRight" ? 1 : -1));
  });
  let x0 = null;
  box.addEventListener("touchstart", e => e.target.closest(".shr-shot") && (x0 = e.touches[0].clientX), {
    passive: true,
  });
  box.addEventListener("touchend", e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  });
})();
