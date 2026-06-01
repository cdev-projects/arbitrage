'use client';

import {
  Chart as ChartJS,
  LinearScale, PointElement, LineElement, Tooltip, Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

interface ListingPoint {
  tcgMarket:    number;
  listingPrice: number;
  isDeal:       boolean;
}

interface Props {
  points: ListingPoint[];
}

export default function ScatterChart({ points }: Props) {
  const dealPts = points.filter((p) => p.isDeal).map((p) => ({ x: p.tcgMarket, y: p.listingPrice }));
  const passPts = points.filter((p) => !p.isDeal).map((p) => ({ x: p.tcgMarket, y: p.listingPrice }));

  const allX   = points.map((p) => p.tcgMarket);
  const allY   = points.map((p) => p.listingPrice);
  const allVals = [...allX, ...allY];
  const mn     = allVals.length ? Math.min(...allVals) * 0.85 : 0;
  const mx     = allVals.length ? Math.max(...allVals) * 1.1 : 100;

  const chartData = {
    datasets: [
      {
        label: 'Deal',
        data: dealPts,
        backgroundColor: 'rgba(29,158,117,0.7)',
        pointRadius: 6,
      },
      {
        label: 'Pass',
        data: passPts,
        backgroundColor: 'rgba(180,178,169,0.5)',
        pointRadius: 5,
      },
      {
        label: 'Parity',
        data: [{ x: mn, y: mn }, { x: mx, y: mx }],
        borderColor: 'rgba(136,135,128,0.4)',
        borderWidth: 1,
        borderDash: [5, 4] as number[],
        pointRadius: 0,
        fill: false,
      } as never,
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { x: number; y: number } }) =>
            ctx.dataset.label === 'Parity'
              ? undefined
              : ` Listed $${ctx.parsed.y} · TCG $${ctx.parsed.x}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'TCG market price ($)', font: { size: 11 }, color: '#888780' },
        ticks: { callback: (v: string | number) => `$${v}`, font: { size: 11 }, color: '#888780' },
        min: Math.round(mn), max: Math.round(mx),
        grid: { color: 'rgba(136,135,128,0.1)' },
      },
      y: {
        title: { display: true, text: 'eBay listing price ($)', font: { size: 11 }, color: '#888780' },
        ticks: { callback: (v: string | number) => `$${v}`, font: { size: 11 }, color: '#888780' },
        min: Math.round(mn), max: Math.round(mx),
        grid: { color: 'rgba(136,135,128,0.1)' },
      },
    },
  };

  if (points.length === 0) {
    return (
      <div className="chart-panel" style={{ marginTop: '1.25rem' }}>
        <div className="section-head">
          <div className="section-title">Listing price vs. TCG market — all cards</div>
          <div className="section-meta">scatter · each dot = one eBay listing · below diagonal = potential deal</div>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Run a scan to populate the scatter plot
        </div>
      </div>
    );
  }

  return (
    <div className="chart-panel" style={{ marginTop: '1.25rem' }}>
      <div className="section-head">
        <div className="section-title">Listing price vs. TCG market — all cards</div>
        <div className="section-meta">scatter · each dot = one eBay listing · below diagonal = potential deal</div>
      </div>
      <div className="legend">
        <span className="legend-item"><span className="legend-dot" style={{ background: '#1D9E75' }} /> Deal ✓</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#B4B2A9' }} /> Pass</span>
        <span className="legend-item" style={{ fontSize: 11, color: 'var(--muted)' }}>Dashed line = parity (listing = TCG price)</span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 260 }}>
        <Scatter data={chartData} options={options} />
      </div>
    </div>
  );
}
