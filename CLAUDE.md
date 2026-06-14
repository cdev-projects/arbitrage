# Card Trading Engine — Claude Code Instructions

## Working files

Plans, summaries, and exploratory docs live in `.claude/workspace/` — gitignored, never committed. Save all Cowork and session working documents here, not in `docs/`.

When a plan produces a decision worth keeping, capture it into this file via `/capture` — not by committing the plan itself.

**Cowork note:** Cowork does not auto-load `~/.claude/CLAUDE.md` — any conventions that need to reach Cowork must live in this file. A redirect stub lives at `C:\Users\chris\Claude\Projects\arbitrage\CLAUDE.md` pointing Cowork to this canonical project path until the Cowork project path can be updated in settings.

## Documentation

- `README.md` — business context, quick start, high-level structure. Audience: humans.
- `ARCHITECTURE.md` — system design, diagrams, schema, API details, design decisions. Audience: engineers.
- `docs/context-system.html` — reference doc explaining the Claude context system (CLAUDE.md, memory, chat vs Code vs Cowork).
- `docs/ebay-scan.md` — full feature doc for the eBay scan: query strategy, field mapping, UI, known issues.

## Commands

```bash
npm run dev          # start dev server (Next.js + Turbopack)
npm run build        # production build
npm run lint         # ESLint
npm run test         # run unit tests (vitest)
npm run test:watch   # vitest in watch mode
npm run test:coverage # vitest with coverage report
npm run db:generate  # generate Drizzle migration files from schema changes
npm run db:migrate   # apply pending migrations to Supabase
npm run db:push      # push schema directly (dev/prototyping only — prefer generate+migrate)
npm run db:studio    # Drizzle Studio UI
```

## Database migrations

**Always use `db:generate` then `db:migrate` — never hand-edit `db/migrations/meta/_journal.json`.**
1. Edit the schema file(s) under `db/schema/`
2. `npm run db:generate` — creates a new migration file
3. `npm run db:migrate` — applies it to Supabase

`db:push` bypasses the migration journal and is only safe for throwaway local dev databases.

## Architecture invariants

- **Server-side only** — eBay, TCG API, Anthropic SDK, and Supabase are never called from the browser. Everything goes through Next.js API routes.
- **No open-ended card search** — lookups always flow game → set → card. Every listing maps to a known card with a TCG market price.
- **Fixed fee constants** — eBay 13.25%, payment 3.00%, shipping $3/$5.50/$8 by listing price. These are not user-configurable.
- **One user control** — minimum margin threshold (10–60%, step 5%, default 30%).
- **Sell price assumption** — 85% of TCG market price. Baked into `calcDeal()` in `lib/deal-algorithm.ts`.
- **Scan concurrency** — 5 parallel eBay queries max (rate-limit headroom against the 5,000 calls/day cap).
- **TCG API cache** — 24h in-memory cache; free tier is 100 calls/day.
- **No auth in Phase 1** — single-user local tool.

## eBay query strategy (`lib/query-builder.ts`)

3-tier waterfall per card — fall to the next tier only when a tier returns fewer than 3 results:

| Tier | Query shape | Confidence |
|------|-------------|------------|
| 1 | `"name" number -digital -lot -proxy -fake -reprint` | High |
| 2 | `"name" "set" pokemon/onepiece excl` | Medium |
| 3 | `"name" pokemon/onepiece tcg excl` + loose conditions + `excludeCategoryIds:{64482}` | Low (`isLowConfidence: true`) |

