import { NextRequest, NextResponse } from 'next/server';
import { getSets } from '@/lib/tcg';

// Fallback mock data used when TCG_API_KEY is not configured
const MOCK_SETS: Record<string, { id: string; name: string; code: string }[]> = {
  pokemon: [
    { id: 'base1',       name: 'Base Set',             code: 'base1' },
    { id: 'sv3pt5',      name: 'Scarlet & Violet 151',  code: 'sv3pt5' },
    { id: 'sv2',         name: 'Paldea Evolved',         code: 'sv2' },
    { id: 'swshp',       name: 'SWSH Promos',            code: 'swshp' },
    { id: 'ex4',         name: 'EX Dragon',              code: 'ex4' },
  ],
  onepiece: [
    { id: 'op09', name: 'OP-09 The Four Emperors',    code: 'OP09' },
    { id: 'op08', name: 'OP-08 Two Legends',          code: 'OP08' },
    { id: 'op07', name: 'OP-07 500 Years in the Future', code: 'OP07' },
    { id: 'op06', name: 'OP-06 Wings of the Captain', code: 'OP06' },
    { id: 'op05', name: 'OP-05 Awakening of the New Era', code: 'OP05' },
    { id: 'op04', name: 'OP-04 Kingdoms of Intrigue', code: 'OP04' },
    { id: 'op03', name: 'OP-03 Pillars of Strength',  code: 'OP03' },
    { id: 'op02', name: 'OP-02 Paramount War',        code: 'OP02' },
    { id: 'op01', name: 'OP-01 Romance Dawn',         code: 'OP01' },
  ],
};

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get('game');
  if (!game) {
    return NextResponse.json({ error: 'game param required' }, { status: 400 });
  }

  if (!process.env.TCG_API_KEY) {
    const sets = MOCK_SETS[game] ?? [];
    return NextResponse.json(sets);
  }

  try {
    const sets = await getSets(game);
    return NextResponse.json(sets);
  } catch (err) {
    console.error('[sets GET]', err);
    const fallback = MOCK_SETS[game] ?? [];
    return NextResponse.json(fallback);
  }
}
