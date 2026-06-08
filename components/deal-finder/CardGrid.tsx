'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface TcgCard {
  id:      string | number;
  name:    string;
  number:  string;
  rarity:  string;
  image:   string | null;
  prices:  { market: number | null; low: number | null; foil: number | null };
}

interface CardGridProps {
  cards:            TcgCard[];
  hasMore:          boolean;
  isLoading:        boolean;
  total:            number;
  query:            string;
  wishlistCount:    number;
  onLoadMore:       () => void;
  watchlistNumbers: Set<string>;
  onHoverCard?:     (card: TcgCard, rect: DOMRect) => void;
  onLeaveCard?:     () => void;
  onAddCard?:       (card: TcgCard) => void;
}

export default function CardGrid({
  cards, hasMore, isLoading, total, query, wishlistCount,
  onLoadMore, watchlistNumbers,
  onHoverCard, onLeaveCard, onAddCard,
}: CardGridProps) {
  const gridRef     = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const grid     = gridRef.current;
    if (!sentinel || !grid) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !isLoading) onLoadMore(); },
      { root: grid, threshold: 0.1 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  const handleEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, card: TcgCard) => {
    setHoveredId(String(card.id));
    onHoverCard?.(card, e.currentTarget.getBoundingClientRect());
  }, [onHoverCard]);

  const handleLeave = useCallback(() => {
    setHoveredId(null);
    onLeaveCard?.();
  }, [onLeaveCard]);

  if (!isLoading && cards.length === 0) {
    return (
      <div className="vg-empty">
        <div className="vg-empty-head">No cards found</div>
        {query ? `No results for "${query}"` : 'Select a game and set to browse cards'}
      </div>
    );
  }

  return (
    <div className="vg-wrap">
      {cards.length > 0 && (
        <div className="vg-header">
          <span>
            {cards.length}
            {total > cards.length ? ` of ${total}` : ''}
            {query ? ` matching "${query}"` : ' cards'}
          </span>
          {wishlistCount > 0 && (
            <span className="vg-wl-badge">{wishlistCount} in watch list</span>
          )}
        </div>
      )}

      <div className="vg-grid" ref={gridRef}>
        {cards.map((card) => {
          const inWl    = watchlistNumbers.has(card.number);
          const hovered = String(card.id) === hoveredId;
          const price   = card.prices.market ?? card.prices.foil;
          return (
            <div
              key={card.id}
              className={`vg-cell${inWl ? ' in-wl' : ''}`}
              onMouseEnter={(e) => handleEnter(e, card)}
              onMouseLeave={handleLeave}
            >
              <div className="vg-thumb" style={{ cursor: card.image ? 'zoom-in' : 'default' }}>
                {card.image
                  ? <img loading="lazy" src={card.image} alt={card.name} className="vg-img" />
                  : <div className="vg-placeholder">{card.name[0]}</div>
                }
                {inWl && (
                  <span className="vg-badge vg-badge-wl" aria-label="In watch list">
                    <i className="ti ti-check" aria-hidden="true" />
                  </span>
                )}
              </div>

              <div className="vg-bottom">
                {hovered ? (
                  <button
                    className={`vg-add-btn${inWl ? ' added' : ''}`}
                    disabled={inWl}
                    onClick={() => onAddCard?.(card)}
                  >
                    {inWl ? '✓ Added' : '+ Add'}
                  </button>
                ) : (
                  <div className="vg-info">
                    <div className="vg-info-top">
                      <div className="vg-num">{card.number}</div>
                      {price != null && (
                        <div className={`vg-price${inWl ? ' in-wl' : ''}`}>${price.toFixed(2)}</div>
                      )}
                    </div>
                    <div className="vg-name">{card.name}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && cards.length > 0 && (
          <div className="vg-load-more">Loading…</div>
        )}
        <div ref={sentinelRef} className="vg-sentinel" />
      </div>

      {isLoading && cards.length === 0 && (
        <div className="vg-loading">Loading cards…</div>
      )}
    </div>
  );
}
