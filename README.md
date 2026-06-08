# Card Trading Engine

A two-sided platform for discovering underpriced trading cards on eBay and generating optimised eBay listings — powered by real market data and AI-assisted content generation.

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design, data flow, deal algorithm, schema, and API details.

---

## Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | **Deal Finder** — scan eBay for underpriced cards vs. TCG market price | ✅ Built |
| 2 | **Listing Agent** — generate optimised eBay listings via Claude API | Planned |
| 3 | **MCP Automation** — Claude orchestrates APIs autonomously via MCP server | Planned |

---

## Tech stack

| Layer | Tool |
|-------|------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| API | Next.js API Routes (server-side only) |
| Database | Supabase (PostgreSQL) via Drizzle ORM |
| Charts | Chart.js 4 + react-chartjs-2 |
| AI (Phase 2) | Anthropic SDK — claude-sonnet-4-6 default |
| Auth (SaaS phase) | Clerk (not yet added) |
| Hosting | Vercel (Phase 1–2) → Railway (Phase 3) |

---

## Quick start

```bash
npm install --legacy-peer-deps

cp .env.local.example .env.local   # fill in values — see Environment variables below

npm run db:generate                # generate migration from schema
npm run db:migrate                 # apply to Supabase (requires DATABASE_URL)

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/deal-finder`.

**The app runs without any env vars** using mock data. Add real keys progressively:

1. `DATABASE_URL` → watchlist and scan results persist
2. `TCG_API_KEY` → real card catalog (sets, prices) from tcgapi.dev
3. `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` → live eBay listings

---

## Environment variables

```env
# eBay Browse API — https://developer.ebay.com
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_MARKETPLACE_ID=EBAY_US

# TCG API — https://tcgapi.dev (100 calls/day free tier, responses cached 24h)
TCG_API_KEY=

# Anthropic SDK — Phase 2 only
ANTHROPIC_API_KEY=

# Supabase PostgreSQL connection string
DATABASE_URL=

# App defaults
NEXT_PUBLIC_DEFAULT_MIN_MARGIN=30
```

---

## Project structure

```
arbitrage/
├── app/
│   ├── layout.tsx                 # Root layout + nav
│   ├── page.tsx                   # Redirect → /deal-finder
│   ├── deal-finder/page.tsx       # Deal finder page
│   ├── dashboard/page.tsx         # Dashboard page
│   └── api/
│       ├── watchlist/route.ts     # GET list · POST add
│       ├── watchlist/[id]/route.ts# DELETE card
│       ├── scan/route.ts          # POST trigger scan
│       ├── sets/route.ts          # GET sets by game
│       ├── cards/route.ts         # GET cards in set
│       ├── top-movers/route.ts    # GET price movers (gainers/losers, period, game)
│       └── dashboard/route.ts     # GET aggregated dashboard data
├── components/
│   ├── NavBar.tsx
│   ├── deal-finder/
│   │   ├── CardLookup.tsx         # Game → set → card cascade
│   │   ├── Watchlist.tsx          # Slot counter, margin slider, scan trigger
│   │   ├── ScanResults.tsx        # Collapsible groups, deal/pass filters
│   │   ├── ResultCard.tsx         # Individual listing row
│   │   └── CostBreakdown.tsx      # Expandable fee breakdown
│   ├── ui/
│   │   └── Lightbox.tsx           # Full-screen card image overlay
│   └── dashboard/
│       ├── StatsRow.tsx
│       ├── TrendChart.tsx         # TCG price vs avg eBay — Chart.js line
│       ├── TopMovers.tsx          # Market movers widget (24h/7d/30d, game filter)
│       ├── OpportunityRank.tsx    # Cards ranked by best margin
│       ├── MomentumRank.tsx       # 30d TCG price change
│       ├── ScatterChart.tsx       # Listing price vs TCG market scatter
│       └── DealBarChart.tsx       # Deal count per card bar chart
├── lib/
│   ├── deal-algorithm.ts          # calcDeal(), isDeal() — pure functions
│   ├── query-builder.ts           # Builds eBay search query from card identity
│   ├── ebay.ts                    # OAuth token cache + Browse API client
│   └── tcg.ts                     # TCG API client + 24h in-memory cache
├── db/
│   ├── index.ts                   # Lazy Drizzle client
│   └── schema/
│       ├── watchlist.ts           # watchlist_cards table
│       ├── snapshots.ts           # price_snapshots table (daily)
│       └── scan-results.ts        # scan_results table
└── docs/                          # Project documentation
```
