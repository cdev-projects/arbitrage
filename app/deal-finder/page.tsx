'use client';

import { useState, useEffect, useCallback } from 'react';
import CardLookup from '@/components/deal-finder/CardLookup';
import Watchlist from '@/components/deal-finder/Watchlist';
import ScanResults from '@/components/deal-finder/ScanResults';

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
}

interface ScanResult {
  cardId:     string;
  cardName:   string;
  set:        string;
  cardNumber: string;
  tcgMarket:  number;
  tcgLow:     number;
  condition:  string;
  game:       string;
  art:        string;
  listings:   {
    listingId:   string;
    title:       string;
    price:       number;
    condition:   string;
    listingType: string;
    sold30:      number | null;
    ebayUrl:     string;
    sellAt:      number;
    ebayFee:     number;
    payFee:      number;
    shipping:    number;
    profit:      number;
    margin:      number;
    isDeal:      boolean;
  }[];
}

const DEFAULT_MARGIN = Number(process.env.NEXT_PUBLIC_DEFAULT_MIN_MARGIN ?? 30);

export default function DealFinderPage() {
  const [watchlist, setWatchlist] = useState<WatchlistCard[]>([]);
  const [minMargin, setMinMargin] = useState(DEFAULT_MARGIN);
  const [scanning, setScanning]   = useState(false);
  const [results, setResults]     = useState<ScanResult[] | null>(null);
  const [dbAvailable, setDbAvailable] = useState(true);

  // Load watchlist on mount
  useEffect(() => {
    fetch('/api/watchlist')
      .then((r) => {
        if (!r.ok) throw new Error('DB unavailable');
        return r.json();
      })
      .then((data: WatchlistCard[]) => setWatchlist(data))
      .catch(() => {
        // DB not configured — start with empty local watchlist
        setDbAvailable(false);
      });
  }, []);

  const handleAdd = useCallback(async (card: Omit<WatchlistCard, 'id'>) => {
    if (!dbAvailable) {
      // Local-only mode — generate a temp ID
      const tempCard: WatchlistCard = { ...card, id: `local-${Date.now()}` };
      setWatchlist((prev) => {
        const dup = prev.find(
          (c) => c.game === tempCard.game && c.set === tempCard.set &&
                 c.cardNumber === tempCard.cardNumber && c.condition === tempCard.condition
        );
        return dup ? prev : [...prev, tempCard];
      });
      return;
    }

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(error ?? 'Failed to add card');
        return;
      }
      const created: WatchlistCard = await res.json();
      setWatchlist((prev) => [...prev, created]);
    } catch {
      alert('Failed to add card — is the database configured?');
    }
  }, [dbAvailable]);

  const handleRemove = useCallback(async (id: string) => {
    setWatchlist((prev) => prev.filter((c) => c.id !== id));

    if (!dbAvailable || id.startsWith('local-')) return;

    await fetch(`/api/watchlist/${id}`, { method: 'DELETE' }).catch(console.error);
  }, [dbAvailable]);

  const handleScan = useCallback(async () => {
    if (watchlist.length === 0) return;
    setScanning(true);
    setResults(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minMargin, watchlist }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (err) {
      console.error(err);
      alert('Scan failed — check console for details');
    } finally {
      setScanning(false);
    }
  }, [watchlist, minMargin]);

  return (
    <div className="page">
      <div style={{ padding: '1.5rem 0 1.25rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
          Deal finder · Phase 1
        </div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 300, lineHeight: 1.2, color: 'var(--ink)' }}>
          Find underpriced <em style={{ fontStyle: 'italic', color: 'var(--teal-mid)' }}>cards</em>
        </div>
      </div>

      {!dbAvailable && (
        <div style={{
          marginBottom: '1rem', padding: '10px 14px',
          background: 'var(--amber-light)', borderRadius: 'var(--radius-md)',
          border: '0.5px solid var(--amber-mid)', fontSize: 13, color: 'var(--amber)',
        }}>
          <strong>Database not configured</strong> — add <code>DATABASE_URL</code> to <code>.env.local</code> to persist your watchlist. Running in local-only mode.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
        <CardLookup
          onAdd={handleAdd}
          watchlistCount={watchlist.length}
          maxWatchlist={20}
        />
        <Watchlist
          cards={watchlist}
          onRemove={handleRemove}
          onScan={handleScan}
          scanning={scanning}
          minMargin={minMargin}
          onMarginChange={setMinMargin}
        />
      </div>

      {scanning && (
        <div style={{ marginTop: '1.5rem', padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 300, color: 'var(--ink)', display: 'block', marginBottom: 3 }}>
            Scanning {watchlist.length} {watchlist.length === 1 ? 'card' : 'cards'}…
          </div>
          Running {watchlist.length} {watchlist.length === 1 ? 'query' : 'queries'}, 5 at a time
        </div>
      )}

      {results && !scanning && (
        <ScanResults results={results} minMargin={minMargin} />
      )}
    </div>
  );
}
