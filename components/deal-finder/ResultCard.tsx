'use client';

import { useState } from 'react';
import CostBreakdown from './CostBreakdown';
import { shippingLabel } from '@/lib/deal-algorithm';

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

interface Props {
  listing:  Listing;
  game:     string;
  art:      string;
  imageUrl?: string | null;
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

export default function ResultCard({ listing, game, art, imageUrl }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const mc = listing.isDeal ? 'pos' : 'neg';
  const isAuction = listing.listingType === 'auction' || listing.listingType === 'both';

  return (
    <div className={`rcard ${listing.isDeal ? 'deal' : ''}`}>
      <div className="rcard-body">
        {imageUrl
          ? <img src={imageUrl} alt={art} className={`card-art-sm card-art-img art-${game}`} />
          : <div className={`card-art-sm art-${game}`}>{art}</div>
        }
        <div>
          <div className="rbadges">
            <span className={`pill ${listing.isDeal ? 'pill-deal' : 'pill-pass'}`}>
              {listing.isDeal ? 'Deal ✓' : 'Pass'}
            </span>
            <span className="pill pill-cond">{listing.condition}</span>
            <ListingTypePill lt={listing.listingType} />
            <span className="pill pill-ship">
              <i className="ti ti-package" aria-hidden="true" style={{fontSize:10, verticalAlign:'-1px'}} />
              {' '}{shippingLabel(listing.price)}
            </span>
          </div>
          <div className="rname">{listing.title}</div>
          <div className="rprices">
            <div><div className="pfl">Listed</div><div className="pfv">${listing.price.toFixed(2)}</div></div>
            <div><div className="pfl">Est. sell</div><div className="pfv">${listing.sellAt.toFixed(2)}</div></div>
            {listing.sold30 != null && (
              <div><div className="pfl">Sales/30d</div><div className="pfv">{listing.sold30}</div></div>
            )}
          </div>
          {isAuction && (
            <div className="anote">
              <i className="ti ti-clock" aria-hidden="true" style={{fontSize:11}} />
              Auction — margin shown at current bid
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
