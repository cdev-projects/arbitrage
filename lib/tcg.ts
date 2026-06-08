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
    headers: { 'X-API-Key': apiKey },
    next: { revalidate: 86400 }, // Next.js fetch cache — 24h
  });

  if (!res.ok) throw new Error(`TCG API error: ${res.status} ${path}`);

  const data = await res.json();
  cache.set(path, { data, expiresAt: Date.now() + TTL_MS });
  return data as T;
}

export interface TcgSet {
  id:          number;
  name:        string;
  code:        string;
  releaseDate: string | null;
}

export interface TcgCard {
  id:        number;
  name:      string;
  number:    string;
  rarity:    string;
  image:     string | null;
  prices: {
    market: number | null;
    low:    number | null;
    foil:   number | null;
  };
}

// Raw shapes returned by api.tcgapi.dev — responses are wrapped as { data, meta, rate_limit }
// per the official docs: https://tcgapi.dev/api/sets/, /api/cards/, /api/search/
interface RawSet {
  id:           number;
  name:         string;
  slug:         string;
  release_date: string | null;
  game_slug?:   string;
  game_name?:   string;
}

interface RawCard {
  id:            number;
  name:          string;
  number?:       string;
  rarity?:       string;
  image_url?:    string | null;
  product_type?: string | null;
  // Returned inline by /search and /sets/:id/cards (one row per printing)
  market_price?: number | null;
  low_price?:    number | null;
  printing?:     string;
}

interface RawPrice {
  printing:     string;
  market_price: number | null;
  low_price:    number | null;
}

interface RawMeta {
  total:    number;
  page:     number;
  per_page: number;
  has_more: boolean;
}

const GAME_MAP: Record<string, string> = {
  pokemon:  'pokemon',
  onepiece: 'one-piece',
};

export async function getSets(game: string): Promise<TcgSet[]> {
  const tcgGame = GAME_MAP[game] ?? game;
  const data = await tcgFetch<{ data: RawSet[] }>(`/sets?game=${tcgGame}&per_page=100`);
  const raw = data.data ?? [];
  const filtered = raw.filter((s) => {
    if (!s.game_slug) return true;
    const matches = s.game_slug === tcgGame;
    if (!matches) console.warn(`[getSets] upstream returned set "${s.slug}" with game_slug="${s.game_slug}", expected "${tcgGame}" — filtered out`);
    return matches;
  });
  return filtered
    .map((s) => ({ id: s.id, name: s.name, code: s.slug, releaseDate: s.release_date }))
    .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
}

/** Strip trailing artifacts the TCG API sometimes embeds in names:
 *  "Charizard ex 006/165" → "Charizard ex"
 *  "Pikachu SWSH050"      → "Pikachu"
 *  "Luffy - "             → "Luffy"
 */
function cleanName(raw: string): string {
  return raw
    .replace(/\s+\d{1,4}\/\d{1,4}$/, '')   // trailing number/total  e.g. 006/165
    .replace(/\s+[A-Z]{2,5}\d{3,}$/, '')    // trailing promo code    e.g. SWSH050
    .replace(/\s*-\s*$/, '')                 // trailing dash          e.g. " - "
    .trim();
}

function toCard(c: RawCard): TcgCard {
  const isFoil = (c.printing ?? '').toLowerCase().includes('foil') || (c.printing ?? '').toLowerCase().includes('holo');
  return {
    id:     c.id,
    name:   cleanName(c.name),
    number: c.number ?? '',
    rarity: c.rarity ?? '',
    image:  c.image_url ?? null,
    prices: {
      market: !isFoil ? c.market_price ?? null : null,
      low:    !isFoil ? c.low_price ?? null : null,
      foil:   isFoil ? c.market_price ?? null : null,
    },
  };
}

function mergeByPrinting(raws: RawCard[]): TcgCard[] {
  const byId = new Map<number, TcgCard>();
  for (const raw of raws) {
    const card = toCard(raw);
    const existing = byId.get(card.id);
    if (existing) {
      existing.prices.market = existing.prices.market ?? card.prices.market;
      existing.prices.low    = existing.prices.low ?? card.prices.low;
      existing.prices.foil   = existing.prices.foil ?? card.prices.foil;
    } else {
      byId.set(card.id, card);
    }
  }
  return [...byId.values()];
}

