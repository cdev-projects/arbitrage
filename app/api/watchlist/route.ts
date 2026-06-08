import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { watchlistCards, NewWatchlistCard } from '@/db/schema/watchlist';

const MAX_WATCHLIST = 20;

export async function GET() {
  try {
    const db = getDb();
    const cards = await db
      .select()
      .from(watchlistCards)
      .where(eq(watchlistCards.isActive, true))
      .orderBy(watchlistCards.createdAt);
    return NextResponse.json(cards);
  } catch (err) {
    console.error('[watchlist GET]', err);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as NewWatchlistCard;

    const all = await db.select().from(watchlistCards);

    const match = all.find(
      (c) =>
        c.game === body.game &&
        c.set === body.set &&
        c.cardNumber === body.cardNumber &&
        c.condition === body.condition
    );

    if (match) {
      if (match.isActive) {
        return NextResponse.json({ error: 'Card already in watchlist' }, { status: 409 });
      }
      // Reactivate the existing row — history stays intact under the same tcgCardId
      const [reactivated] = await db
        .update(watchlistCards)
        .set({
          isActive:  true,
          tcgCardId: body.tcgCardId ?? match.tcgCardId,
          tcgMarket: body.tcgMarket,
          tcgLow:    body.tcgLow,
          imageUrl:  body.imageUrl ?? match.imageUrl,
        })
        .where(eq(watchlistCards.id, match.id))
        .returning();
      return NextResponse.json(reactivated, { status: 200 });
    }

    const active = all.filter((c) => c.isActive);
    if (active.length >= MAX_WATCHLIST) {
      return NextResponse.json({ error: 'Watchlist is full (max 20)' }, { status: 400 });
    }

    const [created] = await db.insert(watchlistCards).values(body).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[watchlist POST]', err);
    return NextResponse.json({ error: 'Failed to add card' }, { status: 500 });
  }
}
