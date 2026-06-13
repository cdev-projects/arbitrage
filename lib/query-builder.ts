export interface CardIdentity {
  cardName:   string;
  set:        string;
  cardNumber: string;
  condition:  string;
  game:       string;   // 'pokemon' | 'onepiece'
  rarity:     string;   // raw TCG API value
}

export interface QueryTier {
  q:      string;
  filter: string;
  tier:   1 | 2 | 3;
}

// eBay condition IDs — Browse v1 values
const CONDITION_MAP: Record<string, string> = {
  NM: '1000|2750', // New + Like New
  LP: '3000',      // Very Good
  MP: '4000',      // Good
  HP: '5000',      // Acceptable
};

// Tier 3 loosens by one level to catch more results
const CONDITION_LOOSE: Record<string, string> = {
  NM: '1000|2750|3000',
  LP: '3000|4000',
  MP: '4000|5000',
  HP: '5000',
};

// One Piece rarity → eBay search term. null = omit rarity term entirely.
const OP_RARITY_ABBREV: Record<string, string | null> = {
  'Secret Rare': 'SEC',
  'Super Rare':  'SR',
  'Leader Rare': 'Leader',
  'Leader':      'Leader',
  'Rare':        'R',       // Tier 1 only — dropped at Tier 2+ (ambiguity risk)
  'Uncommon':    null,      // low value, parallel delta negligible
  'Common':      null,
};

const BASE_EXCL = '-digital -lot -proxy -fake -reprint';
const OP_EXCL   = `${BASE_EXCL} -Japanese -JP`;

function conditionIds(condition: string, loose = false): string {
  const map = loose ? CONDITION_LOOSE : CONDITION_MAP;
  return map[condition] ?? CONDITION_MAP.NM;
}

function buildFilter(condition: string, tcgMarket: number, loose = false, extra?: string): string {
  const ceil = (tcgMarket * 1.1).toFixed(2);
  const parts = [
    `conditionIds:{${conditionIds(condition, loose)}}`,
    `buyingOptions:{FIXED_PRICE|AUCTION}`,
    `price:[0..${ceil}]`,
    `priceCurrency:USD`,
    `itemLocationCountry:US`,
  ];
  if (extra) parts.push(extra);
  return parts.join(',');
}

function pokemonTiers(card: CardIdentity, tcgMarket: number): QueryTier[] {
  const name = `"${card.cardName}"`;
  const num  = card.cardNumber;   // unquoted — eBay handles slash variants (199/165, 199 / 165)
  const set  = `"${card.set}"`;
  const f    = buildFilter(card.condition, tcgMarket);

  return [
    { tier: 1, q: `${name} ${num} ${BASE_EXCL}`,          filter: f },
    { tier: 2, q: `${name} ${set} pokemon ${BASE_EXCL}`,   filter: f },
    {
      tier:   3,
      q:      `${name} pokemon tcg ${BASE_EXCL}`,
      filter: buildFilter(card.condition, tcgMarket, true, 'excludeCategoryIds:{64482}'),
    },
  ];
}

function onePieceTiers(card: CardIdentity, tcgMarket: number): QueryTier[] {
  const name    = `"${card.cardName}"`;
  const num     = card.cardNumber;                       // unquoted
  const setCode = card.cardNumber.split('-')[0] ?? num;  // OP01-060 → OP01
  const abbrev  = OP_RARITY_ABBREV[card.rarity] ?? null;

  const isHighRarity = abbrev !== null && abbrev !== 'R';
  const t1Rarity  = abbrev        ? ` ${abbrev}` : '';
  const t23Rarity = isHighRarity  ? ` ${abbrev}` : '';  // R dropped at Tier 2+

  const f = buildFilter(card.condition, tcgMarket);

  return [
    {
      tier:   1,
      q:      `${name} ${num}${t1Rarity} ${OP_EXCL}`,
      filter: f,
    },
    {
      tier:   2,
      q:      `${name} ${setCode} "one piece"${t23Rarity} ${OP_EXCL}`,
      filter: f,
    },
    {
      tier:   3,
      q:      `${name}${t23Rarity} "one piece" tcg ${OP_EXCL}`,
      filter: buildFilter(card.condition, tcgMarket, true, 'excludeCategoryIds:{64482}'),
    },
  ];
}

export function buildTieredQueries(card: CardIdentity, tcgMarket: number): QueryTier[] {
  if (card.game === 'onepiece') return onePieceTiers(card, tcgMarket);
  return pokemonTiers(card, tcgMarket);
}

export function buildEbayConditionFilter(condition: string): string {
  return conditionIds(condition);
}
