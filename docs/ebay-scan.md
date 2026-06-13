# eBay Scan — Feature Summary

Built June 2026. Documents the eBay Browse API integration, query strategy, scan results UI, and known issues.

---

## What it does

The scan feature takes a saved watchlist and queries eBay for live listings of each card. It runs the deal algorithm against each listing to compute profit and margin, then surfaces deals in a filterable results UI.

Flow:
1. User picks a watchlist and minimum margin threshold on `/scan`
2. API route (`POST /api/scan`) fetches the watchlist cards and fans out eBay queries (5 concurrent)
3. Each card goes through a 3-tier query waterfall (see below)
4. Listings are scored by `calcDeal()` and flagged `isDeal` when margin ≥ threshold
5. Results render in `ScanResults` grouped by card, with deals highlighted

---

## Query strategy (`lib/query-builder.ts`)

Each card runs a 3-tier waterfall. The next tier only fires if the previous returns fewer than 3 results.

| Tier | Query shape | Notes |
|------|-------------|-------|
| 1 | `"name" number -digital -lot -proxy -fake -reprint` | Tight — card number as unique key |
| 2 | `"name" "set" pokemon/onepiece excl` | Medium — set name for disambiguation |
| 3 | `"name" pokemon/onepiece tcg excl` + loose conditions | Broad — `isLowConfidence: true`; **never counted as a deal** |

**Tier 3 is informational only.** Results appear in the "All" tab with a "Broad search" badge but are excluded from `isDeal` to prevent false positives from wrong-card matches.

### Game-specific rules

**Pokémon:**
- Card number is the unique identifier — always in Tier 1
- No rarity term needed (numbers are unique per set)
- Exclusions: `-digital -lot -proxy -fake -reprint`

**One Piece:**
- Rarity abbreviation appended because same name+number can differ by rarity:
  - SEC / SR / Leader → all tiers
  - R → Tier 1 only (too ambiguous at broader tiers)
  - UC / C → omitted (low value, negligible price delta)
- Set code extracted from card number (`OP01-060` → `OP01`) used in Tier 2
- Additional exclusions: `-Japanese -JP`

### Filters applied to all tiers
- `conditionIds` mapped from NM/LP/MP/HP to eBay condition IDs (Tier 3 loosens by one level)
- `buyingOptions:{FIXED_PRICE|AUCTION}`
- `price:[0..tcgMarket×1.1]` — price ceiling to avoid overpriced listings
- `priceCurrency:USD`, `itemLocationCountry:US`

### Card numbers
Card numbers are **unquoted** in queries — eBay's search handles slash variants (`199/165`, `199 / 165`) naturally. Quoting breaks matching.

---

## eBay listing fields

All fields mapped from Browse v1 (`fieldgroups: EXTENDED`):

| Field | Source | UI usage |
|-------|--------|----------|
| `price` | `item.price.value` | Deal algorithm input |
| `condition` | `item.condition` | Condition pill |
| `listingType` | `item.buyingOptions` | BIN / Auction / BIN+Auction pill |
| `isGraded` | Title regex `/PSA\|CGC\|BGS\|graded\|slab/i` | Purple "Graded" pill + note |
| `isLowConfidence` | Set by query tier (Tier 3 = true) | Grey "Broad search" pill |
| `listingImageUrl` | `item.image.imageUrl` | Thumbnail in result card |
| `endsAt` | `item.itemEndDate` | "Ends Xh Ym" amber pill (auctions < 48h) |
| `bidCount` | `item.bidCount` | Bid count pill |
| `currentBidPrice` | `item.currentBidPrice.value` | Available for $0 auction detection |
| `sellerFeedback` | `item.seller.feedbackScore` | Available for future trust scoring |

`sold30` (30-day sales count) is **not available** in Browse v1. The DB column is kept but never written.

---

## Scan results UI

### Fee strip
Fixed constants displayed above results: eBay 13.25%, payment 3.00%, shipping $3/$5.50/$8. Error count shown in red when any cards fail during scan.

### Card groups
Each card in the watchlist is a collapsible group showing:
- Card art, name, set, number, TCG market price, condition
- Best deal profit and deal count in the header
- Expand to see individual listings

### Result card badges
Each listing shows a row of pills:
- **Deal ✓ / Pass** — teal or grey, primary deal status
- **Condition** — NM / LP / MP / HP
- **BIN / Auction / BIN+Auction** — listing type
- **N bids** — shown when `bidCount > 0`
- **Shipping tier** — $3 / $5.50 / $8 based on listing price
- **Graded** — purple, when title matches graded regex
- **Broad search** — grey, when `isLowConfidence` (Tier 3 result)
- **Ends Xh Ym** — amber, for auctions ending within 48h

### Comps bar
Below each listing's prices: position of this listing's price within the min–max range of all listings for that card. Color-coded teal (deal) / amber (borderline) / coral (no deal). Shows comp count and range (e.g. "8 comps · $22–$36").

### Graded note
When `isGraded` is true, an additional note reads: "Margin uses raw TCG price — graded cards sell for more." The margin shown is conservative; graded cards command a premium above raw TCG market price.

### Tabs and filters
- **Deals / All** — deals tab hides Pass listings and cards with no deals
- **All types / BIN / Auction** — filter by listing type

---

## Token cache

eBay OAuth app tokens are cached in `globalThis.__ebayToken` to survive Next.js serverless warm restarts. Token is refreshed 60 seconds before expiry.

---

## Per-card error isolation

Each card scan is wrapped in `scanCardSafe()`. A network error or bad response for one card produces `{ listings: [], error: string }` instead of aborting the whole scan. Error count is displayed in the fee strip.

---

## Known issues / backlog

### $0 auction false positives
New auctions starting at $0.00 with 7+ days remaining score as massive deals. Fields needed for detection (`endsAt`, `currentBidPrice`) are already mapped. Planned fix: exclude from `isDeal` when price < $1 and more than 48h remaining; surface as a "Watching" bucket instead.

### Junk listing types
Extended art reprints, display cases, fan art, and sticker listings surface in results. Need user-configurable exclusion terms (e.g. `-"display case" -"fan art" -sticker`). Current hardcoded exclusions: `-digital -lot -proxy -fake -reprint`.

### Deal dismissal / age filter
No way to mark deals as reviewed or hide stale results. Planned: auto-hide listings with `scanned_at` > 48h, plus a per-listing Dismiss button writing `dismissed_at` to `scan_results`.

### Daily notification
Planned for Phase 3 (Railway + node-cron). Claude scans on a schedule and sends a deal summary notification.
