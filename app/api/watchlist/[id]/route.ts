import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { watchlistCards } from '@/db/schema/watchlist';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    await db.delete(watchlistCards).where(eq(watchlistCards.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[watchlist DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
