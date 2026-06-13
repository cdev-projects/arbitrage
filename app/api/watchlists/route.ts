import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { wishlists } from '@/db/schema/wishlists';
import { watchlistCards } from '@/db/schema/watchlist';

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id:        wishlists.id,
        name:      wishlists.name,
        createdAt: wishlists.createdAt,
        cardCount: sql<number>`count(${watchlistCards.id}) filter (where ${watchlistCards.isActive} = true)`,
      })
      .from(wishlists)
      .leftJoin(watchlistCards, eq(watchlistCards.wishlistId, wishlists.id))
      .groupBy(wishlists.id, wishlists.name, wishlists.createdAt)
      .orderBy(wishlists.createdAt);
    return NextResponse.json(rows.map((r) => ({ ...r, cardCount: Number(r.cardCount) })));
  } catch (err) {
    console.error('[watchlists GET]', err);
    return NextResponse.json({ error: 'Failed to fetch watchlists' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { name } = await req.json() as { name: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const [created] = await db.insert(wishlists).values({ name: name.trim() }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[watchlists POST]', err);
    return NextResponse.json({ error: 'Failed to create watchlist' }, { status: 500 });
  }
}
