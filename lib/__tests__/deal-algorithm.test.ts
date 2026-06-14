import { describe, it, expect } from 'vitest';
import { calcDeal, isDeal, shippingTier, shippingLabel } from '../deal-algorithm';

const EBAY_FEE = 0.1325;
const PAY_FEE  = 0.03;

describe('shippingTier', () => {
  it('returns $3 for listings under $40', () => {
    expect(shippingTier(0)).toBe(3.00);
    expect(shippingTier(39.99)).toBe(3.00);
  });

  it('returns $5.50 for listings $40–$99.99', () => {
    expect(shippingTier(40)).toBe(5.50);
    expect(shippingTier(99.99)).toBe(5.50);
  });

  it('returns $8 for listings $100 and above', () => {
    expect(shippingTier(100)).toBe(8.00);
    expect(shippingTier(500)).toBe(8.00);
  });
});

describe('shippingLabel', () => {
  it('returns the correct label for each tier', () => {
    expect(shippingLabel(30)).toBe('$3');
    expect(shippingLabel(50)).toBe('$5.50');
    expect(shippingLabel(150)).toBe('$8 sig.');
  });
});

describe('calcDeal', () => {
  it('computes sell-at as 85% of TCG market', () => {
    const { sellAt } = calcDeal(50, 100);
    expect(sellAt).toBeCloseTo(85);
  });

  it('computes fees against sell-at, not listing price', () => {
    const { sellAt, ebayFee, payFee } = calcDeal(50, 100);
    expect(ebayFee).toBeCloseTo(sellAt * EBAY_FEE);
    expect(payFee).toBeCloseTo(sellAt * PAY_FEE);
  });

  it('profit = sellAt - ebayFee - payFee - shipping - listingPrice', () => {
    const result = calcDeal(50, 100);
    const expected = result.sellAt - result.ebayFee - result.payFee - result.shipping - 50;
    expect(result.profit).toBeCloseTo(expected);
  });

  it('margin = (profit / sellAt) * 100', () => {
    const result = calcDeal(50, 100);
    expect(result.margin).toBeCloseTo((result.profit / result.sellAt) * 100);
  });

  it('produces negative profit when listing price exceeds sell-at', () => {
    const { profit } = calcDeal(100, 100); // listing at TCG market price — no room
    expect(profit).toBeLessThan(0);
  });

  it('selects the correct shipping tier based on listing price', () => {
    expect(calcDeal(30,  100).shipping).toBe(3.00);
    expect(calcDeal(50,  100).shipping).toBe(5.50);
    expect(calcDeal(110, 200).shipping).toBe(8.00);
  });
});

describe('isDeal', () => {
  it('returns true when margin meets the threshold', () => {
    expect(isDeal(30, 30)).toBe(true);
    expect(isDeal(35, 30)).toBe(true);
  });

  it('returns false when margin is below the threshold', () => {
    expect(isDeal(29.9, 30)).toBe(false);
    expect(isDeal(0,   30)).toBe(false);
  });

  it('returns false for negative margins', () => {
    expect(isDeal(-5, 30)).toBe(false);
  });
});