**Game-specific rules:**
- **Pokémon** — card number is the unique identifier; rarity term never needed. Language exclusions (`-Japanese -JP -Korean -KR`) applied at Tier 2/3 only — at Tier 1 the card number anchors to the EN print.
- **One Piece** — rarity term required for SEC/SR/Leader (`all tiers`) and R (`Tier 1 only`, dropped at Tier 2+ due to ambiguity). UC/C rarities omit rarity term entirely. EN and JP share card numbering, so `-Japanese -JP -Korean -KR` is applied at all tiers.
- **Card numbers unquoted** — eBay's search handles slash variants (`199/165`, `199 / 165`) naturally.
- **Price ceiling** — deal-math derived: `sellAt × (1 − eBayFee − payFee − minMargin/100) − $3`. Only fetches listings that could actually be deals at the user's `minMargin`. For a $100 card at 30% threshold: old ceiling $110 → new ceiling ~$43. `minMargin` is threaded from the scan POST body through `searchListings(card, tcgMarket, minMargin)` to `buildFilter`. Exported as `dealPriceCeiling(tcgMarket, minMargin)` in `lib/query-builder.ts`.
- **`BASE_EXCL`** — `-digital -lot -proxy -fake -reprint -sleeve -playmat -binder -tin -booster -altered`. Eliminates accessories and sealed product that match card names in eBay titles. Applied to all games at all tiers.
- **`CUSTOM_EXCLUSIONS`** env var — comma-separated terms appended to `BASE_EXCL` at runtime. Example: `CUSTOM_EXCLUSIONS=-"extended art",-sticker,-display`. Parsed in `lib/query-builder.ts`; takes effect without a code change.

**Token cache** — `globalThis.__ebayToken` survives Next.js serverless warm restarts. Invalidated 60 s before actual expiry.

**Per-card error isolation** — `scanCardSafe` in `app/api/scan/route.ts` wraps each card scan in try/catch. A failed card produces `{ listings: [], error: string }` instead of failing the whole scan. The `error` field surfaces in `ScanResults` as an error count in the fee strip.

**Tier 3 never isDeal** — `isLowConfidence` listings (Tier 3) are excluded from `isDeal` regardless of margin. They appear in the "All" tab with the "Broad search" badge as informational only. This prevents false positives from wrong-card or off-topic matches. Logic in `app/api/scan/route.ts`: `isDeal: isDeal(margin, minMargin) && !l.isLowConfidence`.

**`isEarlyAuction`** — an auction that would be a deal at current bid but closes more than 1 hour from now. Excluded from `isDeal` (bid price will move before close) and surfaced in a separate "Watching" amber tab. Logic: `wouldBeDeal && listingType === 'auction' && hoursUntilClose > 1`.

## eBay listing fields

`EbayListing` in `lib/ebay.ts` maps these Browse v1 fields:

| Field | Source | Notes |
|-------|--------|-------|
| `isGraded` | title regex `/PSA\|CGC\|BGS\|graded\|slab/i` | Post-fetch detection; graded cards are included, not excluded |
| `isLowConfidence` | set by query tier | `true` for Tier 3 results only |
| `listingImageUrl` | `item.image.imageUrl` with `s-l225` → `s-l500` swap | eBay listing photo at 500px quality; hover popup in ResultCard |
| `endsAt` | `item.itemEndDate` | ISO string; UI shows `Xd Yh` / `Xh Ym` / `Xm Ys` countdown, ticking live |
| `bidCount` | `item.bidCount` | Shown next to listing type pill when > 0 |
| `currentBidPrice` | `item.currentBidPrice.value` | Used as `price` for auctions — eBay's `price` field is only the starting price |
| `sellerFeedback` | `item.seller.feedbackScore` | Integer |

**Auction price** — `price` from eBay Browse v1 is the *starting bid* for auctions, not the current bid. `mapItems()` in `lib/ebay.ts` uses `currentBidPrice` as the effective price for auction and BIN+Auction listings.

**`sold30` is gone** — Browse v1 doesn't provide sold count. The `sold_30` DB column has been dropped.

## Design system

Matches the Fraunces / DM Mono / DM Sans design from the original mockups. CSS custom properties are defined in `app/globals.css`. Do not introduce new colour tokens or font families. Use the `--teal`, `--amber`, `--coral` etc. tokens that already exist.

## Card grid UX (CardGrid + CardLookup)

