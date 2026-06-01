'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface TrendSeries {
  cardId:   string;
  cardName: string;
  days:     string[];
  tcg:      number[];
  ebay:     (number | null)[];
}

interface Props {
  series: TrendSeries[];
}

export default function TrendChart({ series }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = series[activeIdx];

  if (!active) {
    return (
      <div className="chart-panel">
        <div className="section-head">
          <div className="section-title">Market price vs. avg eBay listing — 30 days</div>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Run a scan to start building price history
        </div>
      </div>
    );
  }

  const chartData = {
    labels: active.days,
    datasets: [
      {
        label: 'TCG market',
        data: active.tcg,
        borderColor: '#1D9E75',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        fill: { target: 1, above: 'rgba(225,245,238,0.4)', below: 'rgba(225,245,238,0)' },
      },
      {
        label: 'Avg eBay listing',
        data: active.ebay,
        borderColor: '#378ADD',
        borderWidth: 1.5,
        borderDash: [4, 3],
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: { parsed: { y: number } }) => ` $${ctx.parsed.y.toFixed(0)}` } },
    },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7, font: { size: 11 }, color: '#888780' }, grid: { display: false } },
      y: { ticks: { callback: (v: string | number) => `$${v}`, font: { size: 11 }, color: '#888780' }, grid: { color: 'rgba(136,135,128,0.12)' }, border: { dash: [3, 3] as number[] } },
    },
  };

  return (
    <div className="chart-panel">
      <div className="section-head">
        <div className="section-title">Market price vs. avg eBay listing — 30 days</div>
        <div className="tab-bar">
          {series.map((s, i) => (
            <button
              key={s.cardId}
              className={`ttab ${i === activeIdx ? 'on' : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              {s.cardName.length > 14 ? s.cardName.slice(0, 12) + '…' : s.cardName}
            </button>
          ))}
        </div>
      </div>
      <div className="legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#1D9E75' }} />
          TCG market price
        </span>
        <span className="legend-item">
          <span className="legend-dash" style={{ borderTop: '2px dashed #378ADD' }} />
          Avg eBay listing
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#E1F5EE', border: '0.5px solid #1D9E75' }} />
          Deal zone (listing &lt; TCG)
        </span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 220 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
