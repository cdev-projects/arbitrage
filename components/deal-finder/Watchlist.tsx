'use client';

import { useState, useCallback } from 'react';

interface WatchlistCard {
  id:         string;
  game:       string;
  set:        string;
  cardNumber: string;
  cardName:   string;
  condition:  string;
  tcgMarket:  number;
  art:        string;
  imageUrl?:  string | null;
}

interface Props {
  cards:            WatchlistCard[];
  onRemove:         (id: string) => void;
  previewedNumber?: string;
  maxCount?:        number;
}

interface HoverState {
  src: string;
  alt: string;
  top: number;   // viewport px
  left: number;  // viewport px
}

const MAX_WL  = 20;
const WARN_AT = 16;
const POP_W   = 180; // popover card width px

export default function Watchlist({ cards, onRemove, previewedNumber, maxCount = MAX_WL }: Props) {
  const count = cards.length;
  const pct   = Math.round((count / maxCount) * 100);
  const warn  = count >= WARN_AT;

  const [hover, setHover] = useState<HoverState | null>(null);

  const handleThumbEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, card: WatchlistCard) => {
    if (!card.imageUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({
      src:  card.imageUrl,
      alt:  card.cardName,
      // centre the popover vertically on the thumbnail, offset to the left
      top:  rect.top + rect.height / 2,
      left: rect.left - POP_W - 10,
    });
  }, []);

  const handleThumbLeave = useCallback(() => setHover(null), []);

  return (
    <>
      <div className="panel wl-panel">
        {/* Header: label + count */}
        <div className="panel-head" style={{ borderBottom: 'none', paddingBottom: 6 }}>
          <span className="panel-title">Watch list</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
            {count} / {maxCount}
          </span>
        </div>

        {/* Progress bar directly below header */}
        <div style={{ padding: '0 1.25rem .75rem' }}>
          <div className="limit-track">
            <div className={`limit-fill ${warn ? 'warn' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="wl-scroll">
          {count === 0 ? (
            <div className="wl-empty">
              <div className="wl-empty-head">No cards yet</div>
              Browse the grid and click a card to add it.
            </div>
          ) : (
            cards.map((card) => {
              const isViewing = previewedNumber === card.cardNumber;
              return (
                <div className={`wl-row${isViewing ? ' wl-row-viewing' : ''}`} key={card.id}>
                  {/* Thumbnail — hover opens popover */}
                  <div
                    className="wl-thumb"
                    onMouseEnter={(e) => handleThumbEnter(e, card)}
                    onMouseLeave={handleThumbLeave}
                    style={{ cursor: card.imageUrl ? 'zoom-in' : 'default' }}
                  >
                    {card.imageUrl
                      ? <img src={card.imageUrl} alt={card.cardName} loading="lazy" />
                      : <span className="wl-thumb-placeholder">{card.art || card.cardName[0]}</span>
                    }
                  </div>

                  {/* Name + number + viewing tag */}
                  <span className="wl-row-name">
                    <span className="wl-row-num">{card.cardNumber}</span>
                    {' '}{card.cardName}
                    {isViewing && <span className="wl-viewing-tag">viewing</span>}
                  </span>

                  {/* Price + condition + remove */}
                  <span className="wl-row-right">
                    {card.tcgMarket > 0 && (
                      <span className="wl-price">${card.tcgMarket.toFixed(2)}</span>
                    )}
                    <span className="pill pill-cond" style={{ fontSize: 9 }}>{card.condition}</span>
                    <button className="wl-remove" onClick={() => onRemove(card.id)} aria-label="Remove">
                      <i className="ti ti-x" aria-hidden="true" style={{ fontSize: 11 }} />
                    </button>
                  </span>
                </div>
              );
            })
          )}
          {count > 0 && <div className="wl-fade" />}
        </div>
      </div>

      {/* Hover popover — rendered outside the panel so it's never clipped */}
      {hover && (
        <div
          className="wl-hover-pop"
          style={{ top: hover.top, left: hover.left }}
          // Keep popover visible when mouse moves onto it
          onMouseEnter={() => {/* intentional no-op */}}
          onMouseLeave={handleThumbLeave}
        >
          <img src={hover.src} alt={hover.alt} />
        </div>
      )}
    </>
  );
}
