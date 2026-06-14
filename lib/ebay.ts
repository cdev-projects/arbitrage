import { buildTieredQueries, CardIdentity } from './query-builder';

const EBAY_API_BASE = 'https://api.ebay.com';
const MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID ?? 'EBAY_US';

declare global {
  // eslint-disable-next-line no-var
  var __ebayToken: { token: string; expiresAt: number } | undefined;
}

function getTokenCache() { return globalThis.__ebayToken ?? null; }
function setTokenCache(v: { token: string; expiresAt: number }) { globalThis.__ebayToken = v; }

async function getAppToken(): Promise<string> {
  const cached = getTokenCache();
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const clientId     = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${EBAY_API_BASE}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  });

  if (!res.ok) {
    throw new Error(`eBay token fetch failed: ${res.status}`);
  }

  const data = await res.json();
  setTokenCache({
    token:     data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  });

  return globalThis.__ebayToken!.token;
}

export interface EbayListing {
  listingId:        string;
  title:            string;
  price:            number;
  condition:        string;
  listingType:      'bin' | 'auction' | 'both';
  ebayUrl:          string;
  isLowConfidence:  boolean;
  isGraded:         boolean;
  listingImageUrl?: string;
  endsAt?:          string;
  bidCount?:        number;
  currentBidPrice?: number;
  sellerFeedback?:  number;
}

const GRADED_RE = /PSA|CGC|BGS|graded|slab/i;

function mapItems(
  items: Record<string, unknown>[],
  fallbackCondition: string,
  isLowConfidence: boolean,
): EbayListing[] {
  return items.map((item): EbayListing => {
    const title = String(item.title ?? '');

    const priceObj      = item.price as { value?: string } | undefined;
    const startingPrice = parseFloat(priceObj?.value ?? '0');

    const buyingOptions = item.buyingOptions as string[] | undefined;
    let listingType: 'bin' | 'auction' | 'both' = 'bin';
    if (buyingOptions?.includes('AUCTION') && buyingOptions?.includes('FIXED_PRICE')) {
      listingType = 'both';
    } else if (buyingOptions?.includes('AUCTION')) {
      listingType = 'auction';
    }

    const imageObj      = item.image as { imageUrl?: string } | undefined;
    const currentBidObj = item.currentBidPrice as { value?: string } | undefined;
    const sellerObj     = item.seller as { feedbackScore?: number } | undefined;
    const itemWebUrl    = item.itemWebUrl as string | undefined;

    const currentBidPrice = currentBidObj?.value != null ? parseFloat(currentBidObj.value) : undefined;
    const isAuction       = listingType === 'auction' || listingType === 'both';
    const price           = isAuction && currentBidPrice != null ? currentBidPrice : startingPrice;

    return {
      listingId:        String(item.itemId ?? ''),
      title,
      price,
      condition:        String(item.condition ?? fallbackCondition),
      listingType,
      ebayUrl:          itemWebUrl ?? `https://www.ebay.com/itm/${item.itemId}`,
      isLowConfidence,
      isGraded:         GRADED_RE.test(title),
      listingImageUrl:  imageObj?.imageUrl?.replace(/s-l\d+\.jpg$/, 's-l500.jpg'),
      endsAt:           item.itemEndDate as string | undefined,
      bidCount:         item.bidCount as number | undefined,
      currentBidPrice,
      sellerFeedback:   sellerObj?.feedbackScore,
    };
  });
}

export async function searchListings(
  card: CardIdentity,
  tcgMarket: number,
  minMargin = 30,
  limit = 20,
): Promise<EbayListing[]> {
  const token = await getAppToken();
  const tiers = buildTieredQueries(card, tcgMarket, minMargin);

  for (const tier of tiers) {
    const params = new URLSearchParams({
      q:           tier.q,
      filter:      tier.filter,
      sort:        'price',
      limit:       String(limit),
      fieldgroups: 'EXTENDED',
    });

    const res = await fetch(
      `${EBAY_API_BASE}/buy/browse/v1/item_summary/search?${params}`,
      {
        headers: {
          Authorization:              `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE_ID,
          'Content-Type':             'application/json',
        },
      },
    );

    if (!res.ok) throw new Error(`eBay search failed (tier ${tier.tier}): ${res.status}`);

    const items: Record<string, unknown>[] = (await res.json()).itemSummaries ?? [];

    if (items.length >= 3 || tier.tier === 3) {
      return mapItems(items, card.condition, tier.tier === 3);
    }
    // fewer than 3 results — fall through to next tier
  }

  return [];
}
