const EBAY_FEE = 0.1325;
const PAY_FEE  = 0.03;

export function shippingTier(listingPrice: number): number {
  if (listingPrice >= 100) return 8.00;
  if (listingPrice >= 40)  return 5.50;
  return 3.00;
}

export function shippingLabel(listingPrice: number): string {
  if (listingPrice >= 100) return '$8 sig.';
  if (listingPrice >= 40)  return '$5.50';
  return '$3';
}

export interface DealCalc {
  sellAt:   number;
  ebayFee:  number;
  payFee:   number;
  shipping: number;
  profit:   number;
  margin:   number;
}

export function calcDeal(listingPrice: number, tcgMarket: number): DealCalc {
  const sellAt   = tcgMarket * 0.85;
  const ebayFee  = sellAt * EBAY_FEE;
  const payFee   = sellAt * PAY_FEE;
  const shipping = shippingTier(listingPrice);
  const profit   = sellAt - ebayFee - payFee - shipping - listingPrice;
  const margin   = (profit / sellAt) * 100;
  return { sellAt, ebayFee, payFee, shipping, profit, margin };
}

export function isDeal(margin: number, minMargin: number): boolean {
  return margin >= minMargin;
}
