# Changelog

## 1.3.6 — 2026-11-12

- Grading starts empty for new users: no requirements, red flags or extras, so every trade is B until you set your own rules. Rules you already saved are unchanged.
- Removed "Reset all phases to default" and the (+/−) counts in the preview.
- Grading rules: "C if", and the 4H entry lists no longer include the inner structure; it has its own pick list, "the weekly structure is [Inner]", under C and under B.
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
