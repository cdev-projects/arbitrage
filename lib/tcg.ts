const TCG_API_BASE = 'https://api.tcgapi.dev/v1';

// In-memory cache — survives the Next.js process lifetime on Railway
// On Vercel (serverless) each invocation starts cold; use a longer TTL as a best-effort
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function tcgFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.TCG_API_KEY;
  if (!apiKey) throw new Error('TCG_API_KEY is not set');

  const cached = cache.get(path);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as T;
  }

  const res = await fetch(`${TCG_API_BASE}${path}`, {
    headers: { 'x-api-key': apiKey },
    next: { revalidate: 86400 }, // Next.js fetch cache — 24h
  });

  if (!res.ok) throw new Error(`TCG API error: ${res.status} ${path}`);

  const data = await res.json();
  cache.set(path, { data, expiresAt: Date.now() + TTL_MS });
  return data as T;
}

export interface TcgSet {
  id:   string;
  name: string;
  code: string;
}

export interface TcgCard {
  id:        string;
  name:      string;
  number:    string;
  rarity:    string;
  prices: {
    market: number | null;
    low:    number | null;
    foil:   number | null;
  };
}

const GAME_MAP: Record<string, string> = {
  pokemon:  'pokemon',
  onepiece: 'one-piece',
  sports:   'sports',
};

export async function getSets(game: string): Promise<TcgSet[]> {
  const tcgGame = GAME_MAP[game] ?? game;
  const data = await tcgFetch<{ sets: TcgSet[] }>(`/sets?game=${tcgGame}`);
  return data.sets ?? [];
}

export async function searchCards(game: string, setId: string, query: string): Promise<TcgCard[]> {
  const tcgGame = GAME_MAP[game] ?? game;
  const params = new URLSearchParams({ game: tcgGame, set: setId, q: query });
  const data = await tcgFetch<{ cards: TcgCard[] }>(`/cards?${params}`);
  return data.cards ?? [];
}

export async function getCardPrice(game: string, cardId: string): Promise<{ market: number | null; low: number | null }> {
  const tcgGame = GAME_MAP[game] ?? game;
  const data = await tcgFetch<{ prices: { market: number | null; low: number | null } }>(
    `/prices?game=${tcgGame}&id=${cardId}`
  );
  return data.prices ?? { market: null, low: null };
}
