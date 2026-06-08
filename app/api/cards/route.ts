import { NextRequest, NextResponse } from 'next/server';
import { searchCards, getSetCards } from '@/lib/tcg';

interface MockCard {
  id: string;
  name: string;
  number: string;
  rarity: string;
  art: string;
  prices: { market: number; low: number; foil: number | null };
}

const MOCK_CARDS: Record<string, Record<string, MockCard[]>> = {
  pokemon: {
    base1: [
      { id:'base1-4',   name:'Charizard',  number:'004/102', rarity:'Holo Rare',     art:'火', prices:{market:290,low:210,foil:null} },
      { id:'base1-25',  name:'Pikachu',    number:'025/102', rarity:'Common',         art:'⚡', prices:{market:28, low:18, foil:null} },
      { id:'base1-9',   name:'Blastoise',  number:'009/102', rarity:'Holo Rare',     art:'💧', prices:{market:140,low:95, foil:null} },
    ],
    sv3pt5: [
      { id:'sv3pt5-6',   name:'Charizard ex',           number:'006/165', rarity:'Double Rare',                   art:'火', prices:{market:52, low:38, foil:null} },
      { id:'sv3pt5-150', name:'Mewtwo ex',               number:'150/165', rarity:'Double Rare',                   art:'🔮', prices:{market:35, low:22, foil:null} },
      { id:'sv3pt5-199', name:'Charizard ex (Alt Art)',  number:'199/165', rarity:'Special Illustration Rare',     art:'火', prices:{market:285,low:210,foil:null} },
    ],
    sv2: [
      { id:'sv2-182', name:'Iono',          number:'182/193', rarity:'Ultra Rare',                   art:'📱', prices:{market:44, low:30, foil:null} },
      { id:'sv2-230', name:'Iono (Alt Art)',number:'230/193', rarity:'Special Illustration Rare',     art:'📱', prices:{market:195,low:140,foil:null} },
    ],
    swshp: [
      { id:'swshp-SWSH050', name:'Charizard V', number:'SWSH050', rarity:'Promo', art:'火', prices:{market:22,low:14,foil:null} },
    ],
    ex4: [
      { id:'ex4-94', name:'Flygon (Holo)', number:'094/097', rarity:'Holo Rare', art:'🐉', prices:{market:47,low:34,foil:null} },
    ],
  },
  onepiece: {
    op01: [
      { id:'op01-060', name:'Monkey D. Luffy (SEC)', number:'OP01-060', rarity:'Secret Rare', art:'⚓', prices:{market:120,low:88,foil:null} },
      { id:'op01-001', name:'Roronoa Zoro (Leader)',  number:'OP01-001', rarity:'Leader',      art:'⚔️', prices:{market:22, low:15,foil:null} },
    ],
    op05: [
      { id:'op05-119', name:'Luffy Gear 5 (SEC)', number:'OP05-119', rarity:'Secret Rare', art:'☀️', prices:{market:95,low:70,foil:null} },
    ],
    op06: [
      { id:'op06-118', name:'Luffy (SEC)', number:'OP06-118', rarity:'Secret Rare', art:'⚓', prices:{market:75,low:55,foil:null} },
    ],
  },
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const game  = searchParams.get('game');
  const q     = searchParams.get('q') ?? '';
  const setId = searchParams.get('set') ?? undefined;
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  const hasQuery = q.trim().length >= 2;
  const hasSet   = !!setId;

  if (!game || (!hasQuery && !hasSet)) {
    return NextResponse.json({ error: 'game and either q (min 2 chars) or set required' }, { status: 400 });
  }

  if (!process.env.TCG_API_KEY) {
    const allForGame = MOCK_CARDS[game] ?? {};
    if (hasSet && !hasQuery) {
      const cards = allForGame[setId!] ?? [];
      return NextResponse.json({ cards, hasMore: false, nextPage: null, total: cards.length });
    }
    const ql = q.toLowerCase();
    const cards = Object.entries(allForGame)
      .flatMap(([sid, list]) => (!setId || sid === setId) ? list : [])
      .filter((c) => c.name.toLowerCase().includes(ql));
    return NextResponse.json({ cards, hasMore: false, nextPage: null, total: cards.length });
  }

  try {
    if (hasSet && !hasQuery) {
      return NextResponse.json(await getSetCards(setId!, page));
    }
    const cards = await searchCards(game, q, setId);
    return NextResponse.json({ cards, hasMore: false, nextPage: null, total: cards.length });
  } catch (err) {
    console.error('[cards GET]', err);
    return NextResponse.json({ error: 'Card search failed' }, { status: 500 });
  }
}
