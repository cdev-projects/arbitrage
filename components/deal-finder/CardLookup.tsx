'use client';

import { useState, useEffect, useRef } from 'react';

interface TcgSet {
  id:   string;
  name: string;
  code: string;
}

interface TcgCard {
  id:        string;
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
  }) => void;
  watchlistCount: number;
  maxWatchlist:   number;
}

const GAMES = [
  { value: 'pokemon',  label: 'Pokémon' },
  { value: 'onepiece', label: 'One Piece' },
  { value: 'sports',   label: 'Sports Cards' },
];

const CONDITIONS = ['NM', 'LP', 'MP', 'HP'] as const;

function artClass(game: string) {
  if (game === 'pokemon')  return 'art-pokemon';
  if (game === 'onepiece') return 'art-onepiece';
  return 'art-sports';
}

export default function CardLookup({ onAdd, watchlistCount, maxWatchlist }: Props) {
  const [game, setGame]       = useState('');
  const [sets, setSets]       = useState<TcgSet[]>([]);
  const [setId, setSetId]     = useState('');
  const [setName, setSetName] = useState('');
  const [query, setQuery]     = useState('');
  const [cards, setCards]     = useState<TcgCard[]>([]);
  const [selCard, setSelCard] = useState<SelectedCard | null>(null);
  const [condition, setCond]  = useState<string>('NM');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch sets when game changes
  useEffect(() => {
    if (!game) { setSets([]); setSetId(''); setCards([]); setSelCard(null); return; }
    fetch(`/api/sets?game=${game}`)
      .then((r) => r.json())
      .then(setSets)
      .catch(console.error);
  }, [game]);

  // Debounced card search
  useEffect(() => {
    if (!game || !setId || !query.trim()) { setCards([]); setSelCard(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cards?game=${game}&set=${encodeURIComponent(setId)}&q=${encodeURIComponent(query)}`);
        const data: TcgCard[] = await res.json();
        setCards(data);
        if (data.length === 1) pickCard(data[0]);
        else setSelCard(null);
      } finally {
        setLoading(false);
      }
    }, 250);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, setId, query]);

  function pickCard(card: TcgCard) {
    setSelCard({ ...card, game, setId, setName, art: card.art ?? '?' });
    setCond('NM');
  }

  function handleAdd() {
    if (!selCard || watchlistCount >= maxWatchlist) return;
    onAdd({
      game:       selCard.game,
      set:        selCard.setName,
      cardNumber: selCard.number,
      cardName:   selCard.name,
      rarity:     selCard.rarity,
      condition,
      tcgMarket:  selCard.prices.market ?? 0,
      tcgLow:     selCard.prices.low ?? 0,
      art:        selCard.art,
    });
    setQuery('');
    setSelCard(null);
    setCards([]);
  }

  const canAdd = !!selCard && watchlistCount < maxWatchlist;

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
            onChange={(e) => { setGame(e.target.value); setSetId(''); setSetName(''); setQuery(''); setSelCard(null); }}
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
              const s = sets.find((x) => x.id === e.target.value);
              setSetId(e.target.value);
              setSetName(s?.name ?? '');
              setQuery('');
              setSelCard(null);
            }}
          >
            <option value="">Select a set…</option>
            {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Card search */}
        <div className="fw">
          <span className="flabel">Card name or number</span>
          <input
            type="text"
            placeholder="e.g. Charizard or 004/102"
            disabled={!setId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Card results dropdown (when multiple matches) */}
        {cards.length > 1 && !selCard && (
          <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 9 }}>
            {cards.slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => pickCard(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 10px',
                  background: 'transparent', border: 'none',
                  borderBottom: '0.5px solid var(--border)',
                  cursor: 'pointer', textAlign: 'left', fontSize: 13,
                }}
              >
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--muted)', width: 70 }}>
                  {c.number}
                </span>
                <span style={{ flex: 1, color: 'var(--ink)', fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--muted)' }}>
                  {c.prices.market != null ? `$${c.prices.market}` : '—'}
                </span>
              </button>
            ))}
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
                  {selCard.prices.market != null && (
                    <span className="pill pill-tcg">TCG ${selCard.prices.market}</span>
                  )}
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
          <i className="ti ti-plus" aria-hidden="true" /> Add to watchlist
        </button>
      </div>
    </div>
  );
}
