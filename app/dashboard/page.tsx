'use client';

import { useState, useEffect } from 'react';
import StatsRow from '@/components/dashboard/StatsRow';
import TrendChart from '@/components/dashboard/TrendChart';
import OpportunityRank from '@/components/dashboard/OpportunityRank';
import MomentumRank from '@/components/dashboard/MomentumRank';
import ScatterChart from '@/components/dashboard/ScatterChart';
import DealBarChart from '@/components/dashboard/DealBarChart';
import TopMovers from '@/components/dashboard/TopMovers';

interface DashboardData {
  stats: {
    cardsTracked:  number;
    activeDeals:   number;
    bestMargin:    number;
    bestCardName:  string;
    avgMargin:     number;
  } | null;
  opportunityCards: {
    cardId:     string;
    cardName:   string;
    game:       string;
    art:        string;
    tcgMarket:  number;
    bestMargin: number;
    dealCount:  number;
  }[];
  momentumCards: {
    cardId:    string;
    cardName:  string;
    game:      string;
    art:       string;
    momentum:  number;
    trend:     'up' | 'dn';
  }[];
  trendSeries: {
    cardId:   string;
    cardName: string;
    days:     string[];
    tcg:      number[];
    ebay:     (number | null)[];
  }[];
  scatterPoints: {
    tcgMarket:    number;
    listingPrice: number;
    isDeal:       boolean;
  }[];
  barCards: {
    label:     string;
    dealCount: number;
  }[];
  lastScanned: string | null;
}

export default function DashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const lastScannedLabel = data?.lastScanned
    ? `Last scanned: ${new Date(data.lastScanned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    : 'Not yet scanned';

  const stats = data?.stats
    ? [
        {
          label: 'Cards tracked',
          value: data.stats.cardsTracked,
          sub: 'across your watchlist',
        },
        {
          label: 'Active deals',
          value: data.stats.activeDeals,
          sub: 'from latest scan',
          highlight: data.stats.activeDeals > 0,
          subType: data.stats.activeDeals > 0 ? ('up' as const) : undefined,
        },
        {
          label: 'Best opportunity',
          value: data.stats.bestMargin > 0 ? `${data.stats.bestMargin.toFixed(0)}%` : '—',
          sub: data.stats.bestCardName,
          highlight: data.stats.bestMargin > 0,
        },
        {
          label: 'Avg margin (deals)',
          value: data.stats.avgMargin > 0 ? `${data.stats.avgMargin.toFixed(0)}%` : '—',
          sub: 'across all deals',
        },
      ]
    : [];

  return (
    <div className="page">
      <div className="db-header">
        <div>
          <div className="db-eyebrow">Watchlist dashboard</div>
          <div className="db-title">Portfolio <em>overview</em></div>
        </div>
        <div className="db-updated">
          <i className="ti ti-refresh" aria-hidden="true" style={{ fontSize: 12, verticalAlign: '-1px' }} />
          {' '}{lastScannedLabel}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
          Loading dashboard…
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem 1.25rem', marginBottom: '1.5rem',
          background: 'var(--amber-light)', borderRadius: 'var(--radius-md)',
          border: '0.5px solid var(--amber-mid)', fontSize: 13, color: 'var(--amber)',
        }}>
          <strong>Dashboard unavailable</strong> — {error}.{' '}
          Add <code>DATABASE_URL</code> to <code>.env.local</code> and run a scan first.
        </div>
      )}

      {!loading && data && (
        <>
          {stats.length > 0 && <StatsRow stats={stats} />}

          <TrendChart series={data.trendSeries} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem', alignItems: 'start' }}>
            <OpportunityRank cards={data.opportunityCards} />
            <MomentumRank    cards={data.momentumCards} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <TopMovers />
          </div>

          <ScatterChart points={data.scatterPoints} />

          <DealBarChart cards={data.barCards} />
        </>
      )}

      {!loading && !error && data && data.stats?.cardsTracked === 0 && (
        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 300, color: 'var(--ink)', marginBottom: 8 }}>
            Nothing to show yet
          </div>
          <div style={{ fontSize: 13 }}>
            Add cards to your watchlist on the{' '}
            <a href="/deal-finder" style={{ color: 'var(--teal)' }}>Deal finder</a>
            {' '}and run a scan to populate the dashboard.
          </div>
        </div>
      )}
    </div>
  );
}
