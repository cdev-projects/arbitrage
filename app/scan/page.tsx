'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ScanResults from '@/components/deal-finder/ScanResults';

interface WatchlistMeta {
  id:        string;
  name:      string;
  cardCount: number;
}

interface WatchlistCard {
  id:         string;
  game:       string;
  set:        string;
  cardNumber: string;
  cardName:   string;
  rarity:     string;
  condition:  string;
  tcgMarket:  number;
  tcgLow:     number;
  art:        string;
  imageUrl?:  string | null;
}

interface ScanResult {
  cardId:     string;
  scannedAt:  string;
  cardName:   string;
  set:        string;
  cardNumber: string;
  tcgMarket:  number;
  tcgLow:     number;
  condition:  string;
  game:       string;
  art:        string;
  imageUrl?:  string | null;
  listings:   {
    listingId: string; title: string; price: number; condition: string;
    listingType: string; ebayUrl: string; isLowConfidence: boolean; isGraded: boolean;
    isEarlyAuction?: boolean;
    listingImageUrl?: string; endsAt?: string; bidCount?: number;
    currentBidPrice?: number; sellerFeedback?: number;
    sellAt: number; ebayFee: number; payFee: number; shipping: number;
    profit: number; margin: number; isDeal: boolean;
  }[];
}

const DEFAULT_MARGIN = Number(process.env.NEXT_PUBLIC_DEFAULT_MIN_MARGIN ?? 30);
const MARGIN_STEPS   = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

type MockResult = Omit<ScanResult, 'scannedAt'>;

// ── Mock results (used until eBay API access is available) ──────────────────
const MOCK_RESULTS: MockResult[] = [
  {
    cardId: 'mock-001', cardName: 'Charizard ex', set: 'Surging Sparks',
    cardNumber: '025/191', tcgMarket: 84.20, tcgLow: 68.00,
    condition: 'NM', game: 'pokemon', art: '🔥', imageUrl: null,
    listings: [
      {
        listingId: 'ebay-1001', title: 'Charizard ex 025/191 Surging Sparks Near Mint',
        price: 42.00, condition: 'NM', listingType: 'bin',
        ebayUrl: 'https://www.ebay.com/itm/example-1001', isLowConfidence: false, isGraded: false,
        listingImageUrl: 'https://picsum.photos/200/280',
        sellAt: 71.57, ebayFee: 9.48, payFee: 2.15, shipping: 3.00, profit: 14.94, margin: 20.9, isDeal: false,
      },
      {
        listingId: 'ebay-1002', title: 'Pokémon Charizard ex 25/191 Surging Sparks NM PSA Ready',
        price: 31.00, condition: 'NM', listingType: 'auction',
        ebayUrl: 'https://www.ebay.com/itm/example-1002', isLowConfidence: false, isGraded: false,
        listingImageUrl: 'https://picsum.photos/200/280',
        sellAt: 71.57, ebayFee: 9.48, payFee: 2.15, shipping: 3.00, profit: 25.94, margin: 36.2, isDeal: true,
      },
      {
        listingId: 'ebay-1003', title: 'Charizard ex 025/191 NM PSA 10 Surging Sparks',
        price: 27.50, condition: 'NM', listingType: 'auction',
        ebayUrl: 'https://www.ebay.com/itm/example-1003', isLowConfidence: false, isGraded: true,
        sellAt: 71.57, ebayFee: 9.48, payFee: 2.15, shipping: 3.00, profit: 29.44, margin: 41.1, isDeal: true,
      },
    ],
  },
  {
    cardId: 'mock-002', cardName: 'Pikachu VMAX', set: 'Vivid Voltage',
    cardNumber: '044/185', tcgMarket: 22.50, tcgLow: 17.80,
    condition: 'LP', game: 'pokemon', art: '⚡', imageUrl: null,
    listings: [
      {
        listingId: 'ebay-2001', title: 'Pikachu VMAX 044/185 Vivid Voltage Light Played',
        price: 9.99, condition: 'LP', listingType: 'bin',
        ebayUrl: 'https://www.ebay.com/itm/example-2001', isLowConfidence: false, isGraded: false,
        sellAt: 19.13, ebayFee: 2.53, payFee: 0.57, shipping: 3.00, profit: 3.04, margin: 15.9, isDeal: false,
      },
      {
        listingId: 'ebay-2002', title: 'Pikachu VMAX Vivid Voltage 44/185 LP Pokemon',
        price: 6.50, condition: 'LP', listingType: 'bin',
        ebayUrl: 'https://www.ebay.com/itm/example-2002', isLowConfidence: true, isGraded: false,
        sellAt: 19.13, ebayFee: 2.53, payFee: 0.57, shipping: 3.00, profit: 6.53, margin: 34.1, isDeal: true,
      },
    ],
  },
  {
    cardId: 'mock-003', cardName: 'Gardevoir ex', set: 'Scarlet & Violet',
    cardNumber: '086/198', tcgMarket: 31.10, tcgLow: 24.50,
    condition: 'NM', game: 'pokemon', art: '✨', imageUrl: null,
    listings: [
      {
        listingId: 'ebay-3001', title: 'Gardevoir ex 86/198 Scarlet Violet Base Set NM',
        price: 11.00, condition: 'NM', listingType: 'auction',
        ebayUrl: 'https://www.ebay.com/itm/example-3001', isLowConfidence: false, isGraded: false,
        sellAt: 26.44, ebayFee: 3.50, payFee: 0.79, shipping: 3.00, profit: 8.15, margin: 30.8, isDeal: true,
      },
      {
        listingId: 'ebay-3002', title: 'Gardevoir ex Pokemon Card SV Base 086/198 Near Mint',
        price: 16.00, condition: 'NM', listingType: 'bin',
        ebayUrl: 'https://www.ebay.com/itm/example-3002', isLowConfidence: false, isGraded: false,
        sellAt: 26.44, ebayFee: 3.50, payFee: 0.79, shipping: 3.00, profit: 3.15, margin: 11.9, isDeal: false,
      },
    ],
  },
  {
    cardId: 'mock-004', cardName: 'Eevee VMAX', set: 'Evolving Skies',
    cardNumber: '069/203', tcgMarket: 14.75, tcgLow: 11.20,
    condition: 'NM', game: 'pokemon', art: '🌿', imageUrl: null,
    listings: [
      {
        listingId: 'ebay-4001', title: 'Eevee VMAX 69/203 Evolving Skies Near Mint Pokemon',
        price: 9.00, condition: 'NM', listingType: 'bin',
        ebayUrl: 'https://www.ebay.com/itm/example-4001', isLowConfidence: false, isGraded: false,
        sellAt: 12.54, ebayFee: 1.66, payFee: 0.38, shipping: 3.00, profit: -1.50, margin: -12.0, isDeal: false,
      },
    ],
  },
  {
    cardId: 'mock-005', cardName: 'Lucario VSTAR', set: 'Astral Radiance',
    cardNumber: '056/189', tcgMarket: 18.90, tcgLow: 14.60,
    condition: 'NM', game: 'pokemon', art: '💙', imageUrl: null,
    listings: [
      {
        listingId: 'ebay-5001', title: 'Lucario VSTAR 056/189 Astral Radiance NM Pokemon TCG',
        price: 7.00, condition: 'NM', listingType: 'auction',
        ebayUrl: 'https://www.ebay.com/itm/example-5001', isLowConfidence: false, isGraded: false,
        sellAt: 16.07, ebayFee: 2.13, payFee: 0.48, shipping: 3.00, profit: 3.46, margin: 21.5, isDeal: false,
      },
      {
        listingId: 'ebay-5002', title: 'Pokemon Lucario VSTAR Astral Radiance 56/189 Near Mint',
        price: 5.25, condition: 'NM', listingType: 'auction',
        ebayUrl: 'https://www.ebay.com/itm/example-5002', isLowConfidence: false, isGraded: false,
        sellAt: 16.07, ebayFee: 2.13, payFee: 0.48, shipping: 3.00, profit: 5.21, margin: 32.4, isDeal: true,
      },
    ],
  },
];

