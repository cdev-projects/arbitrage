import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { watchlistCards, NewWatchlistCard } from '@/db/schema/watchlist';

const MAX_PER_WISHLIST = 20;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const cards = await db
      .select()
      .from(watchlistCards)
      .where(and(eq(watchlistCards.wishlistId, id), eq(watchlistCards.isActive, true)))
      .orderBy(watchlistCards.createdAt);
    return NextResponse.json(cards);
  } catch (err) {
    console.error('[wishlist cards GET]', err);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await req.json() as Omit<NewWatchlistCard, 'wishlistId'>;

    const existing = await db
      .select()
      .from(watchlistCards)
      .where(eq(watchlistCards.wishlistId, id));

    const match = existing.find(
      (c) => c.game === body.game && c.set === body.set &&
             c.cardNumber === body.cardNumber && c.condition === body.condition,
    );

    if (match) {
      if (match.isActive) {
        return NextResponse.json({ error: 'Card already in wishlist' }, { status: 409 });
      }
      const [reactivated] = await db
        .update(watchlistCards)
        .set({ isActive: true, tcgCardId: body.tcgCardId ?? match.tcgCardId, tcgMarket: body.tcgMarket, tcgLow: body.tcgLow, imageUrl: body.imageUrl ?? match.imageUrl })
        .where(eq(watchlistCards.id, match.id))
        .returning();
      return NextResponse.json(reactivated, { status: 200 });
    }

    const activeCount = existing.filter((c) => c.isActive).length;
    if (activeCount >= MAX_PER_WISHLIST) {
      return NextResponse.json({ error: `Wishlist full (max ${MAX_PER_WISHLIST})` }, { status: 400 });
    }

    const [created] = await db
      .insert(watchlistCards)
      .values({ ...body, wishlistId: id })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[wishlist cards POST]', err);
    return NextResponse.json({ error: 'Failed to add card' }, { status: 500 });
  }
}
