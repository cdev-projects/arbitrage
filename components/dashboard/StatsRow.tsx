interface Stat {
  label:     string;
  value:     string | number;
  sub?:      string;
  subType?:  'up' | 'dn' | 'neutral';
  highlight?: boolean;
}

interface Props {
  stats: Stat[];
}

export default function StatsRow({ stats }: Props) {
  return (
    <div className="stats-row">
      {stats.map((s, i) => (
        <div key={i} className={`stat-tile ${s.highlight ? 'hl' : ''}`}>
          <div className="stat-ey">{s.label}</div>
          <div className="stat-num">{s.value}</div>
          {s.sub && (
            <div className={`stat-sub ${s.subType ?? ''}`}>{s.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
