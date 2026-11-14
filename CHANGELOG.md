# Changelog

## 1.3.51 — 2026-11-14

- **Share page: no trade date** under the ticker or in the tab title. The link preview card (Discord) drops it too once the share worker is redeployed.

## 1.3.50 — 2026-11-14

- **Chat text no longer includes the trade date**, for forex and Invest. It starts with the pair (and direction), then the phase.

## 1.3.49 — 2026-11-14

- **Invest: no "Open" tag before you have an entry.** A trade with no entry price yet (limit not set) shows no result tag on the share page or in the Invest list. It reads Open once the entry is filled in.

## 1.3.48 — 2026-11-14

- **Review: saved reviews list.** The Notes column (it only repeated your SMB pairs) is now a Win rate column. Trades also counts open and missed trades next to the closed ones ("0 + 1 open · 1 missed"), so a week no longer reads 0 trades when it has some.

## 1.3.47 — 2026-11-14

- **Review: forex trade cards show the percent** next to R (1R is about 1% at 1% risk), in Trades to plan, Trades not to plan and Missed trades.

## 1.3.46 — 2026-11-14

- **Analyze: one "4H pros" filter** (Engulfing candle, Channel; pick one or more) instead of separate Channel and Engulfing candle filters, like Weekly and Daily pros. "Group by 4H pros" does the same: Engulfing candle, Channel, both, or none. An Engulfing entry counts as Engulfing candle.
- **Room is gone** from the trade form, the Re-evaluate game, Analyze (filter and split), the share page and the extension (1.4.32). In your data it was ticked on 89 of 91 live to-plan trades, so it couldn't show an effect. Trades keep any Room they already have (also when edited), and the CSV export still has the column. New trades don't get one.
- **Invest: Room is gone from the 3M and Monthly sections too** (form, share page, Analyze filter), and both now have a **Pros** dropdown like the weekly pros, with BM and Bullish CC (replacing the BM and Bullish CC checkboxes). Shown in the section summary, the share page, the chat text and the CSV export (new columns "3M bullish CC", "Monthly BM"). Existing BM / Bullish CC ticks carry over; old trades keep their Room. Analyze (Invest) has filters and "Group by" options for them: 3M BM, 3M bullish CC, Monthly BM (Monthly bullish CC was there already).

## 1.3.45 — 2026-11-14

- **The 4H pros can be picked with any entry** (Engulfing candle, Channel, Room): no more greying out, your call. The only locked one is Engulfing candle on an Engulfing entry, which has it by itself. Channel now counts for the grade whatever the entry; Room is saved as yes/no for every trade, and Analyze's Channel, Room and Engulfing candle filters include all trades with a 4H entry. Same in the extension (1.4.31).

## 1.3.44 — 2026-11-14

- **An Engulfing candle entry shows the Engulfing candle pro ticked and locked** in the 4H pros (trade form and Re-evaluate game); extension 1.4.30 does the same. Nothing extra is saved: Analyze already counts these trades as Engulfing candle.

## 1.3.43 — 2026-11-14

- **Analyze filter list tidied.** Same order as the form (4H: entry, structure, timeframe, market structure, then the pros, then Scale-in), Structure alignment moved to Context, and consistent names: Weekly trend, Weekly range, Daily concept, 4H engulfing candle, 4H channel, Engulfing timeframe.
- **Fix: the 4H channel filter** showed as "eng" in the list (a typo from 1.3.38) and couldn't be used.

## 1.3.42 — 2026-11-13

- **Trade forms walk-through is in random order** (before: oldest first), like the game.

## 1.3.41 — 2026-11-13

- **Fix: the journal didn't stay locked while the Replay window was open.** TradingView cuts the link to a window the journal opens, so the journal couldn't tell it was still open. The extension (1.4.28) now tells the journal when the window closes; the Unlock button stays as a fallback. Each Replay opens a new window instead of reusing one.
- **Trade forms walk-through is saved like a game session.** It shows under "Your review sessions" with where you stopped; Resume opens the trade you were on. It's removed when you get past the last trade.

