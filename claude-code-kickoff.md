# Card Trading Engine — Claude Code Kickoff Prompt

Paste this entire prompt into Claude Code to bootstrap the project.

---

## Project overview

Build the **Card Trading Engine** — a two-sided platform for discovering underpriced trading cards on eBay and generating optimised eBay listings. We're starting with **Phase 1: Deal Finder MVP**.

There are two reference HTML mockups in the project (`deal-finder.html` and `dashboard.html`) that define the full UI, UX flow, data model, and visual design. Treat these as the source of truth. Do not redesign — implement them faithfully as a working application.

---

## Tech stack

### Frontend
- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- React components for all UI — deal finder, watchlist, results, dashboard charts

### API layer
- **Next.js API routes** handle everything: external API calls, business logic, database writes
- The browser never calls external APIs or the database directly
- All eBay, TCG, Anthropic SDK calls happen server-side only

### Database
- **Supabase** — hosted PostgreSQL
- **Drizzle ORM** — type-safe, SQL-close query layer, handles migrations
- No direct browser-to-database calls at any phase

### Background jobs (Phase 3)
- **node-cron** running inside the persistent Next.js process on Railway
- Scheduled watchlist scans and daily price snapshots
- No separate job queue service needed

### MCP server (Phase 3)
- **TypeScript MCP server** exposing eBay, TCG, and Claude as tools
- Claude orchestrates the full scan and listing flow autonomously
- User only reviews and approves final output

### Auth (SaaS phase — not Phase 1)
- **Clerk** — drop-in auth for Next.js, protects API routes, handles sessions and social login
- Skip entirely for now; add when opening to the public

### Hosting
- **Vercel** — Phase 1 & 2 (serverless, zero-config, free tier)
- **Railway** — Phase 3+ (persistent Node.js server required for node-cron)
- **Supabase** — database hosting throughout all phases

---

## Data flow

```
Browser (React UI)
  → Next.js API routes (business logic, deal algorithm)
    → Drizzle → Supabase PostgreSQL
    → eBay Browse API          (Phase 1: fetch listings)
    → eBay Sell API            (Phase 2: publish listings)
    → TCG API                  (Phase 1+: card catalog, market prices)
    → Anthropic SDK / Claude   (Phase 2: listing generation)

Phase 3 additions (Railway — persistent server):
  node-cron (inside Next.js process)
    → triggers scheduled watchlist scans
  TypeScript MCP server
    → exposes eBay + TCG + Claude as tools
    → Claude orchestrates autonomously
```

---

## Design system

Preserve the design language from the mockups throughout:

- **Fonts**: Fraunces (serif, headings + large numbers), DM Mono (monospace, prices/labels/codes), DM Sans (body/UI)
- **Colours**: teal (`#0F6E56` / `#1D9E75` / `#E1F5EE`), amber, coral, purple, gray — full CSS custom properties defined in the mockup `:root`
- **Surface**: white cards with `0.5px` borders, `#faf9f6` page background
- **Icons**: Tabler Icons webfont (outline only)
- **Charts**: Chart.js 4.4.x

---

## Phase 1 scope — Deal Finder MVP

### 1. Card lookup (structured, not open-ended)

No free-text search. All lookups go through a structured cascade:

1. Game selector — Pokémon, One Piece, Sports Cards
2. Set selector — populated from TCG API based on game
3. Card search within set — by name OR card number
4. Card preview — shows name, number, set, rarity, TCG market price
5. Condition selector — NM / LP / MP / HP
6. "Add to watchlist" — only enabled once a card is confirmed

This ensures every listing maps to a known card with a TCG market price. Open-ended searches are not supported.

### 2. Watchlist

- Persist to database (survives page refresh)
- Maximum 20 cards
- Prevent duplicate entries (same card + same condition)
- Visual slot counter with progress bar, warns at 80% capacity
- Remove individual cards

### 3. Scan engine

