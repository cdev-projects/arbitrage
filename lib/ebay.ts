import { buildEbayQuery, buildEbayConditionFilter, CardIdentity } from './query-builder';

const EBAY_API_BASE = 'https://api.ebay.com';
const MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID ?? 'EBAY_US';

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
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
  tokenCache = {
    token:     data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return tokenCache.token;
}

export interface EbayListing {
  listingId:   string;
  title:       string;
  price:       number;
  condition:   string;
  listingType: 'bin' | 'auction' | 'both';
  sold30:      number | null;
  ebayUrl:     string;
}

export async function searchListings(card: CardIdentity, limit = 20): Promise<EbayListing[]> {
  const token  = await getAppToken();
  const query  = buildEbayQuery(card);
  const condId = buildEbayConditionFilter(card.condition);

  const params = new URLSearchParams({
    q:            query,
    filter:       `conditionIds:{${condId}},buyingOptions:{FIXED_PRICE|AUCTION}`,
    sort:         'price',
    limit:        String(limit),
    fieldgroups:  'EXTENDED',
  });

  const res = await fetch(
    `${EBAY_API_BASE}/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        Authorization:          `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE_ID,
        'Content-Type':         'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`eBay search failed: ${res.status}`);
  }

  const data = await res.json();
  const items = data.itemSummaries ?? [];

  return items.map((item: Record<string, unknown>): EbayListing => {
    const priceObj = item.price as { value?: string } | undefined;
    const price = parseFloat(priceObj?.value ?? '0');

    const buyingOptions = item.buyingOptions as string[] | undefined;
    let listingType: 'bin' | 'auction' | 'both' = 'bin';
    if (buyingOptions?.includes('AUCTION') && buyingOptions?.includes('FIXED_PRICE')) {
      listingType = 'both';
    } else if (buyingOptions?.includes('AUCTION')) {
      listingType = 'auction';
    }

    const itemWebUrl = item.itemWebUrl as string | undefined;

    return {
      listingId:   String(item.itemId ?? ''),
      title:       String(item.title ?? ''),
      price,
      condition:   String(item.condition ?? card.condition),
      listingType,
      sold30:      null,
      ebayUrl:     itemWebUrl ?? `https://www.ebay.com/itm/${item.itemId}`,
    };
  });
}
