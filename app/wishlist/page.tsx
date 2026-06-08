'use client';

import { useState, useEffect, useCallback } from 'react';
import CardLookup, { TcgSet, CardLookupFormState } from '@/components/deal-finder/CardLookup';
import Watchlist from '@/components/deal-finder/Watchlist';

interface WishlistMeta {
  id:        string;
  name:      string;
  cardCount: number;
}

interface WatchlistCard {
  id:         string;
  wishlistId: string | null;
  tcgCardId?: string | null;
  game:       string;
  set:        string;
  cardNumber: string;
  cardName:   string;
  rarity:     string;
  condition:  string;
  tcgMarket:  number;
  tcgLow:     number;
  art:        string;
  imageUrl?:  string | null;
}

const MAX_PER_WISHLIST = 20;

const GAMES = [
  { value: 'pokemon',  label: 'Pokémon' },
  { value: 'onepiece', label: 'One Piece' },
];

export default function WishlistPage() {
  // ── Wishlist management ─────────────────────────────────────────────────────
  const [wishlists,    setWishlists]    = useState<WishlistMeta[]>([]);
  const [selectedId,   setSelectedId]   = useState('');
  const [cards,        setCards]        = useState<WatchlistCard[]>([]);
  const [dbAvailable,  setDbAvailable]  = useState(true);
  const [previewedNum, setPreviewedNum] = useState<string | null>(null);
  const [creating,     setCreating]     = useState(false);

  // ── Form state (controlled, lifted above the two-column layout) ─────────────
  const [game,    setGame]    = useState('');
  const [sets,    setSets]    = useState<TcgSet[]>([]);
  const [setId,   setSetId]   = useState('');
  const [setName, setSetName] = useState('');
  const [query,   setQuery]   = useState('');

  // Fetch sets when game changes
  useEffect(() => {
    if (!game) { setSets([]); setSetId(''); setSetName(''); setQuery(''); return; }
    fetch(`/api/sets?game=${game}`)
      .then((r) => r.json())
      .then(setSets)
      .catch(console.error);
  }, [game]);

  // ── Wishlist load & auto-create ─────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/wishlists')
      .then((r) => {
        if (!r.ok) throw new Error('DB unavailable');
        return r.json();
      })
      .then(async (list: WishlistMeta[]) => {
        if (list.length === 0) {
          const res = await fetch('/api/wishlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My Watch List' }),
          });
          const created: WishlistMeta = await res.json();
          setWishlists([{ ...created, cardCount: 0 }]);
          setSelectedId(created.id);
        } else {
          setWishlists(list);
          setSelectedId(list[0].id);
        }
      })
      .catch(() => setDbAvailable(false));
  }, []);

  // Load cards when selected wishlist changes
  useEffect(() => {
    if (!selectedId || !dbAvailable) return;
    fetch(`/api/wishlists/${selectedId}/cards`)
      .then((r) => r.json())
      .then((data: WatchlistCard[]) => setCards(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [selectedId, dbAvailable]);

  const handleAdd = useCallback(async (card: {
    game: string; set: string; cardNumber: string; cardName: string;
    rarity: string; condition: string; tcgMarket: number; tcgLow: number;
    art: string; imageUrl?: string | null; tcgCardId: string;
  }) => {
    if (!dbAvailable) {
      setCards((prev) => {
        const dup = prev.find((c) => c.game === card.game && c.set === card.set && c.cardNumber === card.cardNumber && c.condition === card.condition);
        return dup ? prev : [...prev, { ...card, id: `local-${Date.now()}`, wishlistId: null }];
      });
      return;
    }
    try {
      const res = await fetch(`/api/wishlists/${selectedId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(error ?? 'Failed to add card');
        return;
      }
      const created: WatchlistCard = await res.json();
      setCards((prev) => [...prev, created]);
      setWishlists((prev) => prev.map((w) => w.id === selectedId ? { ...w, cardCount: Number(w.cardCount) + 1 } : w));
    } catch {
      alert('Failed to add card');
    }
  }, [dbAvailable, selectedId]);

  const handleRemove = useCallback(async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    setWishlists((prev) => prev.map((w) => w.id === selectedId ? { ...w, cardCount: Math.max(0, Number(w.cardCount) - 1) } : w));
    if (!dbAvailable || id.startsWith('local-')) return;
    await fetch(`/api/wishlists/${selectedId}/cards/${id}`, { method: 'DELETE' }).catch(console.error);
  }, [dbAvailable, selectedId]);

  const handleNewWishlist = useCallback(async () => {
    const name = prompt('Watch list name:')?.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/wishlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const created: WishlistMeta = await res.json();
      setWishlists((prev) => [...prev, { ...created, cardCount: 0 }]);
      setSelectedId(created.id);
      setCards([]);
    } catch {
      alert('Failed to create wishlist');
    } finally {
      setCreating(false);
    }
  }, []);

  const watchlistEntries = cards.map((c) => ({
    game: c.game, set: c.set, cardNumber: c.cardNumber, condition: c.condition,
  }));

  const formState: CardLookupFormState = {
    game, sets, setId, setName, query,
    onGameChange:  (g) => { setGame(g); setSetId(''); setSetName(''); setQuery(''); },
    onSetChange:   (id, name) => { setSetId(id); setSetName(name); setQuery(''); },
    onQueryChange: (q) => setQuery(q),
  };

  return (
    <div className="page">
      {/* Page header */}
      <div style={{ padding: '1.5rem 0 1.25rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="db-eyebrow">Deal finder · Phase 1</div>
          <div className="db-title">Build your <em>watch list</em></div>
        </div>
        <a
          href={selectedId && cards.length > 0 ? `/scan?wishlist=${selectedId}` : '/scan'}
          className={`btn-scan-link${!selectedId || cards.length === 0 ? ' disabled' : ''}`}
          onClick={(e) => { if (!selectedId || cards.length === 0) e.preventDefault(); }}
        >
          <i className="ti ti-search" aria-hidden="true" />
          Scan for deals
        </a>
      </div>

      {!dbAvailable && (
        <div style={{ marginBottom: '1rem', padding: '10px 14px', background: 'var(--amber-light)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--amber-mid)', fontSize: 13, color: 'var(--amber)' }}>
          <strong>Database not configured</strong> — add <code>DATABASE_URL</code> to <code>.env.local</code> to persist wishlists.
        </div>
      )}

      {/* Wishlist selector */}
      {dbAvailable && (
        <div className="wl-selector-row" style={{ marginBottom: '1rem' }}>
          <select
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setCards([]); }}
            style={{ height: 36, borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', background: 'var(--surface-secondary)', border: '0.5px solid var(--border)', color: 'var(--ink)', padding: '0 10px', flex: 1, outline: 'none' }}
          >
            {wishlists.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.cardCount} cards)</option>
            ))}
          </select>
          <button className="btn-new-wl" onClick={handleNewWishlist} disabled={creating}>
            <i className="ti ti-plus" aria-hidden="true" />
            New watch list
          </button>
        </div>
      )}

      {/* Horizontal form row — spans full width above both panels */}
      <div className="browse-form-row">
        <div className="fw" style={{ margin: 0 }}>
          <span className="flabel">Game</span>
          <select value={game} onChange={(e) => formState.onGameChange(e.target.value)}>
            <option value="">Select a game…</option>
            {GAMES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div className="fw" style={{ margin: 0 }}>
          <span className="flabel">Set</span>
          <select
            value={setId}
            disabled={!game || sets.length === 0}
            onChange={(e) => {
              const s = sets.find((x) => String(x.id) === e.target.value);
              formState.onSetChange(e.target.value, s?.name ?? '');
            }}
          >
            <option value="">{!game ? 'Select a game first…' : 'Select a set…'}</option>
            {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="fw" style={{ margin: 0 }}>
          <span className="flabel">Filter</span>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder={!game ? 'Select a game first…' : setId ? 'Filter by name…' : 'Type a card name…'}
              disabled={!game}
              value={query}
              onChange={(e) => formState.onQueryChange(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', alignItems: 'start' }}>
        {/* Left: card grid panel */}
        <div className="panel" style={{ background: 'var(--surface-secondary)', border: '0.5px solid var(--border)' }}>
          <CardLookup
            formState={formState}
            onAdd={handleAdd}
            watchlist={watchlistEntries}
            watchlistCount={cards.length}
            maxWatchlist={MAX_PER_WISHLIST}
            onPreviewChange={setPreviewedNum}
          />
        </div>

        {/* Right: wishlist panel */}
        <Watchlist
          cards={cards}
          onRemove={handleRemove}
          previewedNumber={previewedNum ?? undefined}
          maxCount={MAX_PER_WISHLIST}
        />
      </div>
    </div>
  );
}
