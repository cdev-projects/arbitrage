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
    { id: 'op01', name: 'OP-01 Romance Dawn',        code: 'OP01' },
    { id: 'op05', name: 'OP-05 Awakening',           code: 'OP05' },
    { id: 'op06', name: 'OP-06 Wings of Captain',    code: 'OP06' },
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
