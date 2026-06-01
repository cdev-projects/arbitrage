import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { watchlistCards } from '@/db/schema/watchlist';
import { scanResults } from '@/db/schema/scan-results';
import { priceSnapshots } from '@/db/schema/snapshots';

export async function GET() {
  try {
    const db = getDb();

    const cards = await db.select().from(watchlistCards).orderBy(watchlistCards.createdAt);

    if (cards.length === 0) {
      return NextResponse.json({ cards: [], stats: null, trendSeries: [], scatterPoints: [] });
    }

    // Per-card: best margin + deal count from latest scan
    const cardStats = await Promise.all(
      cards.map(async (card) => {
        const results = await db
          .select()
          .from(scanResults)
          .where(eq(scanResults.cardId, card.id))
          .orderBy(desc(scanResults.scannedAt));

        const deals     = results.filter((r) => r.isDeal);
        const bestMargin = deals.length > 0 ? Math.max(...deals.map((r) => r.margin)) : 0;
        const dealCount  = deals.length;
        const avgEbay    = results.length > 0
          ? results.reduce((s, r) => s + r.price, 0) / results.length
          : null;

        // 30d price history for trend chart
        const snapshots = await db
          .select()
          .from(priceSnapshots)
          .where(eq(priceSnapshots.cardId, card.id))
          .orderBy(priceSnapshots.takenAt)
          .limit(30);

        return {
          card,
          deals,
          bestMargin,
          dealCount,
          avgEbay,
          allResults: results,
          snapshots,
        };
      })
    );

    // Summary stats
    const totalDeals    = cardStats.reduce((s, c) => s + c.dealCount, 0);
    const allBestMargins = cardStats.filter((c) => c.bestMargin > 0).map((c) => c.bestMargin);
    const bestOpportunity = allBestMargins.length > 0 ? Math.max(...allBestMargins) : 0;
    const bestCard = cardStats.find((c) => c.bestMargin === bestOpportunity);
    const avgMargin = allBestMargins.length > 0
      ? allBestMargins.reduce((s, m) => s + m, 0) / allBestMargins.length
      : 0;

    const stats = {
      cardsTracked: cards.length,
      activeDeals: totalDeals,
      bestMargin: bestOpportunity,
      bestCardName: bestCard?.card.cardName ?? '—',
      avgMargin,
    };

    // Trend series (30-day snapshots)
    const trendSeries = cardStats
      .filter((c) => c.snapshots.length > 0)
      .map((c) => {
        const days = c.snapshots.map((s) =>
          new Date(s.takenAt ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        return {
          cardId:   c.card.id,
          cardName: c.card.cardName,
          days,
          tcg:      c.snapshots.map((s) => s.tcgMarket),
          ebay:     c.snapshots.map((s) => s.avgEbayListing),
        };
      });

    // Scatter points (all listings from latest scan)
    const scatterPoints = cardStats.flatMap((c) =>
      c.allResults.map((r) => ({
        tcgMarket:    c.card.tcgMarket,
        listingPrice: r.price,
        isDeal:       r.isDeal,
      }))
    );

    // Opportunity ranking data
    const opportunityCards = cardStats.map((c) => ({
      cardId:     c.card.id,
      cardName:   c.card.cardName,
      game:       c.card.game,
      art:        c.card.art,
      tcgMarket:  c.card.tcgMarket,
      bestMargin: c.bestMargin,
      dealCount:  c.dealCount,
    }));

    // Momentum — requires at least 2 snapshots
    const momentumCards = cardStats
      .filter((c) => c.snapshots.length >= 2)
      .map((c) => {
        const first = c.snapshots[0].tcgMarket;
        const last  = c.snapshots[c.snapshots.length - 1].tcgMarket;
        const momentum = first > 0 ? ((last - first) / first) * 100 : 0;
        return {
          cardId:   c.card.id,
          cardName: c.card.cardName,
          game:     c.card.game,
          art:      c.card.art,
          momentum,
          trend:    momentum >= 0 ? 'up' as const : 'dn' as const,
        };
      });

    // Bar chart data
    const barCards = cardStats.map((c) => ({
      label:     c.card.cardName.length > 12 ? c.card.cardName.slice(0, 10) + '…' : c.card.cardName,
      dealCount: c.dealCount,
    }));

    return NextResponse.json({
      stats,
      opportunityCards,
      momentumCards,
      trendSeries,
      scatterPoints,
      barCards,
      lastScanned: cardStats.some((c) => c.allResults.length > 0)
        ? (cardStats.find((c) => c.allResults.length > 0)?.allResults[0]?.scannedAt ?? null)
        : null,
    });
  } catch (err) {
    console.error('[dashboard GET]', err);
    return NextResponse.json({ error: 'Failed to load dashboard', detail: String(err) }, { status: 500 });
  }
}
