'use client';

import { useState } from 'react';
import ResultCard from './ResultCard';

interface Listing {
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
}

interface CardResult {
  cardId:     string;
  cardName:   string;
  set:        string;
  cardNumber: string;
  tcgMarket:  number;
  condition:  string;
  game:       string;
  art:        string;
  listings:   Listing[];
}

interface Props {
  results:   CardResult[];
  minMargin: number;
}

type TabType  = 'deals' | 'all';
type TypeFilter = 'all' | 'bin' | 'auction';

function typeMatches(lt: string, filter: TypeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'bin') return lt === 'bin' || lt === 'both';
  if (filter === 'auction') return lt === 'auction' || lt === 'both';
  return true;
}

export default function ScanResults({ results, minMargin }: Props) {
  const [tab, setTab]       = useState<TabType>('deals');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const first = results.find((r) => r.listings.some((l) => l.isDeal));
    return first ? new Set([first.cardId]) : new Set();
  });

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalDeals = results.reduce((s, r) => s + r.listings.filter((l) => l.isDeal).length, 0);
  const totalAll   = results.reduce((s, r) => s + r.listings.length, 0);

  const visibleCards = results.filter((r) => {
    const deals = r.listings.filter((l) => l.isDeal).length;
    if (tab === 'deals' && deals === 0) return false;
    const shown = r.listings.filter((l) => typeMatches(l.listingType, typeFilter) && (tab === 'all' || l.isDeal));
    return shown.length > 0;
  });

  return (
    <div className="results-section" style={{ marginTop: '1.5rem' }}>
      <div className="fee-strip">
        <div className="fee-item">
          <i className="ti ti-lock" aria-hidden="true" style={{ fontSize: 12 }} />
          <span>eBay fee</span>
          <span className="fee-val">13.25%</span>
        </div>
        <div className="fee-item">
          <i className="ti ti-lock" aria-hidden="true" style={{ fontSize: 12 }} />
          <span>Payment</span>
          <span className="fee-val">3.00%</span>
        </div>
        <div className="fee-item">
          <i className="ti ti-package" aria-hidden="true" style={{ fontSize: 12 }} />
          <span>Shipping tiered</span>
          <span className="fee-val">$3 · $5.50 · $8</span>
        </div>
        <span className="fee-api">{results.length} eBay {results.length === 1 ? 'query' : 'queries'} · 5 concurrent</span>
      </div>

      <div className="results-header">
        <div className="results-title">Scan results</div>
        <div className="filter-row">
          <button className={`ftab ${tab === 'deals' ? 'on' : ''}`} onClick={() => setTab('deals')}>
            Deals {totalDeals}
          </button>
          <button className={`ftab ${tab === 'all' ? 'on' : ''}`} onClick={() => setTab('all')}>
            All {totalAll}
          </button>
          <div className="filter-sep" />
          <button className={`ftab ${typeFilter === 'all' ? 'on' : ''}`} onClick={() => setTypeFilter('all')}>
            All types
          </button>
          <button
            className="ftab"
            style={typeFilter === 'bin' ? { background: '#E6F1FB', color: '#0C447C', borderColor: '#378ADD' } : {}}
            onClick={() => setTypeFilter('bin')}
          >
            <i className="ti ti-tag" aria-hidden="true" style={{ fontSize: 10, verticalAlign: '-1px' }} /> BIN
          </button>
          <button
            className="ftab"
            style={typeFilter === 'auction' ? { background: '#FAEEDA', color: '#633806', borderColor: '#BA7517' } : {}}
            onClick={() => setTypeFilter('auction')}
          >
            <i className="ti ti-gavel" aria-hidden="true" style={{ fontSize: 10, verticalAlign: '-1px' }} /> Auction
          </button>
        </div>
      </div>

      {visibleCards.length === 0 ? (
        <div className="no-results">
          <div className="no-results-head">No deals found</div>
          <span style={{ fontSize: 13 }}>Lower your margin threshold or switch to All.</span>
        </div>
      ) : (
        visibleCards.map((card) => {
          const isOpen  = openGroups.has(card.cardId);
          const shown   = card.listings.filter(
            (l) => typeMatches(l.listingType, typeFilter) && (tab === 'all' || l.isDeal)
          );
          const gDeals  = card.listings.filter((l) => l.isDeal).length;
          const bestDeal = shown.filter((l) => l.isDeal).sort((a, b) => b.profit - a.profit)[0];

          return (
            <div className="card-group" key={card.cardId}>
              <button
                className={`cg-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => toggleGroup(card.cardId)}
              >
                <span className="cg-art">{card.art}</span>
                <span className="cg-info">
                  <span className="cg-name">{card.cardName}</span>
                  <span className="cg-meta">
                    {card.set} · {card.cardNumber} · TCG ${card.tcgMarket} · {card.condition}
                  </span>
                </span>
                <span className="cg-right">
                  {bestDeal && (
                    <span className="best-profit">+${bestDeal.profit.toFixed(0)}</span>
                  )}
                  <span className={`deal-badge ${gDeals > 0 ? 'has' : 'none'}`}>
                    {gDeals} {gDeals === 1 ? 'deal' : 'deals'}
                  </span>
                  <i className={`ti ti-chevron-down chevron ${isOpen ? 'open' : ''}`} aria-hidden="true" />
                </span>
              </button>

              {isOpen && (
                <div className="cg-body open">
                  <div className="rlist">
                    {shown.map((l) => (
                      <ResultCard key={l.listingId} listing={l} game={card.game} art={card.art} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
