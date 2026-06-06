'use client';

interface WatchlistCard {
  id:         string;
  game:       string;
  set:        string;
  cardNumber: string;
  cardName:   string;
  condition:  string;
  tcgMarket:  number;
  art:        string;
}

interface Props {
  cards:        WatchlistCard[];
  onRemove:     (id: string) => void;
  onScan:       () => void;
  scanning:     boolean;
  minMargin:    number;
  onMarginChange: (v: number) => void;
}

const MAX_WL    = 20;
const WARN_AT   = 16;
const RATE      = 5;

function artClass(game: string) {
  if (game === 'pokemon')  return 'art-pokemon';
  if (game === 'onepiece') return 'art-onepiece';
  return 'art-sports';
}

function gameTag(game: string) {
  if (game === 'pokemon')  return 'PKM';
  if (game === 'onepiece') return 'OP';
  return 'SPT';
}

function gameStyle(game: string) {
  if (game === 'pokemon')  return { background: '#FAEEDA', color: '#BA7517' };
  if (game === 'onepiece') return { background: '#FAECE7', color: '#D85A30' };
  return { background: '#EEEDFE', color: '#7F77DD' };
}

export default function Watchlist({ cards, onRemove, onScan, scanning, minMargin, onMarginChange }: Props) {
  const count = cards.length;
  const pct   = Math.round((count / MAX_WL) * 100);
  const warn  = count >= WARN_AT;

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Watchlist</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>
          {count} / {MAX_WL}
        </span>
      </div>

      <div>
        {count === 0 ? (
          <div className="wl-empty">
            <div className="wl-empty-head">No cards yet</div>
            Look up a card on the left.
          </div>
        ) : (
          cards.map((card) => (
            <div className="wl-item" key={card.id}>
              <div className={`wl-art ${artClass(card.game)}`}>{card.art}</div>
              <div className="wl-info">
                <div className="wl-name">{card.cardName}</div>
                <div className="wl-sub">
                  {card.cardNumber} · {card.set}
                  {card.tcgMarket > 0 ? ` · $${card.tcgMarket}` : ''}
                </div>
              </div>
              <span className="pill" style={{ ...gameStyle(card.game), marginRight: 3 }}>
                {gameTag(card.game)}
              </span>
              <span className="pill pill-cond">{card.condition}</span>
              <button
                className="wl-remove"
                onClick={() => onRemove(card.id)}
                aria-label="Remove"
              >
                <i className="ti ti-x" aria-hidden="true" style={{ fontSize: 11 }} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="wl-footer">
        <span>
          {count >= MAX_WL
            ? 'Watchlist full'
            : `${MAX_WL - count} slots left · ${RATE} concurrent queries`}
        </span>
        <div className="limit-track">
          <div
            className={`limit-fill ${warn ? 'warn' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="scan-bar">
        <div className="margin-inline">
          <span>Min margin</span>
          <input
            type="range"
            min={10} max={60} step={5}
            value={minMargin}
            onChange={(e) => onMarginChange(Number(e.target.value))}
          />
          <span className="mv">{minMargin}%</span>
        </div>
        <button
          className="btn-scan"
          disabled={count === 0 || scanning}
          onClick={onScan}
        >
          <i className="ti ti-search" aria-hidden="true" />
          {scanning ? 'Scanning…' : 'Scan all'}
        </button>
      </div>
    </div>
  );
}