## 1.3.40 — 2026-11-13

- **Replay opens its own chart window.** The click no longer depends on the extension reaching the journal tab, so nothing has to be reloaded after the extension updates. The same window is reused for the next Replay. With extension 1.4.27 the trade opens in its panel and the window closes when you save it. While the window is open the journal is locked (Show window / Unlock buttons). Replay from the trade form saves what you've changed in the form first, so the extension starts from it.

## 1.3.39 — 2026-11-13

- **Review: go through your trades in the trade form.** Pick "Trade forms" in the Re-evaluate setup, filter the trades as usual (setups, grade, pros, period, account…) and each one opens in the form, oldest first. Save & next saves and moves on, Skip and Back move without saving.
- **A trade open in the form updates when you save it in the extension**, instead of showing the old values and overwriting your change on Save. If you had already changed something in the form, it asks before replacing your changes.

## 1.3.38 — 2026-11-13

- **Deceleration entries can also have the Engulfing candle pro and Room.** Same in the extension (1.4.26).
- **Analyze: the Engulfing candle pro filter and split also include trades whose entry is Engulfing candle** (they count as "Engulfing candle").

## 1.3.37 — 2026-11-13

- **4H pros are a dropdown** like the weekly and daily pros (journal form, re-evaluate game and extension): Engulfing candle, Channel and Room. Ones that don't fit the entry are greyed out. The separate checkboxes are gone; "4H room" is now just "Room".
- **Room also goes with Engulfing candle entries** (before: SoM only).

## 1.3.36 — 2026-11-13

- **4H entry is one dropdown**: Reversal with BoS, Reversal with SoM, Continuation with BoS, Continuation with SoM, Engulfing candle and Deceleration. The BoS / SoM buttons are gone; trades still save the entry and the structure as before, so old trades work unchanged.
- **4H pros**: Engulfing candle (new, on Reversal and Continuation entries), Channel and Room are always shown; the ones that don't fit the entry are greyed out.
- **Channel now also counts on Continuation and Engulfing entries** (grades, Analyze, share page, export, re-evaluate game). New Analyze filter and split: Engulfing candle pro.

## 1.3.35 — 2026-11-13

- The Replay ↗ link also carries the trade's id, so the TradingView extension (1.4.22+) opens that trade in its panel for editing.

## 1.3.34 — 2026-11-13

- **Calmer look (unslop polish)**: labels, table headers, tags and calendar days in sentence case instead of spaced capitals; lighter headings (no bold 700/800); spacing on a 4px grid; buttons, segments and inputs share one corner radius. No empty gap above the news panel any more. Colours, fonts and layout stay as they were. Polish done with unslop by Damir Sokolovsky (@heydamir), CC BY 4.0.

## 1.3.33 — 2026-11-13

- The Replay ↗ button is hidden on phones and tablets (touch screens): it needs the TradingView extension.
- The trade sheet's Replay ↗ moved from the bottom bar to next to **View charts**, so the bottom bar is back to Copy analysis, Share, Duplicate and Delete. Link buttons now line up with normal buttons.

## 1.3.32 — 2026-11-13

