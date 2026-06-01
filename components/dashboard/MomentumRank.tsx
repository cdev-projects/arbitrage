interface CardMomentum {
  cardId:    string;
  cardName:  string;
  game:      string;
  art:       string;
  momentum:  number;
  trend:     'up' | 'dn';
}

interface Props {
  cards: CardMomentum[];
}

function artClass(game: string) {
  if (game === 'pokemon')  return 'art-pokemon';
  if (game === 'onepiece') return 'art-onepiece';
  return 'art-sports';
}

function MomentumPill({ card }: { card: CardMomentum }) {
  if (card.trend === 'up' && card.momentum > 5)
    return <span className="pill pill-hot"><i className="ti ti-flame" aria-hidden="true" style={{fontSize:10}} /> Hot</span>;
  if (card.trend === 'up')
    return <span className="pill pill-warm"><i className="ti ti-arrow-up" aria-hidden="true" style={{fontSize:10}} /> Rising</span>;
  return <span className="pill pill-cold"><i className="ti ti-arrow-down" aria-hidden="true" style={{fontSize:10}} /> Cooling</span>;
}

export default function MomentumRank({ cards }: Props) {
  const sorted = [...cards].sort((a, b) => b.momentum - a.momentum);
  const max    = Math.max(...cards.map((c) => Math.abs(c.momentum)), 1);

  return (
    <div className="chart-panel" style={{ marginBottom: 0 }}>
      <div className="section-head">
        <div className="section-title">Price momentum</div>
        <div className="section-meta">TCG market, 30d change</div>
      </div>
      <div className="rank-list">
        {sorted.map((c, i) => (
          <div className="rank-row" key={c.cardId}>
            <span className="rank-num">{i + 1}</span>
            <div className={`rank-art ${artClass(c.game)}`}>{c.art}</div>
            <div className="rank-info">
              <div className="rank-name">{c.cardName}</div>
              <div className="trend-bar-wrap">
                <div
                  className={`trend-bar ${c.trend === 'up' ? 'bar-up' : 'bar-dn'}`}
                  style={{ width: `${Math.round((Math.abs(c.momentum) / max) * 100)}%` }}
                />
              </div>
            </div>
            <div className="rank-val">
              <div className={`rank-primary ${c.trend === 'up' ? 'pos' : 'neg'}`}>
                {c.momentum > 0 ? '+' : ''}{c.momentum.toFixed(1)}%
              </div>
              <div className="rank-secondary">30d change</div>
              <div style={{ marginTop: 3 }}><MomentumPill card={c} /></div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Price history builds after daily snapshots
          </div>
        )}
      </div>
    </div>
  );
}
