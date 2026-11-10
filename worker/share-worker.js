/*
 * share-worker.js — Cloudflare Worker for share links with a link preview (WhatsApp, Discord, iMessage, …).
 *
 * Messaging apps don't run JavaScript: they read <meta property="og:…"> tags from the HTML.
 * GitHub Pages serves the same share.html for every link, so this Worker serves
 *   https://<worker>/t/<token>
 * by taking share.html from GitHub Pages and adding preview tags for that one trade
 * (pair, direction, result, phase, concept and a chart as the image). People who open the link
 * get the normal read-only page. Uses only the public anon key, like the app itself.
 */
const SITE = "https://dashicledev.github.io/TradeJournal/";
const SUPA = "https://hmkikstwphyiwxtjlejt.supabase.co";
const ANON = "sb_publishable_CAmosQpYv5zO5MvmKnMfdw_Yf06GLgv";

const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
const fmtR = r => (r == null ? "" : (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(Number(r)).toFixed(2) + "R");
const fmtD = d =>
  d ? new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
const tvImg = u => {
  const m = /tradingview\.com\/x\/([A-Za-z0-9]+)/.exec(u || "");
  return m ? `https://s3.tradingview.com/snapshots/${m[1][0].toLowerCase()}/${m[1]}.png` : "";
};
const H = { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" };

async function chartImage(t) {
  for (const k of ["weekly", "daily", "h4", "ltf"]) {
    const id = t.shots && t.shots[k];
    if (id) {
      const r = await fetch(`${SUPA}/storage/v1/object/sign/shots/${t.owner}/${id}`, {
        method: "POST",
        headers: H,
        body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 30 }),
      });
      const j = r.ok ? await r.json() : null;
      if (j && j.signedURL) return SUPA + "/storage/v1" + j.signedURL;
    }
    const tv = tvImg(t.shotLinks && t.shotLinks[k]);
    if (tv) return tv;
  }
  return SITE + "icons/icon-512.png";
}

function preview(t) {
  const oc = t.outcome || (t.r > 0 ? "win" : t.r < 0 ? "loss" : t.r === 0 ? "be" : "");
  const res = oc ? `${{ win: "Win", loss: "Loss", be: "Break-even" }[oc]} ${fmtR(t.r)}` : "Open";
  const title = [t.pair || "Trade", t.dir ? (t.dir === "long" ? "Long" : "Short") : "", "·", res]
    .filter(Boolean)
    .join(" ");
  // The analysis first, one line per timeframe (Discord shows the line breaks, WhatsApp the start).
  const w = t.weekly || {};
  const mark = v => (v === "for" ? "✓" : v === "against" ? "✗" : "");
  const WK = [
    ["ms", "MS"],
    ["trend", "Trend"],
    ["fibc", "FC"],
    ["fiba", "Fib active"],
    ["ic", "IC"],
    ["whl", "High/Low"],
    ["sd", "S&D"],
    ["pz", "Proven zone"],
    ["lcc", "Last CC"],
  ];
  const DK = { fc: "FC", dcc: "Last CC", sd: "S&D" };
  const line = (...p) => p.filter(Boolean).join(" · ");
  const desc = [
    line(
      t.fase ? "Phase " + t.fase : "",
      t.wStruct ? (t.wStruct === "inner" ? "Inner" : "Outer") + " structure" : "",
      t.wPat
    ),
    WK.filter(([k]) => w[k]).length
      ? "Weekly: " +
        WK.filter(([k]) => w[k])
          .map(([k, l]) => mark(w[k]) + " " + l)
          .join("  ")
      : "",
    line(
      t.concept ? "Daily: " + t.concept + (t.sub && t.sub !== "—" ? " (" + t.sub + ")" : "") : "",
      t.dMs ? mark(t.dMs) + " MS" : "",
      ...(Array.isArray(t.dPros) ? t.dPros : []).map(k => "✓ " + (DK[k] || k))
    ),
    line(
      t.hMs || t.entry4h ? "4H:" + (t.hMs ? " " + mark(t.hMs) + " MS" : "") : "",
      t.entry4h ? t.entry4h + (t.ecTf ? " " + t.ecTf.toUpperCase() : "") : ""
    ),
    line(t.mode === "backtest" ? "Backtest" : "Live", fmtD(t.date), t.exitReason ? "Exit: " + t.exitReason : ""),
  ]
    .filter(Boolean)
    .join("\n");
  return { title, desc };
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const m = /^\/t\/([a-f0-9]{32})\/?$/.exec(url.pathname);
    if (!m) return Response.redirect(SITE, 302);

    const [page, trade] = await Promise.all([
      fetch(SITE + "share.html", { cf: { cacheTtl: 300 } }).then(r => r.text()),
      fetch(`${SUPA}/rest/v1/rpc/shared_trade`, { method: "POST", headers: H, body: JSON.stringify({ tok: m[1] }) })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    let tags;
    if (trade) {
      const { title, desc } = preview(trade);
      const img = await chartImage(trade);
      tags = `<meta property="og:type" content="article">
<meta property="og:site_name" content="Trade Journal">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${esc(url.href)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="description" content="${esc(desc)}">`;
    } else {
      tags = `<meta property="og:title" content="Shared trade · Trade Journal">
<meta property="og:description" content="This link was turned off or the trade was deleted.">`;
    }
    // <base> makes share.html's css/js load from GitHub Pages; share.js reads the token from /t/<token>.
    const html = page.replace(/<meta charset[^>]*>/, c => `${c}\n<base href="${SITE}">\n${tags}`);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=120" },
    });
  },
};