function filterMockByMargin(results: MockResult[], minMargin: number): ScanResult[] {
  const scannedAt = new Date().toISOString();
  return results.map((r) => ({
    ...r,
    scannedAt,
    listings: r.listings.map((l) => ({ ...l, isDeal: l.margin >= minMargin, isEarlyAuction: false })),
  }));
}

function ScanPageInner() {
  const searchParams   = useSearchParams();
  const initialWlId    = searchParams.get('watchlist') ?? '';

  const [watchlists,  setWatchlists]  = useState<WatchlistMeta[]>([]);
  const [selectedId, setSelectedId] = useState(initialWlId);
  const [minMargin,  setMinMargin]  = useState(DEFAULT_MARGIN);
  const [scanning,    setScanning]    = useState(false);
  const [results,     setResults]     = useState<ScanResult[] | null>(null);
  const [dbAvail,     setDbAvail]     = useState(true);
  const [usedMock,    setUsedMock]    = useState(false);
  const [maxAgeHours, setMaxAgeHours] = useState<number>(48);

  useEffect(() => {
    fetch('/api/watchlists')
      .then((r) => {
        if (!r.ok) throw new Error('DB unavailable');
        return r.json();
      })
      .then((list: WatchlistMeta[]) => {
        setWatchlists(list);
        if (!initialWlId && list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => setDbAvail(false));
  }, [initialWlId]);

  const handleScan = useCallback(async () => {
    if (!selectedId) return;
    setScanning(true);
    setResults(null);
    setUsedMock(false);

    try {
      const cardsRes = await fetch(`/api/watchlists/${selectedId}/cards`);
      const cards: WatchlistCard[] = await cardsRes.json();

      if (cards.length === 0) {
        alert('This watch list has no cards to scan.');
        return;
      }

      // Try real API; use rich mock results when eBay isn't configured
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minMargin, watchlist: cards }),
        });
        if (!res.ok) throw new Error('Scan API unavailable');
        const data = await res.json();
        if (data.isMock) {
          // eBay not configured — show rich mock results
          await new Promise((r) => setTimeout(r, 800));
          setResults(filterMockByMargin(MOCK_RESULTS, minMargin));
          setUsedMock(true);
        } else {
          setResults(data.results ?? []);
        }
      } catch {
        // Network error — show mock results
        await new Promise((r) => setTimeout(r, 800));
        setResults(filterMockByMargin(MOCK_RESULTS, minMargin));
        setUsedMock(true);
      }
    } catch (err) {
      console.error(err);
      alert('Scan failed — check console for details');
    } finally {
      setScanning(false);
    }
  }, [selectedId, minMargin]);

  const selectedWl = watchlists.find((w) => w.id === selectedId);
  const canScan    = !!selectedId && (selectedWl?.cardCount ?? 0) > 0 && !scanning;

  const visibleResults = results && maxAgeHours > 0
    ? results.filter((r) => Date.now() - new Date(r.scannedAt).getTime() < maxAgeHours * 3_600_000)
    : results;

  // Auto-trigger scan when arriving from the wishlist page via "Scan for deals"
  const autoFired = useRef(false);
  useEffect(() => {
    if (initialWlId && canScan && !autoFired.current && !results) {
      autoFired.current = true;
      handleScan();
    }
  }, [initialWlId, canScan, results, handleScan]);

  return (
    <div className="page">
      {/* Page header */}
      <div className="db-header">
        <div>
          <div className="db-eyebrow">Deal finder · Phase 1</div>
          <div className="db-title">Scan for <em>deals</em></div>
        </div>
        <a href="/watchlist" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Edit watch list
        </a>
      </div>

      {!dbAvail && (
        <div style={{ marginBottom: '1rem', padding: '10px 14px', background: 'var(--amber-light)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--amber-mid)', fontSize: 13, color: 'var(--amber)' }}>
          <strong>Database not configured</strong> — add <code>DATABASE_URL</code> to enable scanning.
        </div>
      )}

      {/* Compact controls panel */}
      <div className="panel" style={{ background: 'var(--surface-secondary)', marginBottom: '1.25rem' }}>
        <div style={{ padding: '1rem 1.25rem', fontSize: 13, color: 'var(--muted)', borderBottom: '0.5px solid var(--border)', marginBottom: '1rem' }}>
          Pick a saved watch list, set the margin threshold, scan, and review deals.
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <div className="scan-controls-row">
            <span className="sc-label">Watch list</span>
            <select
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setResults(null); }}
            >
              {watchlists.length === 0 && <option value="">No watch lists yet</option>}
              {watchlists.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.cardCount} {w.cardCount === 1 ? 'card' : 'cards'})
                </option>
              ))}
            </select>
            <span className="sc-label">Min margin</span>
            <select
              value={minMargin}
              onChange={(e) => { setMinMargin(Number(e.target.value)); setResults(null); }}
              style={{ flex: 'none', width: 80 }}
            >
              {MARGIN_STEPS.map((v) => (
                <option key={v} value={v}>{v}%</option>
              ))}
            </select>
            <button
              className="btn-scan"
              disabled={!canScan}
              onClick={handleScan}
              style={{ flex: 'none', whiteSpace: 'nowrap' }}
            >
              <i className="ti ti-radar-2" aria-hidden="true" />
              {scanning
                ? `Scanning ${selectedWl?.cardCount ?? 0} cards…`
                : 'Scan'}
            </button>
          </div>
        </div>
      </div>

      {scanning && (
        <div style={{ marginBottom: '1.5rem', padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 300, color: 'var(--ink)', display: 'block', marginBottom: 3 }}>
            Scanning {selectedWl?.cardCount ?? 0} cards…
          </div>
          Running queries 5 at a time
        </div>
      )}

      {usedMock && results && !scanning && (
        <div style={{ marginBottom: '1rem', padding: '8px 14px', background: 'var(--amber-light)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--amber-mid)', fontSize: 12, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-flask" style={{ fontSize: 13 }} />
          <span><strong>Mock data</strong> — eBay API not yet configured. Results below are sample data for layout review.</span>
        </div>
      )}

      {results && !scanning && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '.05em' }}>Age filter</span>
            {([24, 48, 0] as const).map((h) => (
              <button
                key={h}
                className={`ftab${maxAgeHours === h ? ' on' : ''}`}
                onClick={() => setMaxAgeHours(h)}
              >
                {h === 0 ? 'Off' : `${h}h`}
              </button>
            ))}
          </div>
          <ScanResults results={visibleResults ?? []} minMargin={minMargin} />
        </>
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense>
      <ScanPageInner />
    </Suspense>
  );
}