- One eBay Browse API query per watchlist card
- Run 5 queries concurrently (rate-limit cap)
- Query is constructed automatically from card identity — never from user-typed text:
  `"{cardName}" "{set}" "{cardNumber}"`
  Condition maps to eBay's condition filter ID, not the query string
- Fetch TCG market price per card in parallel

### 4. Deal algorithm

Applied to every eBay listing returned. Implemented as a pure function in `lib/deal-algorithm.ts`:

```typescript
const EBAY_FEE = 0.1325;  // fixed platform cost
const PAY_FEE  = 0.03;    // fixed platform cost

function shippingTier(listingPrice: number): number {
  if (listingPrice >= 100) return 8.00;   // signature required
  if (listingPrice >= 40)  return 5.50;
  return 3.00;
}

export function calcDeal(listingPrice: number, tcgMarket: number) {
  const sellAt   = tcgMarket * 0.85;       // conservative sell target
  const ebayFee  = sellAt * EBAY_FEE;
  const payFee   = sellAt * PAY_FEE;
  const shipping = shippingTier(listingPrice);
  const profit   = sellAt - ebayFee - payFee - shipping - listingPrice;
  const margin   = (profit / sellAt) * 100;
  return { sellAt, ebayFee, payFee, shipping, profit, margin };
}

export function isDeal(margin: number, minMargin: number): boolean {
  return margin >= minMargin;
}
```

**Fixed costs (not user-configurable):** eBay seller fee (13.25%), payment processing (3.00%), shipping tiers.
**One user control:** minimum margin threshold (slider, 10–60%, step 5%, default 30%).

### 5. Results UI

- Grouped by card, each group collapsible
- Default view: Deals only — cards with zero deals hidden entirely
- "All" tab reveals pass listings
- Filter by listing type: All / BIN / Auction
- Each group header: card name, set, number, TCG price, condition, best profit (+$XX), deal count badge
- First group with deals auto-expands on scan
- Each listing row: Deal/Pass badge, condition, listing type, shipping tier, title, listed price, TCG market, est. sell, sales/30d, profit, margin
- Auction caveat: "margin shown at current bid"
- Expandable cost breakdown per listing
- "View on eBay" links to live listing

### 6. Dashboard (read from stored scan data)

- Summary stats: cards tracked, active deals, best margin, avg margin
- Trend chart: TCG market price vs avg eBay listing — switchable per card
- Opportunity ranking: watchlist sorted by best margin
- Price momentum: 30d TCG market change with Hot / Rising / Cooling signals
- Scatter plot: listing price vs TCG market (below diagonal = deal)
- Bar chart: deal count per card

To power trends and momentum, store a daily price snapshot per watchlist card.

---

## API integrations

