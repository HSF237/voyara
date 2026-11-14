# Voyara

**Other apps make you a plan. Voyara keeps it working** — even when the weather, the crowd, or your
friends change their minds.

A travel-planner PWA built for the 6th International Digital Fest 2027 (Asia Pacific University,
Kuala Lumpur).

> **Status: Milestones 1–3 of 12** — design system, the 3D-globe landing page, and trip setup with
> live destination search, exchange rates and forecast. See [Milestones](#milestones).

## Run it

Needs Node 20.19 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                           |
| `npm run build`     | Type-check, then production build into `dist/`       |
| `npm run preview`   | Serve the production build locally                   |
| `npm run test`      | Unit tests (Vitest + Testing Library)                |
| `npm run lint`      | ESLint, including accessibility rules                |
| `npm run typecheck` | TypeScript in strict mode                            |
| `npm run check`     | Everything above in one go — run before every commit |
| `npm run format`    | Prettier                                             |

Copy `.env.example` to `.env.local`. Nothing is required yet: destination search, rates and the forecast work without keys.

## What works today

| Page            | What it does                                                                          |
| --------------- | ------------------------------------------------------------------------------------- |
| `/`             | 3D globe with flight arcs; search a destination and the globe flies to it and pins it |
| `/plan/new`     | Trip setup on one screen: destination, dates, travellers, budget, pace, interests     |
| `/plan/:tripId` | A saved trip: its trip pass, local time, exchange rate and forecast                   |
| `/settings`     | Language, theme, home currency and units — saved on the device                        |
| `/design`       | Every colour, type size and component, for checking light / dark / RTL                |

Trip setup is built from custom widgets: a destination autocomplete, a date-range calendar with
a day-and-night strip, a traveller stepper with a line-up of figures, a budget slider with live
conversion to the destination's currency, a pace picker that draws a typical day, and a boarding
pass that fills in as you choose.

### Live data, no key needed

| Data               | Source                                       | Notes                                      |
| ------------------ | -------------------------------------------- | ------------------------------------------ |
| Destination search | Open-Meteo geocoding (GeoNames)              | Falls back to MapTiler if it is down       |
| Exchange rates     | Frankfurter v2                               | Last rates are kept on the device          |
| Forecast           | Open-Meteo, 16 days                          | Daily for now; hourly comes in Milestone 7 |
| Country → currency | Bundled table (`src/lib/countryCurrency.ts`) | Works offline                              |

Every response is validated (`src/services/http.ts`) before the app uses it, with timeouts,
one retry and a typed error, so a failing service shows a clear message instead of breaking a
screen.

### 3D and motion

- The globe (`src/features/landing/globe`) is React Three Fiber with custom shaders: dotted
  continents generated from Natural Earth coastlines, an atmosphere glow, animated flight arcs and
  a pin that drops on the chosen place. Drag to spin it.
- three.js loads only after the page is interactive. Devices without WebGL, with two or fewer CPU
  cores, or in data-saver mode get a still CSS globe instead.
- GSAP ScrollTrigger and Lenis drive the scroll story and load with it, below the fold.
- `prefers-reduced-motion` gives a static globe and fades only.

## Stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS v4 · Framer Motion · React Three Fiber ·
GSAP + Lenis · React Router · Zustand · TanStack Query · i18next · Zod · date-fns · Vitest. Backend: Vercel serverless functions in `/api`
plus Firebase (from Milestone 3 and 8).

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[Screens<br/>src/features] --> DS[Design system<br/>src/components/ui]
    UI --> Store[Zustand stores<br/>src/store]
    UI --> Query[TanStack Query cache]
    Query --> Services[Typed service clients<br/>src/services]
  end
  Services -->|public, no key| Open[Open-Meteo · Frankfurter<br/>Nager.Date · REST Countries<br/>Wikipedia · Overpass]
  Services -->|/api/*| Fn[Vercel functions<br/>secrets stay here]
  Fn --> AI[Gemini / Claude]
  Fn --> Places[OpenTripMap · Google Places]
  Fn --> Routes[OpenRouteService]
  UI --> Firebase[(Firebase Auth + Firestore)]
```

The rule that shapes everything: **the AI never invents a place.** It only picks, orders and
explains places that came from a data source, and a deterministic optimiser checks its work.

## Folder structure

```
voyara/
  api/                 Vercel functions (ai, places, route) + prompts      ← Milestone 3+
  public/              favicon, robots.txt, boot.js (pre-paint theme/lang)
  scripts/             seed-curated.ts, build-demo-cache.ts                ← Milestone 10
  src/
    app/               router, providers, layout, error screens, settings sync
    components/ui/     the design system
    features/          one folder per screen (landing, settings, design, …)
    lib/               cn, env, locale helpers, i18n (+ locales/*.json)
    services/          data-source clients                                 ← Milestone 3
    store/             Zustand stores
    styles/            index.css — all design tokens live here
  tests/               unit tests
```

## Design system

Everything visual comes from the tokens at the top of `src/styles/index.css`. Components never
mention a hex value or "dark" — they use utilities such as `bg-surface`, `text-muted`,
`border-line`, and the theme swaps the variables underneath.

- **Colours** — warm paper background, deep tropical green primary, sand-gold accent. Stock
  Tailwind colours are switched off, so nothing off-palette can sneak in.
- **Type** — Fraunces for headlines (`font-display`), Plus Jakarta Sans for UI. Scale:
  12 / 14 / 16 / 20 / 24 / 32 / 48 / 64 (`text-xs` … `text-4xl`).
- **Shape** — radii 10 / 14 / 18 / 24 px, three soft shadow levels.
- **Components** (`src/components/ui`) — Button, IconButton, Chip, Card, Badge, Avatar,
  AvatarGroup, Tabs, Slider, Segmented, Select, Skeleton, Modal, Sheet, Toast.

Two things differ from the original brief, both for accessibility:

- Muted text is `#5F6773`, not `#6B7280`. The original is 4.44:1 on the paper background, just
  under the 4.5:1 WCAG AA needs.
- Each brand colour has an `-ink` partner (`sky-ink`, `accent-ink`, …) for text. Raw sky blue and
  gold are too light to read as text on paper.

`tests/tokens.contrast.test.ts` reads the real values from the CSS and fails if any pairing drops
below AA.

### Accessibility built in

- Modal and Sheet trap focus, close on Escape, return focus to the trigger and make the page
  behind inert.
- Tabs use arrow keys / Home / End, mirrored in right-to-left.
- Slider, Select and Segmented are native inputs underneath.
- `prefers-reduced-motion` is honoured globally: fades only, no movement.

## Languages

English, Malay, Malayalam, Hindi, Arabic (right-to-left) and Tamil.

- Strings live in `src/lib/i18n/locales/<code>.json`. English is bundled; the others load on
  demand, along with the right script font.
- To add a string: add the key to **every** file. `tests/i18n.locales.test.ts` fails if any
  language is missing a key or a `{{placeholder}}`.
- Layout uses logical properties (`ps-`, `pe-`, `start-`, `end-`), so Arabic mirrors without
  special cases.
- The translations were written by an AI. Have a native speaker read each one before the fest.

## Environment variables

See `.env.example` for the full, commented list. In short:

| Variable                                       | Where            | For                            |
| ---------------------------------------------- | ---------------- | ------------------------------ |
| `VITE_FIREBASE_*` (6 values)                   | Browser          | Auth, Firestore                |
| `VITE_MAPTILER_KEY`                            | Browser          | Map tiles, geocoding           |
| `VITE_APP_URL`                                 | Browser          | Share links, QR, Open Graph    |
| `AI_PROVIDER`, `GEMINI_*`, `ANTHROPIC_*`       | Server           | `/api/ai`                      |
| `OPENTRIPMAP_API_KEY`                          | Server           | `/api/places`                  |
| `ORS_API_KEY`                                  | Server           | `/api/route`                   |
| `NOMINATIM_USER_AGENT`                         | Server           | Fallback geocoder              |
| `GOOGLE_PLACES_API_KEY`, `UNSPLASH_ACCESS_KEY` | Server, optional | Richer details, photo fallback |
| `FIREBASE_SERVICE_ACCOUNT`                     | Local only       | Seed script                    |

`VITE_` values ship to the browser and are public by design. The MapTiler key cannot be hidden
(the browser fetches tiles directly), so restrict it to your domains in the MapTiler dashboard.
Everything else stays on the server.

## Data sources and credits

Wired up from Milestone 3. Each will be credited in the place sheet and on a "Data sources" page.

| Data            | Source                                         |
| --------------- | ---------------------------------------------- |
| Maps, geocoding | MapTiler, OpenStreetMap contributors           |
| Places          | OpenTripMap, Overpass API (OpenStreetMap)      |
| Descriptions    | Wikipedia, Wikivoyage                          |
| Photos          | Wikimedia Commons, Unsplash                    |
| Routing         | OpenRouteService                               |
| Weather         | Open-Meteo                                     |
| Currency        | Frankfurter                                    |
| Public holidays | Nager.Date                                     |
| Country basics  | REST Countries (v5) — planned for Milestone 10 |

Fonts: Fraunces, Plus Jakarta Sans and Noto Sans (SIL Open Font License), self-hosted via
Fontsource so they work offline. Icons: Lucide (ISC).

## Deploy

Import the repo in Vercel. `vercel.json` already sets the Vite preset and the single-page-app
rewrite. Add the server variables from `.env.example` in the Vercel dashboard.

## Milestones

1. ✅ Project setup, design system, theming, routing, i18n skeleton, `.env.example`
2. ✅ Landing page with 3D globe and scroll story
3. ✅ Trip setup and data services (places arrive with the swipe deck)
4. Swipe deck with real places
5. Plan view: AI planner, optimiser, timeline, map, drag reorder
6. Place sheet, budget meter, conflict warnings, AI chat edits
7. Live re-planning and demo controls
8. Group mode (Firestore real-time, QR)
9. Trip-day mode and offline PWA
10. Local smarts panel, curated Malaysia and Kerala data
11. Share page, PDF and calendar export, My trips
12. Polish: animation, accessibility, performance, tests, deploy
