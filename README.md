# Trade Journal

**[Open the app → dashicledev.github.io/TradeJournal](https://dashicledev.github.io/TradeJournal/)**

A trade journal for forex (Archer plan) and investing: live trades, backtest projects, analysis and reviews, with a TradingView extension to log trades from the chart.

Static site on GitHub Pages; Supabase for sign-in, data and screenshots. Plain HTML, CSS and JavaScript with no build step.

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — how it fits together: diagram, code layout, data model, roles and features
- **[CHANGELOG.md](CHANGELOG.md)** — what changed per version
- **[supabase/schema.sql](supabase/schema.sql)** — the database
- **[TradeJournal-Extension](https://github.com/DashicleDev/TradeJournal-Extension)** — the TradingView extension

## Run it locally

Any static file server works, for example:

```sh
python3 -m http.server 8000
```

then open http://localhost:8000. It uses the Supabase project in `config.js`; sign in with your journal account.

## Release

```sh
# 1. add a "## X.Y.Z — date" section to CHANGELOG.md
scripts/release.sh X.Y.Z
git push && git push --tags
```

Code style: [Prettier](https://prettier.io) with `.prettierrc.json`.