- Replay ↗ at the close date now shows the whole close day (it jumped to the start of that day, so the exit wasn't visible yet).

## 1.3.31 — 2026-11-13

- Replay ↗ starts bar replay at the trade's **close date** when it has one, otherwise at its open date.

## 1.3.30 — 2026-11-13

- The Replay ↗ link opens the pair on the OANDA feed (e.g. OANDA:EURUSD) instead of TradingView's default.

## 1.3.29 — 2026-11-13

- **Replay a trade on TradingView**: a Replay ↗ button in the trade sheet opens the pair's 4H chart. With the TradingView extension (1.4.19+), bar replay starts at the trade's date, so you can step through it again (for example to fill in Max R reached). The re-evaluate game has it too: on every step in an open session, and on the reveal in a blind one (earlier would give away the pair and date).

## 1.3.28 — 2026-11-13

- News panel: the admins' "Show medium" checkbox is now a small button. It shows every lower level: "Show medium" when your news setting is heavy + high, "Show high & medium" when it's heavy only.

## 1.3.27 — 2026-11-13

- News panel: **USD heavy news marks every open trade**, not only USD pairs, since it moves the whole market (also for USD events an admin marked heavy). Other news still only marks pairs with its currency.

## 1.3.26 — 2026-11-13

- **News panel colours**: a level pill right after each event (Heavy red, High amber, Medium yellow), and a heavy event's currency in red.
- **Admins mark events as heavy**: a ☆ on each news row marks that event (currency + title) as heavy every time it comes around; ★ unmarks it. Admins can turn on **Show medium** to mark medium events too. The news bot reads the marks (table `news_heavy`), so the heavy calendars follow within 3 hours. The built-in heavy list (CPI, NFP, rate decisions…) stays as it was.

## 1.3.25 — 2026-11-13

- **This week's news on the Journal page**: the heavy and high events still to come (heavy only if that's your news setting), by day with time and currency, from the same feed as the news calendar. An event that hits an open trade's currency names that trade. Shown for live forex only. Forex Factory only publishes the current week, so it's nearly empty from Friday until next week's events arrive, usually on Sunday.

## 1.3.24 — 2026-11-13

- Calendar: open and missed trades show just their pair with a blue or hollow dot, without the "Open" / "Missed" text or the outline around the day.

## 1.3.23 — 2026-11-13

- **Open trades show in the calendar**: on their day with a blue dot (and "Open" when the day has no closed trades), and as "1 open" in the week and month totals. Like missed trades, they don't count in the day's R or colour until they're closed.

## 1.3.22 — 2026-11-13

- The drill down's **Bars show** switch sits next to **Split by**.

## 1.3.21 — 2026-11-13

- **Drill down bars show total R by default**, so a group with only a couple of trades no longer gets the biggest bar. Switch to **Average R** to compare sets of very different sizes (like backtest vs live). The number the bars use is the bold one.

## 1.3.20 — 2026-11-13

- **Drill down shows total R** next to the average R on every row (green or red), so you see what a phase, grade or pair actually made, not just its average.

## 1.3.19 — 2026-11-13

- **Missed trades show in the calendar**: on their day with a hollow dot and a dashed outline, and as "1 missed" in the week and month totals. They still don't count in the day's R, win rate or any stats. The Missed tag in the trade list is easier to spot.
- **Missed trades in Analyze**: live and "All" sets have a switch under All / Live / Backtest: **Taken** (the default), **Taken + missed** (missed at the R you logged) or **Missed only**. Backtest sets don't show it: only live trades can be missed. For the same reason, the backtest trade form no longer has a "Missed trade" checkbox. It replaces the Status filter, whose "Taken" option did nothing. The "Taken vs missed" preset uses it.

## 1.3.18 — 2026-11-13

- Market trend buttons fit on one line and use the normal selection colour (red and green only mean with / against). The weekly fields line up in two columns.

## 1.3.17 — 2026-11-13

- **Market trend is Bullish, Bearish or Ranging.** You pick the trend as you see it on the chart; the journal still works out with / against from your direction, so grades and the Market trend stats work as before. Ranging replaces the separate Ranging checkbox (old ranging trades show as Ranging). Old trades show as Bullish or Bearish from their direction. Also in the review game and on shared trades.

## 1.3.16 — 2026-11-12

- **Weekly cons are just Fib active and Last CC.** The other weekly criteria (FC, IC, High / Low, S&D zone, Proven zone, Engulfing candle) were almost never a con, so they're pros only now, in the trade form, the review game and the grade rules. Older trades keep any con they already have, and you can still remove it.

## 1.3.15 — 2026-11-12

- **Delete data is much faster**: items are deleted 200 at a time instead of one by one (also when clearing demo data).

## 1.3.14 — 2026-11-12

