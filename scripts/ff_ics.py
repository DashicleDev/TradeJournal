"""Builds subscribable calendar files (.ics) from the Forex Factory weekly feed.
Run by .github/workflows/news.yml; output lands in news/ and is served by GitHub Pages."""
import hashlib, re, sys, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml"
CURRENCIES = {"USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NZD"}
HEAVY = re.compile(r"^(?:(?:FOMC|Fed|ECB|BOE|BOJ|SNB|RBA|RBNZ|BOC|MPC) )?(?:CPI y/y|Non-Farm Employment Change|Federal Funds Rate|FOMC Statement|FOMC Press Conference|Main Refinancing Rate|Official Bank Rate|Cash Rate|Overnight Rate|Policy Rate|Rate Statement|Monetary Policy Statement|Monetary Policy Summary|Press Conference)$")
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
        level = "Heavy" if HEAVY.search(title) else imp
        out.append(dict(title=title, cur=cur, imp=imp, level=level, start=start))
    return out

def esc(s):
    return s.replace("\\", "\\\\").replace(";", r"\;").replace(",", r"\,").replace("\n", r"\n")

def ics(events, name, alarms=("-PT1H", "-PT15M")):
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
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

def main(out_dir="news"):
    events = parse(fetch())
    if not events:
        sys.exit("No events parsed; keeping the old files.")
    for fn, levels in VARIANTS.items():
        sel = [e for e in events if e["level"] in levels]
        for suf, alarms in REMINDERS.items():
            out = fn.replace(".ics", suf + ".ics")
            with open(f"{out_dir}/{out}", "w", encoding="utf-8", newline="") as f:
                f.write(ics(sel, NAMES[fn], alarms))
        print(fn, len(sel), "events")

if __name__ == "__main__":
    main(*sys.argv[1:])
