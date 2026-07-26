# pendler

A client-only PWA for looking up VVS/SSB (Stuttgart public transport) departures and trip
connections. No backend, no account, no tracking — everything runs in your browser and talks
directly to VVS's own (public, undocumented) API.

**Repo:** https://github.com/mahdimp/pendler

## Features

- **Station board** — live departures for any stop: line, direction, delay, cancellation status,
  and platform, refreshing automatically.
- **Trip search** — find a connection between two stops, browse up to five journey options, and
  drill into a full leg-by-leg breakdown (platforms, times, transfers).
- **Saved routes & recent stations** — quick-pick shortcuts stored locally in your browser, with a
  way to remove entries you no longer want.
- **Disruption translation** — any service disruption or delay notice (VVS publishes these in
  German) can be translated in place, with a language you choose in Settings, or auto-detected
  from your browser.
- **Installable PWA** — add it to your home screen; works from any static host.

## Why no backend?

VVS's EFA API (StopFinder, TripRequest, DepartureMonitor) sends
`Access-Control-Allow-Origin: *`, so the browser can call it directly — there's nothing for a
server to proxy. State that would normally need a backend (recent stations, saved routes, your
translation-language preference) lives in `localStorage` instead. The tradeoff: this is an
undocumented, reverse-engineered API, so it could change or rate-limit without notice.

## Getting started

```bash
npm install
npm start          # dev server at http://localhost:4200, live reload
```

```bash
npm run build      # production build -> dist/pendler/browser
```

The build output is fully static — serve it from any static host (GitHub Pages, Netlify, S3,
`python -m http.server`, etc.). No environment variables, no server-side config.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app
with `--base-href /<repo-name>/` and publishes it to GitHub Pages via GitHub
Actions.

Before the first deploy:

1. The repo must be **public** (GitHub Pages needs a paid plan to publish from a private repo).
2. In the repo's Settings → Pages, set **Build and deployment → Source** to **GitHub Actions**.

Live at: https://mahdimp.github.io/pendler/

## Stack

Angular 22 (standalone components, signals, zoneless-friendly change detection), no CSS
framework — hand-written tokens/utility classes in `src/styles.css`. `@angular/service-worker`
handles the PWA manifest/offline shell.

## License

MIT — see [LICENSE](./LICENSE).
