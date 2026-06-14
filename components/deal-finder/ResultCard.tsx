'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import CostBreakdown from './CostBreakdown';
import { shippingLabel } from '@/lib/deal-algorithm';

interface Listing {
  listingId:        string;
  title:            string;
  price:            number;
  condition:        string;
  listingType:      string;
  ebayUrl:          string;
  isLowConfidence:  boolean;
  isGraded:          boolean;
  isEarlyAuction?:   boolean;
  listingImageUrl?:  string;
  endsAt?:          string;
  bidCount?:        number;
  currentBidPrice?: number;
  sellerFeedback?:  number;
  sellAt:           number;
  ebayFee:          number;
  payFee:           number;
  shipping:         number;
  profit:           number;
  margin:           number;
  isDeal:           boolean;
}

interface Props {
  listing:   Listing;
  game:      string;
  art:       string;
  imageUrl?: string | null;
  compMin:   number;
  compMax:   number;
  compCount: number;
}

function ListingTypePill({ lt }: { lt: string }) {
  if (lt === 'bin')
    return <span className="pill pill-bin"><i className="ti ti-tag" aria-hidden="true" style={{fontSize:10}} /> BIN</span>;
  if (lt === 'auction')
    return <span className="pill pill-auction"><i className="ti ti-gavel" aria-hidden="true" style={{fontSize:10}} /> Auction</span>;
  return (
    <span className="pill pill-both">
      <i className="ti ti-tag" aria-hidden="true" style={{fontSize:10}} />
      <i className="ti ti-gavel" aria-hidden="true" style={{fontSize:10}} />
      {' '}BIN+Auction
    </span>
  );
}

function formatEndsIn(isoDate: string): string | null {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (d > 0)  return `Ends ${d}d ${h}h`;
  if (h > 0)  return `Ends ${h}h ${m}m`;
  if (m > 0)  return `Ends ${m}m ${s}s`;
  return `Ends ${s}s`;
}

