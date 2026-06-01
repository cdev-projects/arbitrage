interface Props {
  sellAt:   number;
  ebayFee:  number;
  payFee:   number;
  shipping: number;
  price:    number;
  profit:   number;
  margin:   number;
}

export default function CostBreakdown({ sellAt, ebayFee, payFee, shipping, price, profit, margin }: Props) {
  const mc = profit >= 0 ? 'bkp' : 'bkn';
  return (
    <div className="bkdown">
      <div className="bkg">
        <span className="bkl">Est. sell (85% of TCG market)</span>
        <span className="bkv">${sellAt.toFixed(2)}</span>

        <span className="bkl">− eBay seller fee (13.25%)</span>
        <span className="bkv bkn">−${ebayFee.toFixed(2)}</span>

        <span className="bkl">− Payment processing (3.00%)</span>
        <span className="bkv bkn">−${payFee.toFixed(2)}</span>

        <span className="bkl">− Shipping (tiered)</span>
        <span className="bkv bkn">−${shipping.toFixed(2)}</span>

        <span className="bkl">− Purchase price</span>
        <span className="bkv bkn">−${price.toFixed(2)}</span>

        <div className="bkdiv" />

        <span className="bkl bkt">Net profit</span>
        <span className={`bkv ${mc} bkt`}>
          ${profit.toFixed(2)} · {margin.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
