// Supabase Edge Function "news": serves the forex news calendar with the reminders asked for in the URL.
// Deploy with "Verify JWT" switched OFF (calendar apps fetch it without a login).
// Example: /functions/v1/news?lvl=news-heavy&r=60,15  -> heavy news, reminders 60 and 15 minutes before.
const BASE = "https://willemdriessen.github.io/TradeJournal/news/";
const LEVELS = ["news", "news-high", "news-heavy"];

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const lvl = LEVELS.includes(u.searchParams.get("lvl") ?? "") ? u.searchParams.get("lvl")! : "news";
  const rem = (u.searchParams.get("r") ?? "").split(",").map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 40320).slice(0, 10);
  const src = await fetch(`${BASE}${lvl}-r0.ics`, { headers: { "cache-control": "no-cache" } });
  if (!src.ok) return new Response("News feed unavailable", { status: 502 });
  const ics = (await src.text()).replace(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT\r\n/g, (_all, body: string) => {
    const sum = (body.match(/^SUMMARY:(.*)$/m)?.[1] ?? "Forex news").trim();
    const alarms = rem.map((m) => `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${sum}\r\nTRIGGER:-PT${m}M\r\nEND:VALARM\r\n`).join("");
    return `BEGIN:VEVENT\r\n${body}${alarms}END:VEVENT\r\n`;
  });
  return new Response(ics, {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "public, max-age=900", "access-control-allow-origin": "*" },
  });
});
