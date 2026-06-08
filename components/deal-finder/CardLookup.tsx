'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import CardGrid, { TcgCard } from './CardGrid';

export interface TcgSet {
  id:   string | number;
  name: string;
  code: string;
}

interface ActiveCard extends TcgCard {
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

interface PagedResponse {
  cards:    TcgCard[];
  hasMore:  boolean;
  nextPage: number | null;
  total:    number;
}

export interface CardLookupFormState {
  game:          string;
  sets:          TcgSet[];
  setId:         string;
  setName:       string;
  query:         string;
  onGameChange:  (game: string) => void;
  onSetChange:   (id: string, name: string) => void;
  onQueryChange: (q: string) => void;
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
    imageUrl?:  string | null;
    tcgCardId:  string;
  }) => void;
  watchlist:        WatchlistEntry[];
  watchlistCount:   number;
  maxWatchlist:     number;
  onPreviewChange?: (number: string | null) => void;
  formState?:       CardLookupFormState;
}

const GAMES = [
  { value: 'pokemon',  label: 'Pokémon' },
  { value: 'onepiece', label: 'One Piece' },
];

const CONDITIONS = ['NM', 'LP', 'MP', 'HP'] as const;

const COND_MULTIPLIER: Record<string, number> = {
  NM: 1.00, LP: 0.85, MP: 0.70, HP: 0.50,
};

/** Sort by market price descending — works correctly on any paginated subset. */
function sortCardsDesc(cards: TcgCard[]): TcgCard[] {
  return [...cards].sort((a, b) => {
    const pa = a.prices.market ?? a.prices.foil ?? -1;
    const pb = b.prices.market ?? b.prices.foil ?? -1;
    return pb - pa;
  });
}

// Popover dimensions for positioning math
const POP_PANEL_W = 240;
const POP_IMG_W   = 240;
const POP_W       = POP_PANEL_W + POP_IMG_W + 1; // +1 for divider
const POP_H       = 320; // approximate — used for vertical clamping

