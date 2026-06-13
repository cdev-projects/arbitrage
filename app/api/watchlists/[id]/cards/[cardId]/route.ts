import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { watchlistCards } from '@/db/schema/watchlist';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> },
) {
  try {
    const { id, cardId } = await params;
    const db = getDb();
    await db
      .update(watchlistCards)
      .set({ isActive: false })
      .where(and(eq(watchlistCards.id, cardId), eq(watchlistCards.wishlistId, id)));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[watchlist card DELETE]', err);
    return NextResponse.json({ error: 'Failed to remove card' }, { status: 500 });
  }
}
