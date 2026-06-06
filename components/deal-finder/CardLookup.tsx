'use client';

import { useState, useEffect } from 'react';

interface TcgSet {
  id:   string | number;
  name: string;
  code: string;
}

interface TcgCard {
  id:        string | number;
  name:      string;
  number:    string;
  rarity:    string;
  art?:      string;
  prices: {
    market: number | null;
    low:    number | null;
    foil:   number | null;
  };
}

interface SelectedCard extends TcgCard {
  game:    string;
  setId:   string;
  setName: string;
  art:     string;
}

interface WatchlistEntry {
  game:       string;
  set:        string;
  cardNumber: string;
  condition:  string;
}

interface Props {
  onAdd: (card: {
    game:       string;
    set:        string;
    cardNumber: string;
    cardName:   string;
    rarity:     string;
    condition:  string;
    tcgMarket:  number;
    tcgLow:     number;
    art:        string;
    tcgCardId:  string;
  }) => void;
  watchlist:      WatchlistEntry[];
  watchlistCount: number;
  maxWatchlist:   number;
}

const GAMES = [
  { value: 'pokemon',  label: 'Pokémon' },
  { value: 'onepiece', label: 'One Piece' },
];

const CONDITIONS = ['NM', 'LP', 'MP', 'HP'] as const;

// Standard TCG condition price multipliers relative to NM market price
const COND_MULTIPLIER: Record<string, number> = {
  NM: 1.00,
  LP: 0.85,
  MP: 0.70,
  HP: 0.50,
};

function artClass(game: string) {
  if (game === 'pokemon')  return 'art-pokemon';
  if (game === 'onepiece') return 'art-onepiece';
  return 'art-sports';
}

export default function CardLookup({ onAdd, watchlist, watchlistCount, maxWatchlist }: Props) {
  const [game, setGame]       = useState('');
  const [sets, setSets]       = useState<TcgSet[]>([]);
  const [setId, setSetId]     = useState('');
  const [setName, setSetName] = useState('');
  const [query, setQuery]     = useState('');
  const [cards, setCards]     = useState<TcgCard[]>([]);
  const [selCard, setSelCard] = useState<SelectedCard | null>(null);
  const [condition, setCond]  = useState<string>('NM');
  const [loading, setLoading] = useState(false);

  // Fetch sets when game changes
  useEffect(() => {
    if (!game) { setSets([]); setSetId(''); setQuery(''); setCards([]); setSelCard(null); return; }
    fetch(`/api/sets?game=${game}`)
      .then((r) => r.json())
      .then(setSets)
      .catch(console.error);
  }, [game]);

  // Debounced card search — fires 400 ms after the user stops typing
  useEffect(() => {
    if (!game || query.trim().length < 2) { setCards([]); setSelCard(null); return; }
    const id = setTimeout(() => {
      setLoading(true);
      setSelCard(null);
      const params = new URLSearchParams({ game, q: query });
      if (setId) params.set('set', setId);
      fetch(`/api/cards?${params}`)
        .then((r) => r.json())
        .then((data: TcgCard[]) => setCards(Array.isArray(data) ? data : []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(id);
  }, [game, setId, query]);

  function pickCard(card: TcgCard) {
    setSelCard({ ...card, game, setId, setName, art: card.art ?? '?' });
    setCond('NM');
  }

  function handleAdd() {
    if (!selCard || watchlistCount >= maxWatchlist) return;
    const mult      = COND_MULTIPLIER[condition] ?? 1;
    const nmMarket  = selCard.prices.market ?? selCard.prices.foil ?? 0;
    const nmLow     = selCard.prices.low ?? 0;
    onAdd({
      game:       selCard.game,
      set:        selCard.setName,
      cardNumber: selCard.number,
      cardName:   selCard.name,
      rarity:     selCard.rarity,
      condition,
      tcgMarket:  Math.round(nmMarket * mult * 100) / 100,
      tcgLow:     Math.round(nmLow    * mult * 100) / 100,
      art:        selCard.art,
      tcgCardId:  String(selCard.id),
    });
  }

  const alreadyAdded = !!selCard && watchlist.some(
    (w) => w.game === selCard.game && w.set === selCard.setName &&
           w.cardNumber === selCard.number && w.condition === condition,
  );
  const canAdd = !!selCard && watchlistCount < maxWatchlist && !alreadyAdded;

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Card lookup</span>
      </div>
      <div className="panel-body">
        {/* Game */}
        <div className="fw">
          <span className="flabel">Game</span>
          <select
            value={game}
            onChange={(e) => { setGame(e.target.value); setSetId(''); setSetName(''); setQuery(''); setCards([]); setSelCard(null); }}
          >
            <option value="">Select a game…</option>
            {GAMES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>

        {/* Set */}
        <div className="fw">
          <span className="flabel">Set</span>
          <select
            value={setId}
            disabled={!game || sets.length === 0}
            onChange={(e) => {
              const s = sets.find((x) => String(x.id) === e.target.value);
              setSetId(e.target.value);
              setSetName(s?.name ?? '');
              setQuery('');
              setCards([]);
              setSelCard(null);
            }}
          >
            <option value="">Select a set…</option>
            {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Card search */}
        <div className="fw">
          <span className="flabel">Search</span>
          <input
            type="text"
            placeholder={game ? 'Type a card name…' : 'Select a game first'}
            disabled={!game}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelCard(null); }}
          />
        </div>

        {/* Results */}
        {(loading || cards.length > 0 || query.trim().length >= 2) && (
          <div className="fw">
            <span className="flabel">Card</span>
            <select
              value={selCard?.id ?? ''}
              disabled={loading || cards.length === 0}
              onChange={(e) => {
                const c = cards.find((x) => String(x.id) === e.target.value);
                if (c) pickCard(c);
              }}
            >
              <option value="">
                {loading ? 'Searching…' : cards.length === 0 ? 'No results' : 'Select a card…'}
              </option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.number ? `${c.number} — ${c.name}` : c.name}
                  {(c.prices.market ?? c.prices.foil) != null ? `  ($${c.prices.market ?? c.prices.foil})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Card preview */}
        {selCard && (
          <div className="card-preview">
            <div className="cp-top">
              <div className={`cp-art ${artClass(selCard.game)}`}>{selCard.art}</div>
              <div>
                <div className="cp-name">{selCard.name}</div>
                <div className="cp-meta">{selCard.number} · {selCard.setName}</div>
                <div className="cp-pills">
                  <span className="pill pill-rarity">{selCard.rarity}</span>
                  {(selCard.prices.market ?? selCard.prices.foil) != null && (() => {
                    const nm   = selCard.prices.market ?? selCard.prices.foil ?? 0;
                    const price = Math.round(nm * (COND_MULTIPLIER[condition] ?? 1) * 100) / 100;
                    return <span className="pill pill-tcg">TCG ${price}</span>;
                  })()}
                </div>
              </div>
            </div>
            <div className="cond-row">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  className={`cond-btn ${condition === c ? 'sel' : ''}`}
                  onClick={() => setCond(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="btn-add" disabled={!canAdd} onClick={handleAdd}>
          <i className="ti ti-plus" aria-hidden="true" />
          {alreadyAdded ? 'Already in watchlist' : 'Add to watchlist'}
        </button>
      </div>
    </div>
  );
}