### eBay Browse API
- **Purpose**: active listings and sold comps
- **Auth**: OAuth 2.0 client credentials (app token — read-only, no user login needed)
- **Key endpoint**: `GET /buy/browse/v1/item_summary/search`
- **Query construction**: `q="{cardName}" "{set}" "{cardNumber}"`, condition via `filter` param
- **Rate limit**: 5,000 calls/day — 5-concurrent cap keeps us well under
- **Docs**: https://developer.ebay.com/api-docs/buy/browse/overview.html
- **Env vars**: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_MARKETPLACE_ID=EBAY_US`

### TCG API (tcgapi.dev)
- **Purpose**: card catalog (sets, cards per set), market and low prices for 89+ TCG games
- **Auth**: API key header
- **Rate limit**: 100 calls/day free tier — cache all responses for 24h minimum
- **Docs**: https://tcgapi.dev/docs
- **Env vars**: `TCG_API_KEY`

### Sports card pricing
- TCGPlayer equivalent doesn't exist for sports cards. Research **Card Ladder** or **130point** at setup time and recommend the best available free/low-cost option. Flag as TODO if no suitable option exists.

### Anthropic SDK (Phase 2)
- **Purpose**: generate optimised eBay listing titles, descriptions, pricing, item specifics
- **Model routing**:
  - `claude-haiku-4-5` — bulk commons under $5
  - `claude-sonnet-4-6` — standard singles $5–$100 (default)
  - `claude-opus-4-7` — graded slabs and vintage $100+
- **Prompt pattern**: system prompt (listing skill) + card data + sold comps as few-shot examples → JSON output: `{ title, price, description, item_specifics }`
- **Env vars**: `ANTHROPIC_API_KEY`

---

## Database schema

```typescript
// schema/watchlist.ts
export const watchlistCards = pgTable('watchlist_cards', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  game:       text('game').notNull(),          // 'pokemon' | 'onepiece' | 'sports'
  set:        text('set').notNull(),
  cardNumber: text('card_number').notNull(),
  cardName:   text('card_name').notNull(),
  rarity:     text('rarity').notNull(),
  condition:  text('condition').notNull(),     // 'NM' | 'LP' | 'MP' | 'HP'
  tcgMarket:  real('tcg_market').notNull(),
  tcgLow:     real('tcg_low').notNull(),
  createdAt:  timestamp('created_at').defaultNow(),
});

// schema/snapshots.ts — daily price history, powers dashboard trends
export const priceSnapshots = pgTable('price_snapshots', {
  id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cardId:          text('card_id').notNull().references(() => watchlistCards.id, { onDelete: 'cascade' }),
  tcgMarket:       real('tcg_market').notNull(),
  avgEbayListing:  real('avg_ebay_listing'),
  dealCount:       integer('deal_count').default(0),
  takenAt:         timestamp('taken_at').defaultNow(),
});

// schema/scan-results.ts
export const scanResults = pgTable('scan_results', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cardId:       text('card_id').notNull().references(() => watchlistCards.id, { onDelete: 'cascade' }),
  listingId:    text('listing_id').notNull(),   // eBay item ID
  title:        text('title').notNull(),
  price:        real('price').notNull(),
  condition:    text('condition').notNull(),
  listingType:  text('listing_type').notNull(), // 'bin' | 'auction' | 'both'
  sold30:       integer('sold_30'),
  netProfit:    real('net_profit').notNull(),
  margin:       real('margin').notNull(),
  isDeal:       boolean('is_deal').notNull(),
  ebayUrl:      text('ebay_url').notNull(),
  scannedAt:    timestamp('scanned_at').defaultNow(),
});
```

---

## Project structure

```
card-trading-engine/
├── app/
│   ├── layout.tsx                 # root layout, nav
│   ├── page.tsx                   # redirect → /deal-finder
│   ├── deal-finder/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   └── api/
│       ├── watchlist/
│       │   ├── route.ts           # GET list, POST add card
│       │   └── [id]/route.ts      # DELETE card
│       ├── scan/
│       │   └── route.ts           # POST trigger scan
│       ├── sets/
│       │   └── route.ts           # GET sets by game
│       └── cards/
│           └── route.ts           # GET cards within a set
├── components/
│   ├── deal-finder/
│   │   ├── CardLookup.tsx
│   │   ├── Watchlist.tsx
│   │   ├── ScanResults.tsx
│   │   ├── ResultCard.tsx
│   │   └── CostBreakdown.tsx
│   └── dashboard/
│       ├── StatsRow.tsx
│       ├── TrendChart.tsx
│       ├── OpportunityRank.tsx
│       ├── MomentumRank.tsx
│       ├── ScatterChart.tsx
│       └── DealBarChart.tsx
├── lib/
│   ├── ebay.ts                    # eBay Browse + Sell API client
│   ├── tcg.ts                     # TCG API client + 24h cache
│   ├── deal-algorithm.ts          # calcDeal(), isDeal()
│   └── query-builder.ts           # builds eBay search query from card identity
├── db/
│   ├── index.ts                   # Drizzle client
│   └── schema/
│       ├── watchlist.ts
│       ├── snapshots.ts
│       └── scan-results.ts
├── drizzle.config.ts
├── .env.local                     # API keys — gitignored
├── deal-finder.html               # UI reference mockup
└── dashboard.html                 # UI reference mockup
```

---

## Environment variables

```env
# eBay
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_MARKETPLACE_ID=EBAY_US

