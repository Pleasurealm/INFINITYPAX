# Infinity Pax — Capability Dashboard

A static, multi-page web app for **Infinity Pax**, an ex-forces-led security &
estate-services workforce serving luxury retail, hospitality, private homes and
high-net-worth clients. Deploys to Netlify with one serverless function for the
Job Finder.

## Pages
| File | Purpose |
|------|---------|
| `index.html` | **Capability Dashboard** — stat tiles, rate-tier toggle, covering email (Copy Email) |
| `team.html` | **Team Roster** — 50-person roster with search/filter, per-person target-employer email (saved to the browser), and copy-ready covering emails |
| `statement.html` | **Capability Statement** — print/PDF letterhead version |
| `jobfinder.html` | **Job Finder Agent** — live web search via a Netlify Function (Firecrawl) |

## Design system
Pure black/white letterhead system in `assets/css/letterhead.css`:
- Display: **TeX Gyre Heros Condensed** (uppercase, wide tracking) — `assets/fonts/ipfont-heros-condensed.otf`
- Body: **Everett** — `assets/fonts/ipfont-everett.otf`
- Tokens: `var(--ink)` `var(--paper)` `var(--hair)` `var(--hair-soft)` `var(--display)` `var(--body)`
- Hard corners, hairline rules, no colour, no shadows on content.

## Editable data (no code change)
Rates and roster live in `data/`:
- `data/rates.json` — rate tiers and per-role rates shown on the dashboard.
- `data/roster.json` — the 50-person roster (`ser`, `name`, `phone`, `quals`, `remark`).

Edit these JSON files and redeploy — the dashboard stat tiles, rate table, and the
full roster (with auto-generated target roles + covering emails) update from them.
Target roles and covering-email copy are generated from each person's `quals` by
`assets/js/profile.js`.

## Job Finder (Firecrawl) — key stays server-side
`netlify/functions/search.js` proxies search requests to Firecrawl. The browser
posts `{ query, location?, limit? }` to `/.netlify/functions/search`; the function
adds the API key from the environment and returns normalised results. **The key is
never sent to the browser.**

Set the key in Netlify: **Site settings → Environment variables**
```
FIRECRAWL_API_KEY = fc-xxxxxxxxxxxxxxxx
```

## Deploy to Netlify
1. Connect this repository in Netlify (**Add new site → Import an existing project**).
   Build settings are read from `netlify.toml` (publish `.`, functions `netlify/functions`).
2. Add the `FIRECRAWL_API_KEY` environment variable.
3. Deploy. The dashboard is served at the site root.
4. **Domain:** point `infinitypax.info` (or a subdomain) at the site under
   **Domain management** and follow Netlify's DNS instructions.

### Local preview
```bash
# static pages + JSON fetch
npx serve .            # or: python3 -m http.server
# with the search function working:
npm i -g netlify-cli && netlify dev
```
Opening the HTML files directly from disk (`file://`) will not load the `data/*.json`
files — use a local server.

## Notes
- Roster edits (per-person target email) persist in the visitor's browser
  (`localStorage`, key `ip_roster_emails_v1`). For shared, multi-user editing,
  move roster/rates to a hosted store or CMS (a v2 step).
- No build step and no runtime dependencies; the function uses the platform's
  built-in `fetch` (Node 18+).