// GET /v1/search — real full-text search, min 2 chars, prices included inline
export async function searchCards(game: string, query: string, setId?: number | string): Promise<TcgCard[]> {
  if (query.trim().length < 2) return [];
  const tcgGame = GAME_MAP[game] ?? game;
  const params = new URLSearchParams({ q: query, game: tcgGame, type: 'Cards', per_page: '25' });
  if (setId != null) params.set('set_id', String(setId));
  const data = await tcgFetch<{ data: RawCard[] }>(`/search?${params}`);
  return mergeByPrinting(data.data ?? []);
}

// GET /v1/sets/:id/cards — browse all cards in a set, paginated (250 per page max)
export async function getSetCards(
  setId: number | string,
  page = 1,
): Promise<{ cards: TcgCard[]; hasMore: boolean; nextPage: number | null; total: number }> {
  const data = await tcgFetch<{ data: RawCard[]; meta: RawMeta }>(
    `/sets/${setId}/cards?per_page=250&type=Cards&page=${page}&sort_by=number&sort_order=desc`,
  );
  const singles = (data.data ?? []).filter((c) => {
    if (c.product_type && c.product_type !== 'Cards') return false;
    if (!c.number) return false;
    return true;
  });
  const cards = mergeByPrinting(singles);
  const hasMore = data.meta?.has_more ?? false;
  return { cards, hasMore, nextPage: hasMore ? page + 1 : null, total: data.meta?.total ?? cards.length };
}

export interface TopMover {
  cardId:    number;
  name:      string;
  game:      string;
  setName:   string;
  number:    string;
  image:     string | null;
  price:     number | null;
  changePct: number | null;
  trend:     'up' | 'dn';
}

interface RawMover {
  id:                number;
  name:              string;
  game_name?:        string;
  set_name?:         string;
  number?:           string;
  image_url?:        string | null;
  market_price?:     number | null;
  price_change_24h?: number | null;
  price_change_7d?:  number | null;
  price_change_30d?: number | null;
}

// GET /v1/prices/top-movers — biggest price swings over a period, available on the free tier
export async function getTopMovers(opts: {
  game?:      string;
  direction?: 'gainers' | 'losers';
  period?:    '24h' | '7d' | '30d';
  limit?:     number;
} = {}): Promise<TopMover[]> {
  const { game, direction = 'gainers', period = '7d', limit = 10 } = opts;
  const params = new URLSearchParams({ direction, period, limit: String(limit) });
  if (game) params.set('game', GAME_MAP[game] ?? game);
  const data = await tcgFetch<{ data: RawMover[] }>(`/prices/top-movers?${params}`);
  const changeKey = period === '24h' ? 'price_change_24h' : period === '30d' ? 'price_change_30d' : 'price_change_7d';
  return (data.data ?? []).map((m) => {
    const change = (m[changeKey as keyof RawMover] as number | null | undefined) ?? null;
    return {
      cardId:    m.id,
      name:      m.name,
      game:      m.game_name ?? '',
      setName:   m.set_name ?? '',
      number:    m.number ?? '',
      image:     m.image_url ?? null,
      price:     m.market_price ?? null,
      changePct: change,
      trend:     ((change ?? 0) >= 0 ? 'up' : 'dn') as 'up' | 'dn',
    };
  });
}

// GET /v1/cards/:id/prices — authoritative per-printing price lookup for a known card
export async function getCardPrice(cardId: number | string): Promise<{ market: number | null; low: number | null }> {
  const data = await tcgFetch<{ data: RawPrice | RawPrice[] }>(`/cards/${cardId}/prices`);
  const list = Array.isArray(data.data) ? data.data : [data.data];
  const normal = list.find((p) => p && !p.printing?.toLowerCase().includes('foil') && !p.printing?.toLowerCase().includes('holo'));
  const raw = normal ?? list[0];
  if (!raw) return { market: null, low: null };
  return { market: raw.market_price ?? null, low: raw.low_price ?? null };
}
