'use client';

import { useState, useEffect } from 'react';

interface Mover {
  cardId:    number;
  name:      string;
  game:      string;
  setName:   string;
  number:    string;
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

export default function TopMovers() {
  const [period, setPeriod]   = useState<'24h' | '7d' | '30d'>('7d');
  const [movers, setMovers]   = useState<Mover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/top-movers?period=${period}&direction=gainers&limit=5`)
      .then((r) => r.json())
      .then((d) => setMovers(Array.isArray(d) ? d : []))
      .catch(() => setMovers([]))
      .finally(() => setLoading(false));
  }, [period]);

  const max = Math.max(...movers.map((m) => Math.abs(m.changePct ?? 0)), 1);

  return (
    <div className="chart-panel" style={{ marginBottom: 0 }}>
      <div className="section-head">
        <div className="section-title">Market movers</div>
        <div className="section-meta" style={{ display: 'flex', gap: 6 }}>
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
            <div className={`rank-art ${artClass(m.game)}`}>{m.game.slice(0, 1)}</div>
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
  );
}
