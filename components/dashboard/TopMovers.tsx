'use client';

import { useState, useEffect } from 'react';
import Lightbox from '@/components/ui/Lightbox';

interface Mover {
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

function artClass(game: string) {
  const g = game.toLowerCase();
  if (g.includes('pok'))  return 'art-pokemon';
  if (g.includes('one piece') || g.includes('onepiece')) return 'art-onepiece';
  return 'art-sports';
}

const PERIODS = [
  { value: '24h', label: '24h' },
  { value: '7d',  label: '7d' },
  { value: '30d', label: '30d' },
] as const;

const GAMES = [
  { value: undefined,    label: 'All' },
  { value: 'pokemon',   label: 'Pokémon' },
  { value: 'onepiece',  label: 'One Piece' },
] as const;

type GameFilter = 'pokemon' | 'onepiece' | undefined;

export default function TopMovers() {
  const [period, setPeriod]   = useState<'24h' | '7d' | '30d'>('7d');
  const [game, setGame]       = useState<GameFilter>(undefined);
  const [movers, setMovers]   = useState<Mover[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = `/api/top-movers?period=${period}&direction=gainers&limit=5${game ? `&game=${game}` : ''}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setMovers(Array.isArray(d) ? d : []))
      .catch(() => setMovers([]))
      .finally(() => setLoading(false));
  }, [period, game]);

  const max = Math.max(...movers.map((m) => Math.abs(m.changePct ?? 0)), 1);

  return (
    <>
    <div className="chart-panel" style={{ marginBottom: 0 }}>
      <div className="section-head">
        <div className="section-title">Market movers</div>
        <div className="section-meta" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {GAMES.map((g) => (
            <button
              key={g.label}
              onClick={() => setGame(g.value as GameFilter)}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '2px 9px',
                borderRadius: 999,
                border: '0.5px solid var(--border)',
                background: game === g.value ? 'var(--ink)' : 'transparent',
                color: game === g.value ? 'var(--bg)' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              {g.label}
            </button>
          ))}
          <div style={{ width: '0.5px', background: 'var(--border)', margin: '0 2px' }} />
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '2px 9px',
                borderRadius: 999,
                border: '0.5px solid var(--border)',
                background: period === p.value ? 'var(--teal-light)' : 'transparent',
                color: period === p.value ? 'var(--teal)' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rank-list">
        {loading && (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Loading market movers…
          </div>
        )}
        {!loading && movers.map((m, i) => (
          <div className="rank-row" key={`${m.cardId}-${i}`}>
            <span className="rank-num">{i + 1}</span>
            {m.image
              ? <img
                  src={m.image}
                  alt={m.name}
                  className={`rank-art rank-art-img ${artClass(m.game)}`}
                  style={{ cursor: 'zoom-in' }}
                  onClick={() => setLightbox({ src: m.image!, alt: m.name })}
                />
              : <div className={`rank-art ${artClass(m.game)}`}>{m.game.slice(0, 1)}</div>
            }
            <div className="rank-info">
              <div className="rank-name">{m.name}</div>
              <div className="trend-bar-wrap">
                <div
                  className={`trend-bar ${m.trend === 'up' ? 'bar-up' : 'bar-dn'}`}
                  style={{ width: `${Math.round((Math.abs(m.changePct ?? 0) / max) * 100)}%` }}
                />
              </div>
              <div className="rank-secondary" style={{ marginTop: 2 }}>{m.setName} · {m.number}</div>
            </div>
            <div className="rank-val">
              <div className={`rank-primary ${m.trend === 'up' ? 'pos' : 'neg'}`}>
                {m.changePct != null ? `${m.changePct > 0 ? '+' : ''}${m.changePct.toFixed(1)}%` : '—'}
              </div>
              <div className="rank-secondary">{m.price != null ? `$${m.price}` : '—'} · {period}</div>
            </div>
          </div>
        ))}
        {!loading && movers.length === 0 && (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No mover data available
          </div>
        )}
      </div>
    </div>
    {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </>
  );
}
