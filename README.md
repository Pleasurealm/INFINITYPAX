# Infinity Pax — Capability Dashboard

A static, multi-page web app for **Infinity Pax**, an ex-forces-led security &
estate-services workforce serving luxury retail, hospitality, private homes and
high-net-worth clients. Deploys to Netlify with one serverless function for the
Job Finder.

## Pages
| File | Purpose |
|------|---------|
| `index.html` | **Capability Dashboard** — stat tiles, rate-tier toggle, covering email (Copy Email) |
| `jobsearch.html` | **Team Job Search** — all 50 seekers, each with a tailored, editable query, one-click **live** Firecrawl search, and a copy-ready covering email; "Search all shown" bulk action |
| `team.html` | **Team Roster** — 50-person roster with search/filter, per-person target-employer email (saved to the browser), and copy-ready covering emails |
| `statement.html` | **Capability Statement** — print/PDF letterhead version |
| `jobfinder.html` | **Single Job Finder** — one live web search via a Netlify Function (Firecrawl) |

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

## Access control (sign-in gate)
The **Capability Dashboard** and **Capability Statement** are public marketing
pages. The **jobs** — Team Job Search, Team Roster, Single Job Finder — are
**restricted**: a visitor must sign in before any job/roster data is served.

- **Team members** sign in with **full name + mobile** (must match the Infinity Pax
  roll) **+ email**, then confirm a **6-digit code emailed to them** from
  `accounts@infinitypax.london`. Only names/mobiles on `data/roster.json` are accepted.
- **Mithu / Admin** sign in with an **admin passcode** (no email step) and get the
  admin role (identity: Mithulal Bishwakarma · mi@infinitypax.london).
- Enforcement is **server-side**: `netlify/functions/roster.js` returns the roster
  only for a valid signed session; the raw `data/roster.json` is blocked from the
  public site (`netlify.toml` redirect). The client overlay (`assets/js/auth.js`)
  is the UX layer.

Functions: `auth-request.js` (validate + email code), `auth-verify.js` (check code →
session), `auth-admin.js` (passcode → admin session), `roster.js` (protected data).
Sessions are stateless HMAC tokens (no database), valid ~12h.

**Email:** verification codes are sent via **Resend**. The domain `infinitypax.london`
must be verified in Resend so mail can be sent from `accounts@infinitypax.london`.

## Environment variables (Netlify → Site settings → Environment variables)
| Key | Purpose |
|-----|---------|
| `FIRECRAWL_API_KEY` | Live job search (Firecrawl). |
| `AUTH_SECRET` | Secret for signing sign-in/session tokens. Use a long random string. |
| `RESEND_API_KEY` | Sending verification emails via Resend. |
| `ADMIN_PASSCODE` | Passcode for Mithu / Admin sign-in. |
| `AUTH_FROM` | *(optional)* Sender, default `Infinity Pax <accounts@infinitypax.london>`. |
| `ADMIN_EMAIL` / `ADMIN_NAME` | *(optional)* Admin identity, default `mi@infinitypax.london` / `Mithulal Bishwakarma`. |

## Deploy to Netlify
1. Connect this repository in Netlify (**Add new site → Import an existing project**).
   Build settings are read from `netlify.toml` (publish `.`, functions `netlify/functions`).
2. Add the environment variables above (at minimum `AUTH_SECRET`, `RESEND_API_KEY`,
   `ADMIN_PASSCODE`, `FIRECRAWL_API_KEY`).
3. Verify `infinitypax.london` in **Resend** so `accounts@infinitypax.london` can send.
4. Deploy. Public pages at the site root; the jobs pages prompt for sign-in.
5. **Domain:** point `infinitypax.info` (or a subdomain) at the site under
   **Domain management**.

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