export default function ResultCard({ listing, game, art, imageUrl, compMin, compMax, compCount }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const mc        = listing.isDeal ? 'pos' : listing.isEarlyAuction ? 'watch' : 'neg';
  const isAuction = listing.listingType === 'auction' || listing.listingType === 'both';
  const thumbSrc  = listing.listingImageUrl ?? imageUrl ?? null;

  const [endsLabel, setEndsLabel] = useState(() =>
    listing.endsAt ? formatEndsIn(listing.endsAt) : null
  );

  useEffect(() => {
    if (!listing.endsAt) return;
    const tick = () => setEndsLabel(formatEndsIn(listing.endsAt!));
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [listing.endsAt]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({
    left: '48px', top: '0', opacity: 0, pointerEvents: 'none',
  });

  const POP_W = 410;
  const POP_H = 560;

  const handleMouseEnter = useCallback(() => {
    if (!wrapRef.current || !thumbSrc) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const style: React.CSSProperties = { opacity: 1, pointerEvents: 'auto' };
    style.left  = rect.right + POP_W < window.innerWidth  - 8 ? '48px' : 'auto';
    style.right = rect.right + POP_W < window.innerWidth  - 8 ? 'auto' : '48px';
    style.top   = rect.top  + POP_H < window.innerHeight - 8 ? '0'    : 'auto';
    style.bottom= rect.top  + POP_H < window.innerHeight - 8 ? 'auto' : '0';
    setPopStyle(style);
  }, [thumbSrc]);

  const handleMouseLeave = useCallback(() => {
    setPopStyle(prev => ({ ...prev, opacity: 0, pointerEvents: 'none' }));
  }, []);

  const range   = compMax - compMin;
  const fillPct = range > 0
    ? Math.min(100, Math.max(0, Math.round(((listing.price - compMin) / range) * 100)))
    : 50;
  const barColor = listing.isDeal ? 'var(--teal)' : listing.margin > 0 ? 'var(--amber)' : 'var(--coral)';

  return (
    <div className={`rcard ${listing.isDeal ? 'deal' : listing.isEarlyAuction ? 'watching' : ''}`}>
      <div className="rcard-body">
        <div className="card-art-wrap" ref={wrapRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          {thumbSrc
            ? <img src={thumbSrc} alt={art} className={`card-art-sm card-art-img art-${game}`} />
            : <div className={`card-art-sm art-${game}`}>{art}</div>
          }
          {thumbSrc && (
            <div className="card-art-pop" style={popStyle}>
              <img src={thumbSrc} alt={art} className="card-art-pop-img" />
            </div>
          )}
        </div>
        <div>
          <div className="rbadges">
            <span className={`pill ${listing.isDeal ? 'pill-deal' : listing.isEarlyAuction ? 'pill-watch' : 'pill-pass'}`}>
              {listing.isDeal ? 'Deal ✓' : listing.isEarlyAuction ? 'Watching' : 'Pass'}
            </span>
            <span className="pill pill-cond">{listing.condition}</span>
            <ListingTypePill lt={listing.listingType} />
            {listing.bidCount != null && listing.bidCount > 0 && (
              <span className="pill pill-bids">
                <i className="ti ti-gavel" aria-hidden="true" style={{fontSize:9}} />
                {' '}{listing.bidCount} {listing.bidCount === 1 ? 'bid' : 'bids'}
              </span>
            )}
            <span className="pill pill-ship">
              <i className="ti ti-package" aria-hidden="true" style={{fontSize:10, verticalAlign:'-1px'}} />
              {' '}{shippingLabel(listing.price)}
            </span>
            {listing.isGraded && (
              <span className="pill pill-graded">Graded</span>
            )}
            {listing.isLowConfidence && (
              <span className="pill pill-low-conf">Broad search</span>
            )}
            {endsLabel && (
              <span className="pill pill-ends">{endsLabel}</span>
            )}
          </div>
          <div className="rname">{listing.title}</div>
          <div className="rprices">
            <div><div className="pfl">Listed</div><div className="pfv">${listing.price.toFixed(2)}</div></div>
            <div><div className="pfl">Est. sell</div><div className="pfv">${listing.sellAt.toFixed(2)}</div></div>
          </div>
          {listing.isEarlyAuction && (
            <div className="anote" style={{color: 'var(--amber)'}}>
              <i className="ti ti-clock" aria-hidden="true" style={{fontSize:11}} />
              Auction not yet closing — check back near end time
            </div>
          )}
          {isAuction && !listing.isEarlyAuction && (
            <div className="anote">
              <i className="ti ti-clock" aria-hidden="true" style={{fontSize:11}} />
              Auction — margin shown at current bid
            </div>
          )}
          {listing.isGraded && (
            <div className="anote" style={{color: '#3C3489'}}>
              <i className="ti ti-info-circle" aria-hidden="true" style={{fontSize:11}} />
              Margin uses raw TCG price — graded cards sell for more
            </div>
          )}
          {compCount > 1 && (
            <div className="comps-bar-wrap">
              <span className="comps-label">{compCount} comps · ${compMin.toFixed(0)}–${compMax.toFixed(0)}</span>
              <div className="comps-track">
                <div className="comps-fill" style={{width: `${fillPct}%`, background: barColor}} />
              </div>
            </div>
          )}
        </div>
        <div className="rprofit">
          <div className={`pnum ${mc}`}>
            {listing.profit >= 0 ? '+' : ''}${Math.abs(listing.profit).toFixed(2)}
          </div>
          <div className={`pmarg ${mc}`}>{listing.margin.toFixed(0)}% margin</div>
        </div>
      </div>
      <div className="rfoot">
        <button className="btn-bk" onClick={() => setShowBreakdown((v) => !v)}>
          {showBreakdown ? 'Hide' : 'Show'} breakdown
        </button>
        <a
          className="btn-eb"
          href={listing.ebayUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="ti ti-external-link" aria-hidden="true" /> View on eBay
        </a>
      </div>
      {showBreakdown && (
        <CostBreakdown
          sellAt={listing.sellAt}
          ebayFee={listing.ebayFee}
          payFee={listing.payFee}
          shipping={listing.shipping}
          price={listing.price}
          profit={listing.profit}
          margin={listing.margin}
        />
      )}
    </div>
  );
}
