"""Builds subscribable calendar files (.ics) from the Forex Factory weekly feed.
Run by .github/workflows/news.yml; output lands in news/ and is served by GitHub Pages."""
import hashlib, re, sys, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml"
CURRENCIES = {"USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NZD"}
HEAVY = re.compile(r"^(?:(?:FOMC|Fed|ECB|BOE|BOJ|SNB|RBA|RBNZ|BOC|MPC) )?(?:(?:Core )?CPI(?: Flash Estimate)? (?:m/m|y/y|q/q)|Non-Farm Employment Change|Federal Funds Rate|FOMC Statement|FOMC Press Conference|Main Refinancing Rate|Official Bank Rate|Cash Rate|Overnight Rate|Policy Rate|Rate Statement|Monetary Policy Statement|Monetary Policy Summary|Press Conference)$")
VARIANTS = {  # file -> impact levels included
    "news.ics": {"Heavy", "High", "Medium"},
    "news-high.ics": {"Heavy", "High"},
    "news-heavy.ics": {"Heavy"},
}
from itertools import combinations
STEPS = [1440, 240, 180, 120, 60, 45, 30, 15, 10, 5]  # minutes; up to two reminders per calendar
def _trig(m):
    return f"-P{m // 1440}D" if m % 1440 == 0 else f"-PT{m}M"
REMINDERS = {"": (_trig(60), _trig(15)), "-r0": ()}
for k in (1, 2):
    for combo in combinations(STEPS, k):
        REMINDERS["-r" + "-".join(map(str, combo))] = tuple(_trig(m) for m in combo)
NAMES = {"news.ics": "Forex news (heavy, high, medium)", "news-high.ics": "Forex news (heavy + high)", "news-heavy.ics": "Forex news (heavy only)"}

MARKS = set()  # "CUR|Title" of events admins marked heavy in the journal (table news_heavy)

def heavy_marks():
    """Read the admins' heavy marks with the journal's public key (config.js); empty if Supabase can't be reached."""
    import json, os
    try:
        cfg = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config.js"), encoding="utf-8").read()
        url, key = re.search(r'url:\s*"([^"]+)"', cfg)[1], re.search(r'anonKey:\s*"([^"]+)"', cfg)[1]
        req = urllib.request.Request(url + "/rest/v1/news_heavy?select=key", headers={"apikey": key, "Authorization": "Bearer " + key})
        with urllib.request.urlopen(req, timeout=20) as r:
            return {row["key"] for row in json.load(r)}
    except Exception as ex:
        print("Heavy marks not read, using the built-in list only:", ex)
        return set()

def is_heavy(cur, title):
    return bool(HEAVY.search(title)) or f"{cur}|{title}" in MARKS

def fetch():
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (TradeJournal news feed)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

def parse(raw):
    out = []
    for e in ET.fromstring(raw).findall("event"):
        g = lambda k: (e.findtext(k) or "").strip()
        title, cur, imp, date, time = g("title"), g("country"), g("impact"), g("date"), g("time").lower()
        m = re.match(r"^(\d{1,2}):(\d{2})(am|pm)$", time)
        if cur not in CURRENCIES or not m:
            continue  # skips All Day / Tentative / unknown
        h = int(m[1]) % 12 + (12 if m[3] == "pm" else 0)
        start = datetime.strptime(date, "%m-%d-%Y").replace(hour=h, minute=int(m[2]), tzinfo=timezone.utc)  # feed times are UTC
        level = "Heavy" if is_heavy(cur, title) else imp
        out.append(dict(title=title, cur=cur, imp=imp, level=level, start=start))
    return out

def esc(s):
    return s.replace("\\", "\\\\").replace(";", r"\;").replace(",", r"\,").replace("\n", r"\n")

