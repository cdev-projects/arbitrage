import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { watchlistCards, WatchlistCard } from '@/db/schema/watchlist';
import { scanResults } from '@/db/schema/scan-results';
import { priceSnapshots } from '@/db/schema/snapshots';
import { searchListings, EbayListing } from '@/lib/ebay';
import { calcDeal, isDeal } from '@/lib/deal-algorithm';

const CONCURRENCY = 5;

// Mock listings used when EBAY_CLIENT_ID is not set
const MOCK_LISTINGS: Record<string, EbayListing[]> = {
  'Charizard ex (Alt Art)': [
    { listingId:'m1', title:'Pokemon 151 Charizard ex Alt Art 199/165 NM',       price:89.99, condition:'NM', listingType:'bin',     isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m2', title:'SV 151 Charizard ex SIR 199/165 — Auction',         price:145,   condition:'NM', listingType:'auction', isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m3', title:'Charizard ex Alt Art 199/165 SV 151 LP',            price:62,    condition:'LP', listingType:'bin',     isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m4', title:'Pokemon SV 151 Charizard ex SIR NM/M PSA 10',       price:105,   condition:'NM', listingType:'both',    isLowConfidence:false, isGraded:true,  ebayUrl:'https://www.ebay.com' },
    { listingId:'m5', title:'SV 151 Charizard ex Alt Art 199/165 NM',            price:79,    condition:'NM', listingType:'bin',     isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
  ],
  'Charizard': [
    { listingId:'m6', title:'1999 Pokemon Base Set Charizard 4/102 Holo NM',     price:185,   condition:'NM', listingType:'bin',     isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m7', title:'Base Set Charizard 4/102 Holo Rare LP',             price:130,   condition:'LP', listingType:'auction', isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m8', title:'Pokemon Charizard Base Set 4/102 Holo NM PSA 9',    price:220,   condition:'NM', listingType:'bin',     isLowConfidence:false, isGraded:true,  ebayUrl:'https://www.ebay.com' },
  ],
  'Monkey D. Luffy (SEC)': [
    { listingId:'m10', title:'One Piece TCG OP01-060 Luffy SEC NM EN',           price:38,    condition:'NM', listingType:'bin',     isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m11', title:'OP01 Luffy SEC Romance Dawn NM — Auction',         price:55,    condition:'NM', listingType:'auction', isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m12', title:'One Piece OP01-060 Secret Rare Luffy LP',          price:29,    condition:'LP', listingType:'bin',     isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m13', title:'OP01 Luffy SEC English NM BIN+Auction',            price:44,    condition:'NM', listingType:'both',    isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
  ],
  'LeBron James RC': [
    { listingId:'m14', title:'2003-04 Topps Chrome LeBron James Rookie #111 NM', price:185,   condition:'NM', listingType:'bin',     isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m15', title:'LeBron James 2003 Topps Chrome RC #111 LP',        price:120,   condition:'LP', listingType:'auction', isLowConfidence:true,  isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m16', title:'Topps Chrome 2003-04 LeBron RC 111 NM',            price:210,   condition:'NM', listingType:'bin',     isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m17', title:'LeBron James Rookie Topps Chrome #111 NM BGS 9.5', price:165,   condition:'NM', listingType:'both',    isLowConfidence:false, isGraded:true,  ebayUrl:'https://www.ebay.com' },
  ],
  'Iono (Alt Art)': [
    { listingId:'m18', title:'Iono Alt Art 230/193 Paldea Evolved SIR NM',       price:58,    condition:'NM', listingType:'bin',     isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m19', title:'Pokemon Iono SIR 230/193 Near Mint',               price:72,    condition:'NM', listingType:'bin',     isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m20', title:'Iono Special Illustration Rare Paldea LP',         price:44,    condition:'LP', listingType:'auction', isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
    { listingId:'m21', title:'Paldea Evolved Iono 230/193 Alt Art NM',           price:65,    condition:'NM', listingType:'both',    isLowConfidence:false, isGraded:false, ebayUrl:'https://www.ebay.com' },
  ],
};

async function scanCard(card: WatchlistCard): Promise<EbayListing[]> {
  if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
    return MOCK_LISTINGS[card.cardName] ?? [];
  }

  return searchListings({
    cardName:   card.cardName,
    set:        card.set,
    cardNumber: card.cardNumber,
    condition:  card.condition,
    game:       card.game,
    rarity:     card.rarity,
  }, card.tcgMarket);
}

async function scanCardSafe(card: WatchlistCard): Promise<{ listings: EbayListing[]; error?: string }> {
  try {
    return { listings: await scanCard(card) };
  } catch (err) {
    console.error(`[scan] ${card.cardName}:`, err);
    return { listings: [], error: String(err) };
  }
}

async function runConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export interface ScanResultItem {
  cardId:      string;
  cardName:    string;
  set:         string;
  cardNumber:  string;
  tcgMarket:   number;
  tcgLow:      number;
  condition:   string;
  game:        string;
  art:         string;
  imageUrl?:   string | null;
  error?:      string;
  listings: {
    listingId:        string;
    title:            string;
    price:            number;
    condition:        string;
    listingType:      string;
    ebayUrl:          string;
    isLowConfidence:  boolean;
    isGraded:         boolean;
    listingImageUrl?: string;
    endsAt?:          string;
    bidCount?:        number;
    currentBidPrice?: number;
    sellerFeedback?:  number;
    sellAt:           number;
    ebayFee:          number;
    payFee:           number;
    shipping:         number;
    profit:           number;
    margin:           number;
    isDeal:           boolean;
  }[];
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { minMargin = 30, watchlist: clientWatchlist } = body as {
    minMargin?: number;
    watchlist?: WatchlistCard[];
  };

  // Use client-supplied watchlist when available (no-DB mode),
  // otherwise fall back to fetching from the database.
  let cards: WatchlistCard[];
  let dbAvailable = false;

  try {
    const db = getDb();
    cards = await db.select().from(watchlistCards).where(eq(watchlistCards.isActive, true));
    dbAvailable = true;
  } catch {
    if (clientWatchlist && clientWatchlist.length > 0) {
      cards = clientWatchlist;
    } else {
      return NextResponse.json({ results: [] });
    }
  }

  try {
    if (cards.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const allResults = await runConcurrent(cards, scanCardSafe, CONCURRENCY);

    const results: ScanResultItem[] = [];

    for (let i = 0; i < cards.length; i++) {
      const card     = cards[i];
      const { listings, error } = allResults[i];

      const scoredListings = listings.map((l) => {
        const deal = calcDeal(l.price, card.tcgMarket);
        return {
          ...l,
          ...deal,
          isDeal: isDeal(deal.margin, minMargin) && !l.isLowConfidence,
        };
      });

      results.push({
        cardId:     card.id,
        cardName:   card.cardName,
        set:        card.set,
        cardNumber: card.cardNumber,
        tcgMarket:  card.tcgMarket,
        tcgLow:     card.tcgLow,
        condition:  card.condition,
        game:       card.game,
        art:        card.art,
        imageUrl:   card.imageUrl ?? null,
        error,
        listings:   scoredListings,
      });

      // Persist scan results to DB only when DB is available
      if (dbAvailable && listings.length > 0) {
        const db = getDb();
        await db.delete(scanResults).where(eq(scanResults.cardId, card.id));
        await db.insert(scanResults).values(
          scoredListings.map((l) => ({
            cardId:      card.id,
            tcgCardId:   card.tcgCardId ?? null,
            listingId:   l.listingId,
            title:       l.title,
            price:       l.price,
            condition:   l.condition,
            listingType: l.listingType,
            netProfit:   l.profit,
            margin:      l.margin,
            isDeal:      l.isDeal,
            ebayUrl:     l.ebayUrl,
          }))
        );

        // Daily price snapshot
        const avgEbay = listings.reduce((s, l) => s + l.price, 0) / listings.length;
        const dealCount = scoredListings.filter((l) => l.isDeal).length;
        await db.insert(priceSnapshots).values({
          cardId:         card.id,
          tcgCardId:      card.tcgCardId ?? null,
          condition:      card.condition,
          tcgMarket:      card.tcgMarket,
          avgEbayListing: avgEbay,
          dealCount,
        });
      }
    }

    const isMock = !process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET;
    return NextResponse.json({ results, isMock });
  } catch (err) {
    console.error('[scan POST]', err);
    return NextResponse.json({ error: 'Scan failed', detail: String(err) }, { status: 500 });
  }
}
