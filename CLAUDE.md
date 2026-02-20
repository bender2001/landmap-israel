# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LandMap Israel — premium PropTech MVP for land investments in Israel. Digital land brokerage where buyers never see seller details; all leads go through the platform. Hebrew-first (RTL), dark-themed UI.

## Commands

```bash
# Full-stack dev (client + server concurrently)
npm run dev

# Client only (Vite dev server on :5173)
npm run dev:client

# Server only (Express on :3001, with --watch)
npm run dev:server

# Production build (client only — outputs to client/dist)
npm run build

# Seed database
npm run seed

# Type-check client (no emit)
cd client && npx tsc --noEmit
```

No test framework is configured. No linter is configured.

## Architecture

**Monorepo** with two packages (`client/` and `server/`) and a root `package.json` for orchestration.

### Client — React 18 + TypeScript + Vite

Consolidated into ~23 files (~3,500 lines). All pages are lazy-loaded via `React.lazy()`.

**Key modules and their roles:**
- `theme.ts` — Design tokens exported as `t`, `media` breakpoint helpers, `GlobalStyles` (includes all Leaflet dark-theme overrides)
- `types.ts` — All TypeScript interfaces (`Plot`, `Lead`, `Poi`, `Filters`, etc.)
- `utils.ts` — Plot field accessor `p(plot)`, ROI calculator `roi(plot)`, formatters `fmt.*`, investment score/grade/CAGR/timeline calculators, geo helpers
- `api.ts` — Thin fetch wrapper around `/api/*` endpoints (plots, leads, market, auth, admin)
- `hooks.tsx` — All React hooks + `AuthProvider` context. API hooks fallback to mock data (`data.ts`) when the server is unavailable
- `data.ts` — 3 hardcoded mock plots + POIs + chat messages for offline dev

**Plot dual-field convention:** The `Plot` interface has both camelCase (`totalPrice`) and snake_case (`total_price`) fields. The accessor `p(plot)` normalizes this: always use `p(plot).price`, `p(plot).size`, etc. The function `normalizePlot()` converts camelCase mock data to snake_case for API compatibility.

### Server — Express 5 + Supabase + Node.js (ESM)

Plain JavaScript (`.js`, no TypeScript). Entry: `server/src/index.js`.

**Layers:**
- `routes/` — Express routers (public: plots, leads, chat, market, pois; admin: plots, leads, dashboard, documents, images, pois, activity, settings, analytics)
- `services/` — Business logic (plotService, leadService, chatService, emailService, cacheService, analyticsService, etc.)
- `middleware/` — auth (JWT), adminOnly, validate (zod), errorHandler, rateLimiter, timeout, sanitize
- `config/` — supabase client, claude (Anthropic SDK), email (Resend)
- `schemas/` — Zod validation schemas

The server proxies through Vite in dev (`/api` → `:3001`). In production it serves the built client from `client/dist/`.

### Database — Supabase (PostgreSQL)

Migrations in `supabase/migrations/`. Tables: plots, leads, pois, settings, and more.

### Deployment — Render

Config in `render.yaml`. Build: `npm run render-build`. Start: `npm start`.

## Environment Variables

See `.env.example`. Key vars:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — server DB access
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — client-side (Vite-exposed)
- `ANTHROPIC_API_KEY` — AI chat
- `RESEND_API_KEY`, `ADMIN_EMAIL` — email notifications
- `JWT_SECRET` — admin auth
- `PORT` (default 3001), `CLIENT_URL` (default http://localhost:5173)

## Styling Conventions

- **styled-components v6** — import theme tokens as `t` from `theme.ts`
- **Media queries** — use `media.sm`, `media.md`, `media.lg`, `media.mobile` from `theme.ts`
- **Colors** — Background: `#0B1120`, Surface: `#111827`, Gold accents: `#D4A84B` / `#F0C75E`, Text: `#F1F5F9` (primary), `#94A3B8` (secondary)
- **Glass morphism** — `backdrop-filter: blur()` with semi-transparent backgrounds
- **RTL** — `<html lang="he" dir="rtl">`. UI text is Hebrew.
- **Font** — Heebo (Google Fonts)
- **Icons** — `lucide-react`

## Library Version Constraints

- **react-leaflet v4** (NOT v5) — v5 requires React 19. Use `react-leaflet@^4.2.1` with `leaflet@^1.9.4`
- **React 18** (NOT 19) — the project uses React 18.3.x
- **styled-components v6** — the `styled.d.ts` file extends the theme type

## Map

Dark CARTO tiles. Plot polygons with glow effects (CSS `filter: drop-shadow`). Price tooltips. City cluster markers. POI markers with emoji icons. Map component is in `components/Map.tsx`.