def ics(events, name, alarms=("-PT1H", "-PT15M")):
    L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TradeJournal//Forex news//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
         f"X-WR-CALNAME:{esc(name)}", "X-PUBLISHED-TTL:PT3H", "REFRESH-INTERVAL;VALUE=DURATION:PT3H"]
    for e in events:
        uid = hashlib.sha1(f"{e['cur']}|{e['title']}|{e['start'].date()}".encode()).hexdigest() + "@tradejournal"
        s, en = e["start"], e["start"] + timedelta(minutes=30)
        L += ["BEGIN:VEVENT", f"UID:{uid}", f"DTSTAMP:{s:%Y%m%dT%H%M%SZ}", f"DTSTART:{s:%Y%m%dT%H%M%SZ}", f"DTEND:{en:%Y%m%dT%H%M%SZ}",
              f"SUMMARY:{esc(('⚠ ' if e['level'] == 'Heavy' else '') + '[' + e['cur'] + '] ' + e['title'])}",
              f"DESCRIPTION:{esc('Impact: ' + ('Heavy news (' + e['imp'] + ')' if e['level'] == 'Heavy' else e['imp']) + chr(10) + 'Source: Forex Factory')}",
              "TRANSP:TRANSPARENT", *[x for t in alarms for x in ("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(e["cur"] + " " + e["title"]), "TRIGGER:" + t, "END:VALARM")], "END:VEVENT"]
    L.append("END:VCALENDAR")
    return "\r\n".join(L) + "\r\n"

KEEP_DAYS = 56  # past events stay in the calendars this long

def with_history(events, out_dir):
    """This week's events plus earlier weeks from history.json, so past news stays visible."""
    import json, os
    hist_path = f"{out_dir}/history.json"
    if not os.path.exists(hist_path):
        return events
    week = {e["start"].date() for e in events}
    cutoff = datetime.now(timezone.utc) - timedelta(days=KEEP_DAYS)
    old = []
    for r in json.load(open(hist_path, encoding="utf-8")):
        st = datetime.strptime(r["start"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        if st.date() in week or st < cutoff:
            continue
        imp = r.get("imp") or ("High" if r["level"] == "Heavy" else r["level"])
        # from the event's own impact, so an admin's unmark also takes effect on past weeks
        old.append(dict(title=r["title"], cur=r["cur"], imp=imp, level="Heavy" if is_heavy(r["cur"], r["title"]) else imp, start=st))
    return old + events

def main(out_dir="news"):
    MARKS.update(heavy_marks())
    events = parse(fetch())
    if not events:
        sys.exit("No events parsed; keeping the old files.")
    all_events = with_history(events, out_dir)
    for fn, levels in VARIANTS.items():
        sel = [e for e in all_events if e["level"] in levels]
        for suf, alarms in REMINDERS.items():
            out = fn.replace(".ics", suf + ".ics")
            with open(f"{out_dir}/{out}", "w", encoding="utf-8", newline="") as f:
                f.write(ics(sel, NAMES[fn], alarms))
        print(fn, len(sel), "events")
    # JSON for the journal's own calendar: this week + a growing history
    import json, os
    rows = [dict(cur=e["cur"], title=e["title"], level=e["level"], imp=e["imp"], start=e["start"].strftime("%Y-%m-%dT%H:%M:%SZ")) for e in events]
    hist_path = f"{out_dir}/history.json"
    hist = {}
    if os.path.exists(hist_path):
        try:
            hist = {f"{r['cur']}|{r['title']}|{r['start'][:10]}": r for r in json.load(open(hist_path, encoding="utf-8"))}
        except Exception:
            hist = {}
    week = {r["start"][:10] for r in rows}
    hist = {k: v for k, v in hist.items() if v["start"][:10] not in week}  # this week's file replaces its own days
    for r in rows:
        hist[f"{r['cur']}|{r['title']}|{r['start'][:10]}"] = r
    with open(hist_path, "w", encoding="utf-8") as f:
        json.dump(sorted(hist.values(), key=lambda r: r["start"]), f, ensure_ascii=False, separators=(",", ":"))

if __name__ == "__main__":
    main(*sys.argv[1:])