- **Deleting a trade deletes its screenshots** from storage too (also with Delete data). A screenshot that a duplicated trade still uses stays.
- **CSV import is much faster** for big files: all rows are saved together, with one redraw, instead of one at a time.

## 1.3.13 — 2026-11-12

- **Safer share links**: chart links on shared trades (and in the app) only open when they are normal `https://` links, so a shared trade can't carry a link that runs code.
- **Offline fixes**: a trade deleted offline no longer comes back; changes made offline are sent as soon as the connection returns, without reopening the app; and an older offline edit no longer overwrites a newer edit from another device.

## 1.3.12 — 2026-11-12

- Copy analysis puts the trade link (just the link) right under the title, so WhatsApp (which only previews the first link) shows the trade card instead of the first chart. Discord shows the trade card first.

## 1.3.11 — 2026-11-12

- **Link previews for shared trades** in WhatsApp, Discord and other apps: the pair and direction with the result ("AUDUSD - Long · Win +2.00R"), one line of setup info (phase, setup, 4H entry), and the date (no image). Share links now go through the share worker; older links keep working.

## 1.3.10 — 2026-11-12

- **Invest CSV export is readable too**: ticker, phase, market structure and the details per timeframe (12M, 6M, 3M, monthly, weekly), entry, stop, exits in one cell ("2026-05-10: 50% at 420 (3M BOC)"), ROI, R and outcome. Share counts, P&L, exchange rate and account only with **Include amounts**. Import reads it back; without amounts, existing trades keep their exits.
- **Data tab**: each part explains what it does. Pick Forex or Invest for the CSV regardless of the market you're viewing; files are named by market and date. Delete data sits in its own block at the bottom.

## 1.3.9 — 2026-11-12

- **Forex CSV export is readable**: plain column names ("Weekly MS", "Daily pattern", "4H entry"…), values as with / against / yes / no, the full analysis per trade, and the setup grade with its reason. Old, always-empty columns are gone. Easy to open in a spreadsheet or give to an AI.
- Import CSV reads the new format as well as the old one. Importing a trade that already exists now updates it and keeps what the file doesn't hold (screenshots, account…), instead of replacing it.

## 1.3.8 — 2026-11-12

- Grading **presets**: save the current rules under a name, load a preset later (Undo brings back what you had), or delete one. Saving under an existing name overwrites it. Presets are stored in your settings, so they sync across devices.

## 1.3.7 — 2026-11-12

- Analyze, comparing sets: the chart legend, the drill-down and the tooltips name each set by what makes it different ("Setup grade: A", "Setup grade: B"…) instead of "Set 1, 2, 3". The drill-down has its own legend, and every set keeps its own line in each row, also when it has no trades there.

## 1.3.6 — 2026-11-12

- Grading starts empty for new users: no requirements, red flags or extras, so every trade is B until you set your own rules. Rules you already saved are unchanged.
- Removed "Reset all phases to default" and the (+/−) counts in the preview.
- Grading rules: "C if", and the 4H entry lists no longer include the inner structure; they have their own pick list, "the setup is", under C and under B: weekly structure Inner or Outer, and setup Weekly - Daily - 4H or Weekly - 4H. So "outer structure at most B" or "Weekly - 4H setups give C" can now be set per phase.
- Grading preview filters are three compact dropdowns (phase, plan, live/backtest) next to the dates. The phase overview reads "C if: no Weekly MS, inner structure, …" to match the rules.

## 1.3.5 — 2026-11-12

- Grading rules read top to bottom in the order a grade is decided: **C** if any requirement isn't with you, any red flag is marked against you, or the trade is something you marked as C; **A** if enough extras are with you, but only B for what you marked; otherwise **B**. Same rules as before, only the layout and labels changed.

## 1.3.4 — 2026-11-12

- Grading preview: **Phase N / All phases** switch, on the phase you're editing by default.
- After each rule change the counts show what moved, e.g. "B 12 (+3)". Click a grade to list its trades, newest first, with the grade they came from and why; click a trade to open it without leaving Grading.
- **Undo last change** button (this session).

