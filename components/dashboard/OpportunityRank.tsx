interface CardOpportunity {
  cardId:     string;
  cardName:   string;
  game:       string;
  art:        string;
  tcgMarket:  number;
  bestMargin: number;
  dealCount:  number;
}

interface Props {
  cards: CardOpportunity[];
}

function artClass(game: string) {
  if (game === 'pokemon')  return 'art-pokemon';
  if (game === 'onepiece') return 'art-onepiece';
  return 'art-sports';
}

export default function OpportunityRank({ cards }: Props) {
  const sorted = [...cards].sort((a, b) => b.bestMargin - a.bestMargin);

  return (
    <div className="chart-panel" style={{ marginBottom: 0 }}>
      <div className="section-head">
        <div className="section-title">Opportunity ranking</div>
        <div className="section-meta">by best deal margin</div>
      </div>
      <div className="rank-list">
        {sorted.map((c, i) => (
          <div className="rank-row" key={c.cardId}>
            <span className="rank-num">{i + 1}</span>
            <div className={`rank-art ${artClass(c.game)}`}>{c.art}</div>
            <div className="rank-info">
              <div className="rank-name">{c.cardName}</div>
              <div className="rank-sub">TCG ${c.tcgMarket} · {c.dealCount} {c.dealCount === 1 ? 'deal' : 'deals'}</div>
            </div>
            <div className="rank-val">
              <div className={`rank-primary ${c.bestMargin > 0 ? 'pos' : 'neu'}`}>
                {c.bestMargin > 0 ? `${c.bestMargin.toFixed(0)}%` : '—'}
              </div>
              <div className="rank-secondary">best margin</div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Run a scan to see opportunities
          </div>
        )}
      </div>
    </div>
  );
}