# TCG API
TCG_API_KEY=

# Anthropic (Phase 2)
ANTHROPIC_API_KEY=

# Database
DATABASE_URL=            # Supabase PostgreSQL connection string

# App
NEXT_PUBLIC_DEFAULT_MIN_MARGIN=30
```

---

## Build sequence

Complete each step before moving to the next.

1. **Scaffold** — Next.js app, TypeScript, Tailwind, Drizzle + Supabase, folder structure, env setup
2. **Design system** — CSS custom properties, font imports, shared styles matching the mockups
3. **Database** — schema files, Drizzle migrations, verify connection to Supabase
4. **Nav + layout** — sticky nav linking Deal finder ↔ Dashboard
5. **Card lookup UI** — game → set → card selectors with card preview and condition picker (mocked data first)
6. **Watchlist UI** — add/remove/persist cards, slot counter, duplicate prevention
7. **TCG API** — real sets and cards populating the selectors, 24h cache layer
8. **eBay API** — OAuth token fetch, query builder, listing parser
9. **Deal algorithm** — wire `calcDeal()` to real listing data, store scan results
10. **Results UI** — collapsible groups, deal/pass badges, type filters, breakdown, eBay links
11. **Dashboard** — Chart.js charts wired to database (price snapshots, scan results)
12. **Daily snapshot** — Drizzle upsert storing TCG price + avg eBay listing per card per day

**Phase 3 (later):**
13. Migrate hosting to Railway (persistent Node.js server)
14. Add `node-cron` for scheduled scans inside the Next.js process
15. Build TypeScript MCP server exposing eBay + TCG + Claude as tools

---

## Key decisions — locked in, do not revisit

- **No open-ended card search** — game → set → card number/name only. Every listing maps to a known card with a TCG price.
- **No browser-to-database calls** — everything goes through Next.js API routes.
- **eBay fees are fixed** — 13.25% + 3.00%. Platform constants, not user settings.
- **Shipping is tiered** — $3 / $5.50 / $8 by listing price. Not a user input.
- **One user control** — minimum margin threshold, default 30%.
- **Passes hidden by default** — Deals view is the default. All tab available.
- **Watchlist cap** — 20 cards. Warn at 16+.
- **Scan concurrency** — 5 parallel eBay queries maximum.
- **TCG API caching** — 24h minimum (100 calls/day free tier).
- **Sell price assumption** — 85% of TCG market price.
- **No auth in Phase 1** — single-user local use. Clerk added when going public.
- **No .NET backend** — workload is I/O-bound; Next.js API routes are sufficient throughout.
- **Vercel → Railway migration** — triggered by Phase 3, when node-cron requires a persistent process.

---

## Phase 2 preview (listing agent — do not build yet)

1. User selects a card they own from inventory
2. Fetch recent eBay sold comps for that card
3. Fetch TCG market pricing
4. Call Claude API with listing skill prompt — comps are the few-shot examples
5. Claude returns JSON: `{ title, price, description, item_specifics }`
6. Review UI — user can edit any field
7. Approve → publish via eBay Sell API (OAuth user token, separate from Browse API app token)

Model routing: Haiku for <$5, Sonnet for $5–$100, Opus for $100+.

---

## Reference files

- `deal-finder.html` — complete deal finder UI with all interactions working (mock data)
- `dashboard.html` — complete dashboard with Chart.js charts

When in doubt about layout, spacing, colours, or interactions, open these files. The goal is a faithful implementation, not a reinterpretation.