## 1.3.3 — 2026-11-12

- Grading: the inner-structure and 4H-entry buttons are replaced by two pick lists that read like the other rules, **"At most B with"** and **"C with"**, each holding inner structure and/or entry types. The entry types are no longer in the requirements and extras lists, so each lives in one place.

## 1.3.2 — 2026-11-12

- **Grading is its own tab** next to Analyze (it moved out of Settings).
- Grade rules per phase now cover the **4H entry**: each entry type (Reversal, Continuation, Deceleration, Engulfing Candle) can follow the same rules, be "at most B" or "not valid (C)". The entry types can also be picked as requirements or extras.
- Re-evaluate: the 4H step asks about Channel on a Reversal entry, and the grade it shows counts it, like the trade form. Changing the entry away from Reversal clears Channel on the trade.
- Re-evaluate with the previous analysis shown: "Ranging" is now pre-filled from the trade, so replacing the analysis no longer switches it off.
- 4H channel only counts towards a grade on a Reversal entry.

## 1.3.1 — 2026-11-11

- plan.json now includes the grade criteria and default rules, so the TradingView extension (1.4.7) can show a live setup grade while you log a trade.

## 1.3.0 — 2026-11-11

- **X and C are one grade now: C = outside your rules.** A trade is C when a requirement is missing (or its structure isn't valid in the phase) or when a red flag is marked against. Grades are A / B / C everywhere. Every trade that was X is now C; the reason still says which ("Missing: Fib active" or "Against: S&D zone").
- Grade rules editor: "C unless with you (requirements)" and "C if marked against (red flags)"; inner structure "Not valid (C)".
- Analyze: new "Why C" filter and split (a requirement missing vs something marked against), and the preset "C: requirement missing vs marked against". Saved filters on X now match C.

## 1.2.25 — 2026-11-11

- Cleaner share bar under a shared trade: "Shared" with the eye and view count on top, the link with Copy and Stop sharing on one line below (stacked on phones).

## 1.2.24 — 2026-11-11

- The shared trade page shows its view count top right, as an eye with a number.

## 1.2.23 — 2026-11-11

- **View counter on shared trades:** the share bar under a shared trade shows how many people opened the link and when last ("3 views · last 11 Nov 2026"). Counted once per browser per link; your own opens don't count.

## 1.2.22 — 2026-11-10

- The lower-timeframe chart is called by its timeframe (1H or 2H, from the trade) instead of "1H/2H" on the shared page, in Copy analysis, the chart viewer and the zoom.

## 1.2.21 — 2026-11-10

- Filter descriptions say "To plan" / "Not to plan" instead of "According to plan: Yes / No".

## 1.2.20 — 2026-11-10

- Filter descriptions say "According to plan: Yes" instead of just "Yes" (review sessions and Analyze set names).

## 1.2.19 — 2026-11-10

- Review sessions in progress show more: blind or previous analysis shown, the filters ("Only: Phase 2 · …"), when started and last used, and how it's going so far (same as back then, plan verdicts changed, analyses replaced).
- Re-evaluate with previous analysis shown: the setup grade with its reason is shown under the steps and updates as you change answers, like in the trade form.
- Fixed: the reveal's "grade then → now" and the trade form's grade now also take the phase's daily pattern and channel rules into account.

## 1.2.18 — 2026-11-10

- Re-evaluate: choose **Previous analysis: Hidden (blind) or Shown**. Shown fills in what you analysed back then, with the pair and date, so you correct it; the reveal shows what you changed.
- Re-evaluate: **Only trades with** uses the same filters as Analyze (+ Add filter: phase, pros/cons, concept, 4H entry, grade, result, according to plan and the rest), on top of live/backtest, period and not-yet-reviewed.

## 1.2.17 — 2026-11-10

- Pattern in Pattern is no longer a 4H entry; trades that had it are now Reversal (the weekly and daily Pattern in Pattern stay).

## 1.2.16 — 2026-11-10

- **Channel** as an extra confirmation on a Reversal entry (4H). It doesn't change the take / invalid check; it shows in the 4H summary, the shared page and Copy analysis, can be used in the grade rules (4H → Channel) and in Analyze (filter and split "Channel (reversal)"). The extension asks it too (1.4.5).

## 1.2.15 — 2026-11-10

- Shared invest page: each exit shows which part of the position it closed (e.g. 66.7%), and the ROI is at the top: the final return once closed, or the return on the whole position from the exits so far while it's still open. Still no number of shares or amounts.

## 1.2.14 — 2026-11-10

- Shared invest page: each exit shows its price, with the date and how on their own small lines under it.

## 1.2.13 — 2026-11-10

- **Invest trades can be shared too:** Share and Copy analysis in the invest trade form. The shared page shows the phase, the analysis per timeframe (12M, 6M, 3M, Monthly, Weekly), entry, stop, exits with date, price and how, the % return, notes and the charts with zoom. Number of shares, amounts, P&L and exchange rates are never shared.

## 1.2.12 — 2026-11-10

- Trade form: a **View charts** button at the top of the analysis opens all of the trade's charts in the zoom, with ‹ › arrows, arrow keys or swiping to click through the timeframes, without opening each section.

## 1.2.11 — 2026-11-10

- Shared page and Copy analysis name the setup by its timeframes: "Weekly - Daily - 4H" when there is a daily pattern, "Weekly - 4H" when not. The daily pattern itself (e.g. Continuation, 100 level) is listed under Daily.
- Trade form: the trade concept dropdown is replaced by **Setup** (Weekly - Daily - 4H or Weekly - 4H) and, under Daily, the **Daily pattern** with its variant. Trades are saved the same way as before, so existing trades open correctly and Analyze, grades and reviews are unchanged. The TradingView extension (1.4.2) asks it the same way.

## 1.2.10 — 2026-11-10

- Copy analysis heading reads "NZDJPY - Short".

## 1.2.9 — 2026-11-10

- Copy analysis is plain text, so it pastes cleanly in Discord, WhatsApp and elsewhere (no ** around the pair). On the 4H the confirmation now follows the entry directly, with MS after it.
- Shared page: market structure is a row on every timeframe (weekly with market trend under it), always after that timeframe's setup, instead of a chip on the weekly.
- The trade concept is no longer listed under Daily: it sits under the trade's heading on the shared page and right under the heading in Copy analysis.

## 1.2.8 — 2026-11-10

- **Engulfing candle** in the weekly Pros and Cons. It also works in the grade rules, Analyze, the blind review, the shared page, Copy analysis and the TradingView extension.

## 1.2.7 — 2026-11-10

- Chart viewer in the app: click the chart to zoom, then switch timeframe with the ‹ › arrows, arrow keys or a swipe, without leaving the zoom.
- Cleaner on phones: the viewer has its title and Close on one line, and the zoom bar drops − / + (pinch instead) so it fits on one line, here and on the shared page.

## 1.2.6 — 2026-11-10

- Shared trade page: click a chart to open it full screen with the same zoom as in the app (scroll or pinch to zoom, drag to move, Fit), and ‹ › arrows, arrow keys or swiping to switch timeframe.

## 1.2.5 — 2026-11-10

- Copy analysis leaves the result out: just the analysis, chart links, notes and the link to the trade.

## 1.2.4 — 2026-11-10

- **Open** as a trade outcome next to Win / BE / Loss, for trades that are still running. It clears the R, shows as "Open" in the tables, reviews, shared page and copied analysis, and open trades stay out of the R statistics until you close them. Analyze can filter on it.

## 1.2.3 — 2026-11-10

- **Copy analysis** on a forex trade copies the analysis per timeframe (weekly, daily, 4H, 1H/2H) with its TradingView chart links, the result, your notes and a link to the shared trade page, ready to paste in Discord, where the chart links show as previews.
- Share links point straight to the trade page again (the Cloudflare preview is switched off for now).

## 1.2.2 — 2026-11-10

- Shared trade page: charts in one viewer you click through (Weekly / Daily / 4H / 1H tabs, ‹ › buttons, arrow keys, swipe on phones), so the analysis stays on top.
- Chat previews show the analysis per timeframe (phase, weekly criteria, daily concept and MS, 4H entry) instead of one summary line.

## 1.2.1 — 2026-11-10

- Share links get a preview in WhatsApp, Discord and other chat apps: pair, direction, result, phase, concept and a chart. Links you shared before keep working, without the preview.

## 1.2.0 — 2026-11-10

- **Share trades.** A Share button on forex trades makes a read-only link to a page with the trade, its weekly/daily/4H analysis, result, notes and charts. Anyone with the link can view it without signing in, nobody can edit it. The account and project are never shown. Stop sharing turns the link off. Turn it on per role with the new "Share trades" feature.

## 1.1.6 — 2026-11-10

- The overview of all phases moved to the bottom of the grade rules editor.

## 1.1.5 — 2026-11-10

- "How your trades grade" has filters: on plan / off plan / both, live / backtest / both, and a from–to date range.
- The red-flag list only offers criteria a trade can actually have marked against (no weekly pattern or daily pros).

## 1.1.4 — 2026-11-10

- The pick lists in the grade rules editor are grouped under Weekly, Daily and 4H.

## 1.1.3 — 2026-11-10

- Grade rules can use **Daily pattern** (every trade concept except Weekly - 4H; Weekly - 4H counts as against) next to **Weekly pattern**.

## 1.1.2 — 2026-11-10

- The "How your trades grade" table now sits at the top of the grade rules editor, so you see the grades move while picking criteria.
- Inner structure per phase can now also be **Not valid (X)**. Phase 3 defaults to this: an inner-structure trade in phase 3 is X.

## 1.1.1 — 2026-11-10

- Clearer grade rules editor: an overview of all four phases on top (click a phase to edit it), then per phase three lines you can read as a sentence: **X** unless with you…, **C** if marked against…, **A** with at least N of…, each with the same multi-select as Pros and Cons in the trade form.

## 1.1.0 — 2026-11-09

- **New grade system: A / B / C / X from your own rules per weekly phase**, replacing the points score. In Settings → Forex → Grade rules you choose per phase:
  - **Required:** criteria that must be with you, otherwise the trade is **X** (outside your rules).
  - **Red flags:** criteria that make it **C** when marked against.
  - **Extras:** with at least N of these it's **A**, otherwise **B**. Optionally inner structure is at most B.
  - A live table shows how your own trades grade with the current rules (on plan, backtests or all).
- Defaults follow the plan: Phase 2 needs weekly MS and fib active, Phase 3 a proven zone.
- Grades show their reason (e.g. "Missing: Fib active") in the trade form, the trades table and the blind review. Analyze has X as a grade and a "Graded vs outside your rules" comparison; the setup score split is gone.

## 1.0.1 — 2026-11-09

- Project notes grow to fit their text instead of scrolling inside a fixed box.

## 1.0.0 — 2026-11-09

First numbered release. The code is split into readable files (`css/app.css` and `js/*.js`) with an architecture overview, the database schema and a release script. No changes to how the app works.

What the journal does at this point:

- **Forex:** journal and backtest projects with the weekly → daily → 4H analysis flow, setup score and A/B/C grades, R-based statistics.
- **Invest:** trades with multiple exits and exit strategies, % return, Belgian capital gains tax, and backtests that can simulate results with an account (fixed amount or % per position).
- **Analyze:** filters, side-by-side comparisons and drill-down splits for both markets.
- **Review:** blind re-analysis of old trades and weekly/monthly/quarterly/yearly reviews.
- **Accounts:** FTMO challenges and funded accounts, personal and invest accounts.
- **News:** forex news calendars to subscribe to, keeping the past eight weeks.
- **TradingView extension:** log live trades and backtests from the chart, with install guide in Settings → Extension.
- **Admin:** roles with features, users with roles and daily usage.
- Works offline, syncs across devices, installs as an app.
