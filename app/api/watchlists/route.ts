import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { watchlists } from '@/db/schema/wishlists';
import { watchlistCards } from '@/db/schema/watchlist';

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id:        watchlists.id,
        name:      watchlists.name,
        createdAt: watchlists.createdAt,
        cardCount: sql<number>`count(${watchlistCards.id}) filter (where ${watchlistCards.isActive} = true)`,
      })
      .from(watchlists)
      .leftJoin(watchlistCards, eq(watchlistCards.watchlistId, watchlists.id))
      .groupBy(watchlists.id, watchlists.name, watchlists.createdAt)
      .orderBy(watchlists.createdAt);
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
    const [created] = await db.insert(watchlists).values({ name: name.trim() }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[watchlists POST]', err);
    return NextResponse.json({ error: 'Failed to create watchlist' }, { status: 500 });
  }
}
