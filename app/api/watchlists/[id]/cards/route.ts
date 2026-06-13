import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { watchlistCards, NewWatchlistCard } from '@/db/schema/watchlist';

const MAX_PER_WATCHLIST = 20;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const cards = await db
      .select()
      .from(watchlistCards)
      .where(and(eq(watchlistCards.watchlistId, id), eq(watchlistCards.isActive, true)))
      .orderBy(watchlistCards.createdAt);
    return NextResponse.json(cards);
  } catch (err) {
    console.error('[watchlist cards GET]', err);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await req.json() as Omit<NewWatchlistCard, 'watchlistId'>;

    const existing = await db
      .select()
      .from(watchlistCards)
      .where(eq(watchlistCards.watchlistId, id));

    const match = existing.find(
      (c) => c.game === body.game && c.set === body.set &&
             c.cardNumber === body.cardNumber && c.condition === body.condition,
    );

    if (match) {
      if (match.isActive) {
        return NextResponse.json({ error: 'Card already in watchlist' }, { status: 409 });
      }
      const [reactivated] = await db
        .update(watchlistCards)
        .set({ isActive: true, tcgCardId: body.tcgCardId ?? match.tcgCardId, tcgMarket: body.tcgMarket, tcgLow: body.tcgLow, imageUrl: body.imageUrl ?? match.imageUrl })
        .where(eq(watchlistCards.id, match.id))
        .returning();
      return NextResponse.json(reactivated, { status: 200 });
    }

    const activeCount = existing.filter((c) => c.isActive).length;
    if (activeCount >= MAX_PER_WATCHLIST) {
      return NextResponse.json({ error: `Watchlist full (max ${MAX_PER_WATCHLIST})` }, { status: 400 });
    }

    const [created] = await db
      .insert(watchlistCards)
      .values({ ...body, watchlistId: id })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[watchlist cards POST]', err);
    return NextResponse.json({ error: 'Failed to add card' }, { status: 500 });
  }
}