- **Hover-driven panel** — hovering a card shows a `position: fixed` popover (`.card-pick-pop`) with a details panel left and enlarged image right. No click required to open the panel.
- **Add button lives on the card** — hovering replaces the card's text area (`.vg-bottom`) with a compact `+ Add` button. The panel is purely informational (name, number, condition pills, price).
- **No selection state** — there is no "selected card" concept; `selectedId` and amber highlighting were intentionally removed. Hover is the only interaction surface before adding.
- **Leave timer** — a 160 ms `setTimeout` in `CardLookup` delays hiding the panel when the mouse leaves a card, cancelled on `mouseEnter` of the panel, so the user can move into the panel without it closing.
- **Consistent card height** — `.vg-cell` is `display: flex; flex-direction: column`. `.vg-bottom` is a fixed-height (40px) flex container holding either `.vg-info` or `.vg-add-btn`, preventing layout shift on hover.
- **Card info layout** — number (left) and market price (right) share a single flex row above the card name, reducing the card footer to two lines.
- **Slide animation** — only `.cpp-panel` animates (`cpp-panel-slide`, 0.55 s ease-out); the image half appears instantly so it covers the hover preview without a flash.
- **Panel styling** — `.cpp-panel` uses `--surface-secondary` background, Fraunces serif italic for the card name (matching `db-title`), DM Mono uppercase for the meta line (matching `db-eyebrow`), and teal for price/selected condition pill. This matches the "Build your watch list" header aesthetic.
- **Card default background** — `.vg-cell` uses `--bg` (warm off-white) against the white `--surface` panel container for a subtle but visible separation.
- **Add button styling** — matches `.btn-scan`: `--radius-md` corners, `--teal` background, `--teal-light` text, `#085041` hover. Sized to content (`padding: 5px 14px`), not full-width.

## Data conventions

- **`cleanName()`** in `lib/tcg.ts` strips artifacts the TCG API embeds in card names: trailing `NNN/NNN` numbers, promo codes like `SWSH050`, and trailing ` - `. Apply at the `toCard()` mapping layer, not in UI.
- **Price formatting** — always render prices with `.toFixed(2)`. Never interpolate a raw `number` into a price string.
- **DB naming** — DB tables and application layer are now aligned: `watchlists` table, `watchlist_id` FK column, `watchlist` everywhere in routes and TypeScript.

## Scan UI features

- **Watching tab** — amber tab separate from Deals. Shows `isEarlyAuction` listings (deal-quality but not yet closing). Countdown pill ticks live in seconds.
- **Age filter** — 24h / 48h / Off toggle on the scan page. Filters `visibleResults` by `scannedAt` timestamp returned from the scan API.
- **Image hover popup** — hovering the 40px thumbnail in a ResultCard shows a 400px popup. Viewport-aware: flips left if near the right edge, anchors bottom if near the bottom. Uses `opacity`/`pointer-events` (not `display:none`) so the image preloads immediately. Images fetched at `s-l500` quality.
- **Dismiss feature** — removed. Requires a proper `dismissed_listings` table design and a DB view. Do not re-add until designed in Cowork.
- **No DB writes in scan hot path** — `scan_results` and `price_snapshots` tables have been dropped from the Drizzle schema and removed from `app/api/scan/route.ts`. The scan route reads only from `watchlist_cards` and returns eBay results directly. Dashboard is stubbed pending a full redesign.

## Engineering guardrails

Before implementing any feature touching DB or API routes, explicitly check:
1. **Latency** — does this add synchronous work to the hot path? If so, can it be deferred or async?
2. **Atomicity** — if writing to multiple tables, what happens if one write fails?
3. **Test coverage** — all pure logic functions need unit tests in `lib/__tests__/`. Flag when a new exportable function is added without a corresponding test.

Unit tests live in `lib/__tests__/` and run with `npm run test`. Current coverage: `deal-algorithm.ts` and `query-builder.ts`.

## Phase plan

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Deal Finder | Built |
| 2 | Listing Agent (Claude API) | Planned |
| 3 | MCP Automation + node-cron (Railway) | Planned |

Phase 2 Claude model routing: `claude-haiku-4-5` for <$5 · `claude-sonnet-4-6` for $5–$100 · `claude-opus-4-7` for $100+.

Phase 3 requires a persistent Node.js server (Railway), which is why hosting stays on Vercel until then.
