import { NextRequest, NextResponse } from 'next/server';
import { getTopMovers } from '@/lib/tcg';

const MOCK_MOVERS = [
  { cardId: 1, name: 'Charizard ex (Alt Art)', game: 'Pokémon',   setName: 'Scarlet & Violet 151', number: '199/165',  image: null, price: 285, changePct: 18.4, trend: 'up' as const },
  { cardId: 2, name: 'Iono (Alt Art)',          game: 'Pokémon',   setName: 'Paldea Evolved',        number: '230/193',  image: null, price: 195, changePct: 12.1, trend: 'up' as const },
  { cardId: 3, name: 'Luffy Gear 5 (SEC)',      game: 'One Piece', setName: 'OP-05 Awakening',       number: 'OP05-119', image: null, price: 95,  changePct: 9.7,  trend: 'up' as const },
  { cardId: 4, name: 'Mewtwo ex',               game: 'Pokémon',   setName: 'Scarlet & Violet 151', number: '150/165',  image: null, price: 35,  changePct: -6.3, trend: 'dn' as const },
  { cardId: 5, name: 'Roronoa Zoro (Leader)',   game: 'One Piece', setName: 'OP-01 Romance Dawn',    number: 'OP01-001', image: null, price: 22,  changePct: -4.8, trend: 'dn' as const },
];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const game      = searchParams.get('game') ?? undefined;
  const direction = (searchParams.get('direction') as 'gainers' | 'losers' | null) ?? undefined;
  const period    = (searchParams.get('period') as '24h' | '7d' | '30d' | null) ?? undefined;
  const limit     = searchParams.get('limit');

  if (!process.env.TCG_API_KEY) {
    const filtered = game
      ? MOCK_MOVERS.filter((m) => m.game.toLowerCase().includes(game === 'onepiece' ? 'one piece' : game))
      : MOCK_MOVERS;
    return NextResponse.json(filtered);
  }

  try {
    const movers = await getTopMovers({
      game,
      direction,
      period,
      limit: limit ? Number(limit) : undefined,
    });
    return NextResponse.json(movers);
  } catch (err) {
    console.error('[top-movers GET]', err);
    return NextResponse.json(MOCK_MOVERS);
  }
}