export default function CardLookup({ onAdd, watchlist, watchlistCount, maxWatchlist, onPreviewChange, formState }: Props) {
  const controlled = !!formState;

  // Standalone-mode form state
  const [localGame, setLocalGame]       = useState('');
  const [localSets, setLocalSets]       = useState<TcgSet[]>([]);
  const [localSetId, setLocalSetId]     = useState('');
  const [localSetName, setLocalSetName] = useState('');
  const [localQuery, setLocalQuery]     = useState('');

  // Resolved form values
  const game    = controlled ? formState.game    : localGame;
  const sets    = controlled ? formState.sets    : localSets;
  const setId   = controlled ? formState.setId   : localSetId;
  const setName = controlled ? formState.setName : localSetName;
  const query   = controlled ? formState.query   : localQuery;

  // Card / pagination state
  const [cards, setCards]             = useState<TcgCard[]>([]);
  const [hasMore, setHasMore]         = useState(false);
  const [nextPage, setNextPage]       = useState<number | null>(null);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Panel state — shown on hover
  const [hoverCard, setHoverCard]     = useState<ActiveCard | null>(null);
  const [hoverRect, setHoverRect]     = useState<DOMRect | null>(null);
  const [condition,  setCond]         = useState<string>('NM');
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHide = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    leaveTimer.current = setTimeout(() => {
      setHoverCard(null);
      setHoverRect(null);
    }, 160);
  }, [cancelHide]);

  /** Show panel on hover */
  const handleHoverCard = useCallback((card: TcgCard, rect: DOMRect) => {
    cancelHide();
    setHoverCard({ ...card, game, setId, setName, art: '?' });
    setHoverRect(rect);
  }, [game, setId, setName, cancelHide]);

  /** Schedule panel hide when mouse leaves the card */
  const handleLeaveCard = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  /** Dismiss panel entirely (× button) */
  const dismissPopover = useCallback(() => {
    cancelHide();
    setHoverCard(null);
    setHoverRect(null);
  }, [cancelHide]);

  /** Add the currently hovered card at the selected condition */
  const handleAddCard = useCallback((card: TcgCard) => {
    if (watchlistCount >= maxWatchlist) return;
    const mult     = COND_MULTIPLIER[condition] ?? 1;
    const nmMarket = card.prices.market ?? card.prices.foil ?? 0;
    const nmLow    = card.prices.low ?? 0;
    onAdd({
      game,
      set:        setName,
      cardNumber: card.number,
      cardName:   card.name,
      rarity:     card.rarity,
      condition,
      tcgMarket:  Math.round(nmMarket * mult * 100) / 100,
      tcgLow:     Math.round(nmLow    * mult * 100) / 100,
      art:        '?',
      imageUrl:   card.image,
      tcgCardId:  String(card.id),
    });
  }, [game, setName, condition, watchlistCount, maxWatchlist, onAdd]);

  // Standalone mode: fetch sets when local game changes
  useEffect(() => {
    if (controlled) return;
    if (!localGame) { setLocalSets([]); setLocalSetId(''); setLocalQuery(''); setCards([]); dismissPopover(); return; }
    fetch(`/api/sets?game=${localGame}`)
      .then((r) => r.json())
      .then(setLocalSets)
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled, localGame]);

  // Notify parent when hovered card changes
  useEffect(() => {
    onPreviewChange?.(hoverCard?.number ?? null);
  }, [hoverCard, onPreviewChange]);

  // Card fetch
  useEffect(() => {
    if (!game) { setCards([]); dismissPopover(); return; }
    const hasQuery = query.trim().length >= 2;
    if (!setId && !hasQuery) { setCards([]); dismissPopover(); return; }

    setCards([]); setHasMore(false); setNextPage(null); setTotal(0); dismissPopover();

    if (!hasQuery) {
      setLoading(true);
      fetch(`/api/cards?${new URLSearchParams({ game, set: setId, page: '1' })}`)
        .then((r) => r.json())
        .then((data: PagedResponse) => {
          setCards(sortCardsDesc(data.cards ?? []));
          setHasMore(data.hasMore);
          setNextPage(data.nextPage);
          setTotal(data.total ?? 0);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
      return;
    }

    const tid = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ game, q: query });
      if (setId) params.set('set', setId);
      fetch(`/api/cards?${params}`)
        .then((r) => r.json())
        .then((data: PagedResponse) => {
          setCards(sortCardsDesc(data.cards ?? []));
          setHasMore(data.hasMore);
          setNextPage(data.nextPage);
          setTotal(data.total ?? 0);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(tid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, setId, query]);

  const handleLoadMore = useCallback(() => {
    if (!nextPage || loadingMore || !setId) return;
    setLoadingMore(true);
    fetch(`/api/cards?${new URLSearchParams({ game, set: setId, page: String(nextPage) })}`)
      .then((r) => r.json())
      .then((data: PagedResponse) => {
        setCards((prev) => sortCardsDesc([...prev, ...(data.cards ?? [])]));
        setHasMore(data.hasMore);
        setNextPage(data.nextPage);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  }, [game, setId, nextPage, loadingMore]);


  const watchlistNumbers = useMemo(() => {
    const s = new Set<string>();
    for (const w of watchlist) {
      if (w.game === game) s.add(w.cardNumber);
    }
    return s;
  }, [watchlist, game]);

  const showGrid = !!(setId || loading || cards.length > 0 || query.trim().length >= 2);

  // ── Floating card popover (panel left, image right) ──────────────────────
  const pickPopover = (() => {
    if (!hoverCard || !hoverRect) return null;

    // Horizontal: prefer right of cell, flip left if it would overflow
    const spaceRight = window.innerWidth - hoverRect.right - 12;
    const spaceLeft  = hoverRect.left - 12;
    const popLeft    = spaceRight >= POP_W
      ? hoverRect.right + 12
      : spaceLeft >= POP_W
        ? hoverRect.left - POP_W - 12
        : Math.max(8, window.innerWidth - POP_W - 8);

    // Vertical: centre on the card, clamped to viewport
    const rawTop = hoverRect.top + hoverRect.height / 2;
    const popTop = Math.max(POP_H / 2 + 8, Math.min(rawTop, window.innerHeight - POP_H / 2 - 8));

    const nm    = hoverCard.prices.market ?? hoverCard.prices.foil ?? 0;
    const price = nm > 0 ? Math.round(nm * (COND_MULTIPLIER[condition] ?? 1) * 100) / 100 : null;

    return (
      <div
        className="card-pick-pop"
        style={{ top: popTop, left: popLeft }}
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
      >
        {/* ── Left: details panel ── */}
        <div className="cpp-panel">
          <button className="cpp-dismiss" onClick={dismissPopover} aria-label="Dismiss">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
          <div className="cpp-name">{hoverCard.name}</div>
          <div className="cpp-meta">{hoverCard.number} · {hoverCard.setName}</div>
          <div className="cpp-conds">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                className={`cpp-cond${condition === c ? ' sel' : ''}`}
                onClick={() => setCond(c)}
              >
                {c}
              </button>
            ))}
          </div>
          {price != null && <div className="cpp-price">TCG ${price.toFixed(2)}</div>}
        </div>

        {/* ── Right: enlarged card image ── */}
        {hoverCard.image && (
          <div className="cpp-img">
            <img src={hoverCard.image} alt={hoverCard.name} />
          </div>
        )}
      </div>
    );
  })();

  // Shared CardGrid props
  const gridProps = {
    cards,
    hasMore,
    isLoading:        loading || loadingMore,
    total,
    query,
    wishlistCount:    watchlistNumbers.size,
    onLoadMore:       handleLoadMore,
    watchlistNumbers,
    onHoverCard:      handleHoverCard,
    onLeaveCard:      handleLeaveCard,
    onAddCard:        handleAddCard,
  };

  // ── Controlled mode ───────────────────────────────────────────────────────
  if (controlled) {
    return (
      <>
        {showGrid
          ? <CardGrid {...gridProps} query={query} />
          : (
            <div className="vg-empty">
              <div className="vg-empty-head">No cards yet</div>
              Select a set or type a card name above to start browsing.
            </div>
          )
        }
        {pickPopover}
      </>
    );
  }

  // ── Standalone mode ───────────────────────────────────────────────────────
  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Card lookup</span>
        </div>
        <div className="panel-body">
          <div className="fw">
            <span className="flabel">Game</span>
            <select value={localGame} onChange={(e) => {
              setLocalGame(e.target.value);
              setLocalSetId(''); setLocalSetName(''); setLocalQuery('');
              setCards([]); dismissPopover();
            }}>
              <option value="">Select a game…</option>
              {GAMES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="fw">
            <span className="flabel">Set</span>
            <select value={localSetId} disabled={!localGame || sets.length === 0}
              onChange={(e) => {
                const s = sets.find((x) => String(x.id) === e.target.value);
                setLocalSetId(e.target.value); setLocalSetName(s?.name ?? '');
                setLocalQuery(''); setCards([]); dismissPopover();
              }}>
              <option value="">Select a set…</option>
              {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="fw" style={{ marginBottom: showGrid ? 0 : 9 }}>
            <span className="flabel">Search</span>
            <input type="text"
              placeholder={!localGame ? 'Select a game first' : localSetId ? 'Filter by name…' : 'Type a card name…'}
              disabled={!localGame} value={localQuery}
              onChange={(e) => { setLocalQuery(e.target.value); dismissPopover(); }}
            />
          </div>
        </div>
        {showGrid && <CardGrid {...gridProps} query={localQuery} />}
      </div>
      {pickPopover}
    </>
  );
}
