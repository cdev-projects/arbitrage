# Card Trading Engine — Claude Code Instructions

## Working files

Plans, summaries, and exploratory docs live in `.claude/workspace/` — gitignored, never committed. Save all Cowork and session working documents here, not in `docs/`.

When a plan produces a decision worth keeping, capture it into this file via `/capture` — not by committing the plan itself.

**Cowork note:** Cowork does not auto-load `~/.claude/CLAUDE.md` — any conventions that need to reach Cowork must live in this file. A redirect stub lives at `C:\Users\chris\Claude\Projects\arbitrage\CLAUDE.md` pointing Cowork to this canonical project path until the Cowork project path can be updated in settings.

## Documentation

- `README.md` — business context, quick start, high-level structure. Audience: humans.
- `ARCHITECTURE.md` — system design, diagrams, schema, API details, design decisions. Audience: engineers.
- `docs/context-system.html` — reference doc explaining the Claude context system (CLAUDE.md, memory, chat vs Code vs Cowork).

## Commands

```bash
npm run dev          # start dev server (Next.js + Turbopack)
npm run build        # production build
npm run lint         # ESLint
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
- **Pokémon** — card number is the unique identifier; rarity term never needed.
- **One Piece** — rarity term required for SEC/SR/Leader (`all tiers`) and R (`Tier 1 only`, dropped at Tier 2+ due to ambiguity). UC/C rarities omit rarity term entirely. One Piece queries also exclude `-Japanese -JP`.
- **Card numbers unquoted** — eBay's search handles slash variants (`199/165`, `199 / 165`) naturally.
- **Price ceiling** — `price:[0..{tcgMarket*1.1}]` applied on all tiers.

**Token cache** — `globalThis.__ebayToken` survives Next.js serverless warm restarts. Invalidated 60 s before actual expiry.

**Per-card error isolation** — `scanCardSafe` in `app/api/scan/route.ts` wraps each card scan in try/catch. A failed card produces `{ listings: [], error: string }` instead of failing the whole scan. The `error` field surfaces in `ScanResults` as an error count in the fee strip.

## eBay listing fields

`EbayListing` in `lib/ebay.ts` maps these Browse v1 fields:

| Field | Source | Notes |
|-------|--------|-------|
| `isGraded` | title regex `/PSA\|CGC\|BGS\|graded\|slab/i` | Post-fetch detection; graded cards are included, not excluded |
| `isLowConfidence` | set by query tier | `true` for Tier 3 results only |
| `listingImageUrl` | `item.image.imageUrl` | eBay listing photo; shown in ResultCard if present |
| `endsAt` | `item.itemEndDate` | ISO string; UI computes "Ends Xh Ym" at render time |
| `bidCount` | `item.bidCount` | Shown next to listing type pill when > 0 |
| `currentBidPrice` | `item.currentBidPrice.value` | Float |
| `sellerFeedback` | `item.seller.feedbackScore` | Integer |

**`sold30` is gone** — Browse v1 doesn't provide sold count. The `sold_30` DB column is kept (no migration needed) but is never written to.

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
- **DB naming vs app naming** — the DB table is `wishlists` / column `wishlist_id`; application layer uses `watchlist` everywhere. Do not rename DB columns without a migration.

## Phase plan

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Deal Finder | Built |
| 2 | Listing Agent (Claude API) | Planned |
| 3 | MCP Automation + node-cron (Railway) | Planned |

Phase 2 Claude model routing: `claude-haiku-4-5` for <$5 · `claude-sonnet-4-6` for $5–$100 · `claude-opus-4-7` for $100+.

Phase 3 requires a persistent Node.js server (Railway), which is why hosting stays on Vercel until then.
