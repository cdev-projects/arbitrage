import { NextRequest, NextResponse } from 'next/server';
import { searchCards } from '@/lib/tcg';

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
      { id:'sv3pt5-6',   name:'Charizard ex',           number:'006/165', rarity:'Double Rare',                     art:'火', prices:{market:52, low:38, foil:null} },
      { id:'sv3pt5-150', name:'Mewtwo ex',               number:'150/165', rarity:'Double Rare',                     art:'🔮', prices:{market:35, low:22, foil:null} },
      { id:'sv3pt5-199', name:'Charizard ex (Alt Art)',  number:'199/165', rarity:'Special Illustration Rare',       art:'火', prices:{market:285,low:210,foil:null} },
    ],
    sv2: [
      { id:'sv2-182', name:'Iono',          number:'182/193', rarity:'Ultra Rare',                     art:'📱', prices:{market:44, low:30, foil:null} },
      { id:'sv2-230', name:'Iono (Alt Art)',number:'230/193', rarity:'Special Illustration Rare',       art:'📱', prices:{market:195,low:140,foil:null} },
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
  sports: {
    'topps-chrome-2003': [
      { id:'tc03-111', name:'LeBron James RC',  number:'111', rarity:'Rookie', art:'🏀', prices:{market:450,low:320,foil:null} },
      { id:'tc03-115', name:'Dwyane Wade RC',   number:'115', rarity:'Rookie', art:'🏀', prices:{market:85, low:60, foil:null} },
    ],
    'panini-prizm-2021': [
      { id:'pp21-001', name:'LeBron James', number:'001', rarity:'Base', art:'🏀', prices:{market:48,low:32,foil:null} },
    ],
    'panini-mosaic-2020': [
      { id:'pm20-007', name:'LeBron James', number:'007', rarity:'Base', art:'🏀', prices:{market:32,low:22,foil:null} },
    ],
  },
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const game  = searchParams.get('game');
  const setId = searchParams.get('set');
  const query = searchParams.get('q') ?? '';

  if (!game || !setId) {
    return NextResponse.json({ error: 'game and set params required' }, { status: 400 });
  }

  if (!process.env.TCG_API_KEY) {
    const cards = (MOCK_CARDS[game]?.[setId] ?? []).filter((c) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.number.toLowerCase() === q;
    });
    return NextResponse.json(cards);
  }

  try {
    const cards = await searchCards(game, setId, query);
    return NextResponse.json(cards);
  } catch (err) {
    console.error('[cards GET]', err);
    return NextResponse.json({ error: 'Card search failed' }, { status: 500 });
  }
}
