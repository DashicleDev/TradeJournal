# Changelog

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
