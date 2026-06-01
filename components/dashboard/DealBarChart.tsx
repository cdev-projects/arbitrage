'use client';

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface CardBar {
  label:     string;
  dealCount: number;
}

interface Props {
  cards: CardBar[];
}

export default function DealBarChart({ cards }: Props) {
  const labels    = cards.map((c) => c.label);
  const data      = cards.map((c) => c.dealCount);
  const colors    = cards.map((c) => c.dealCount > 0 ? 'rgba(29,158,117,0.75)' : 'rgba(180,178,169,0.5)');

  const chartData = {
    labels,
    datasets: [{
      label: 'Deals',
      data,
      backgroundColor: colors,
      borderRadius: 4,
      borderSkipped: false as const,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number } }) =>
            ` ${ctx.parsed.y} ${ctx.parsed.y === 1 ? 'deal' : 'deals'}`,
        },
      },
    },
    scales: {
      x: { ticks: { font: { size: 11 }, color: '#888780' }, grid: { display: false } },
      y: {
        ticks: { stepSize: 1, font: { size: 11 }, color: '#888780' },
        grid: { color: 'rgba(136,135,128,0.1)' },
        border: { dash: [3, 3] as number[] },
        min: 0,
      },
    },
  };

  if (cards.length === 0) {
    return (
      <div className="chart-panel" style={{ marginTop: '1.25rem' }}>
        <div className="section-head">
          <div className="section-title">Deal count by card</div>
          <div className="section-meta">listings clearing {30}% margin threshold</div>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Run a scan to see deal counts
        </div>
      </div>
    );
  }

  return (
    <div className="chart-panel" style={{ marginTop: '1.25rem' }}>
      <div className="section-head">
        <div className="section-title">Deal count by card</div>
        <div className="section-meta">listings clearing {30}% margin threshold</div>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 220 }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
