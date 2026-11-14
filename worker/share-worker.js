/*
 * share-worker.js — Cloudflare Worker for share links with a link preview (WhatsApp, Discord, iMessage, …).
 *
 * Messaging apps don't run JavaScript: they read <meta property="og:…"> tags from the HTML.
 * GitHub Pages serves the same share.html for every link, so this Worker serves
 *   https://<worker>/t/<token>
 * by taking share.html from GitHub Pages and adding preview tags for that one trade
 * (pair, direction and result, plus one line of setup info, the journal logo as a small thumbnail and a result colour). People who open the link
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
const H = { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" };

// A short card: "AUDUSD - Long · Win +2.00R" (no result while open) and one line: phase, setup, date.
function preview(t) {
  const inv = !!t.ticker;
  const oc = t.outcome || (t.r > 0 ? "win" : t.r < 0 ? "loss" : t.r === 0 ? "be" : "");
  const res =
    oc && oc !== "open"
      ? `${{ win: "Win", loss: "Loss", be: "Break-even" }[oc]} ${inv && t.retPct != null ? (t.retPct > 0 ? "+" : "") + Number(t.retPct).toFixed(1) + "%" : fmtR(t.r)}`.trim()
      : "";
  const line = (...p) => p.filter(Boolean).join(" · ");
  const title = line(
    `${t.ticker || t.pair || "Trade"}${inv ? "" : t.dir ? " - " + (t.dir === "long" ? "Long" : "Short") : ""}`,
    res
  );
  // one short line: phase and setup
  const desc = inv
    ? line(t.sPhase ? "Phase " + t.sPhase : "")
    : line(
        t.fase ? "Phase " + t.fase : "",
        t.concept === "Weekly - 4H" ? "Weekly - 4H" : t.concept ? "Weekly - Daily - 4H" : ""
      );
  // Discord colours the card's edge: green win, red loss, the journal's accent otherwise
  const color = oc === "win" ? "#43c088" : oc === "loss" ? "#f06c60" : "#8590ff";
  return { title, desc, color };
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
      const { title, desc, color } = preview(trade);
      tags = `<meta property="og:type" content="article">
<meta property="og:site_name" content="Trade Journal">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url.href)}">
<meta property="og:image" content="${SITE}icons/icon-192.png">
<meta property="og:image:width" content="192">
<meta property="og:image:height" content="192">
<meta name="theme-color" content="${color}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="description" content="${esc(desc)}">`;
    } else {
      tags = `<meta property="og:title" content="Shared trade · Trade Journal">
<meta property="og:description" content="This link was turned off or the trade was deleted.">`;
    }
    // <base> makes share.html's css/js load from GitHub Pages; share.js reads the token from /t/<token>.
    const html = page
      .replace(/<meta name="theme-color"[^>]*>/, "")
      .replace(/<meta charset[^>]*>/, c => `${c}\n<base href="${SITE}">\n${tags}`);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=120" },
    });
  },
};
