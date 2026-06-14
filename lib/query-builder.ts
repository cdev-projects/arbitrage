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

// Exclusions shared by all games.
// -sleeve -playmat -binder -tin -booster: accessories and sealed product
//   that frequently appear in searches for high-value cards.
// -altered: community shorthand for altered-art custom cards (different value).
// -digital -lot -proxy -fake -reprint: carry over from original exclusions.
const CUSTOM_EXCL = (process.env.CUSTOM_EXCLUSIONS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .join(' ');

const BASE_EXCL = [
  '-digital -lot -proxy -fake -reprint -sleeve -playmat -binder -tin -booster -altered',
  CUSTOM_EXCL,
].filter(Boolean).join(' ');

// Language exclusions for non-English cards.
// Pokémon JP and EN use different card numbers, so JP cards rarely hit Tier 1,
// but they surface at Tier 2/3 via set name or game keyword matches.
// One Piece EN and JP share numbering (OP01-060 etc.) so language exclusion
// is critical at every tier.
const LANG_EXCL_JP = '-Japanese -JP';
const LANG_EXCL_KR = '-Korean -KR';

// One Piece: Japanese + Korean exclusion applied at all tiers.
const OP_EXCL = `${BASE_EXCL} ${LANG_EXCL_JP} ${LANG_EXCL_KR}`;

// Pokémon: language exclusion applied at Tier 2+ only.
// At Tier 1, the card number (e.g. 199/165) already anchors us to the EN print.
// At Tier 2/3 we're looser, so we add the exclusion to avoid JP sealed product
// and raw JP cards that slipped past the condition filter.
const POKE_LANG_EXCL = `${LANG_EXCL_JP} ${LANG_EXCL_KR}`;

// Fee constants — must match deal-algorithm.ts
const SELL_PCT     = 0.85;
const EBAY_FEE     = 0.1325;
const PAY_FEE      = 0.03;
// Use lowest shipping tier ($3) for the ceiling — conservative (won't miss deals).
const MIN_SHIPPING = 3;

/**
 * Maximum listing price that could still yield at least `minMargin`% profit.
 * Replaces the old `tcgMarket * 1.1` ceiling. For a $100 card at 30% minMargin:
 *   old ceiling → $110 · new ceiling → ~$43
 */
export function dealPriceCeiling(tcgMarket: number, minMargin: number): number {
  const sellAt = tcgMarket * SELL_PCT;
  const ceil   = sellAt * (1 - EBAY_FEE - PAY_FEE - minMargin / 100) - MIN_SHIPPING;
  return Math.max(ceil, 0);
}

function conditionIds(condition: string, loose = false): string {
  const map = loose ? CONDITION_LOOSE : CONDITION_MAP;
  return map[condition] ?? CONDITION_MAP.NM;
}

function buildFilter(
  condition: string,
  tcgMarket: number,
  minMargin: number,
  loose = false,
  extra?: string,
): string {
  const ceil = dealPriceCeiling(tcgMarket, minMargin).toFixed(2);
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

function pokemonTiers(card: CardIdentity, tcgMarket: number, minMargin: number): QueryTier[] {
  const name = `"${card.cardName}"`;
  const num  = card.cardNumber;   // unquoted — eBay handles slash variants (199/165, 199 / 165)
  const set  = `"${card.set}"`;
  const f    = buildFilter(card.condition, tcgMarket, minMargin);

  return [
    // Tier 1: name + number. Language exclusions omitted — number anchors to EN print.
    {
      tier:   1,
      q:      `${name} ${num} ${BASE_EXCL}`,
      filter: f,
    },
    // Tier 2: name + set + game keyword. Add language exclusions to avoid JP sealed product.
    {
      tier:   2,
      q:      `${name} ${set} pokemon ${BASE_EXCL} ${POKE_LANG_EXCL}`,
      filter: f,
    },
    // Tier 3: broad. Loose conditions + category exclusion + language exclusions.
    {
      tier:   3,
      q:      `${name} pokemon tcg ${BASE_EXCL} ${POKE_LANG_EXCL}`,
      filter: buildFilter(card.condition, tcgMarket, minMargin, true, 'excludeCategoryIds:{64482}'),
    },
  ];
}

function onePieceTiers(card: CardIdentity, tcgMarket: number, minMargin: number): QueryTier[] {
  const name    = `"${card.cardName}"`;
  const num     = card.cardNumber;                       // unquoted
  const setCode = card.cardNumber.split('-')[0] ?? num;  // OP01-060 → OP01
  const abbrev  = OP_RARITY_ABBREV[card.rarity] ?? null;

  const isHighRarity = abbrev !== null && abbrev !== 'R';
  const t1Rarity  = abbrev        ? ` ${abbrev}` : '';
  const t23Rarity = isHighRarity  ? ` ${abbrev}` : '';  // R dropped at Tier 2+

  const f = buildFilter(card.condition, tcgMarket, minMargin);

  return [
    // Tier 1: name + number + rarity. OP_EXCL includes JP/KR at every tier because
    // EN and JP share the same card numbering scheme (OP01-060 etc.).
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
      filter: buildFilter(card.condition, tcgMarket, minMargin, true, 'excludeCategoryIds:{64482}'),
    },
  ];
}

export function buildTieredQueries(
  card: CardIdentity,
  tcgMarket: number,
  minMargin = 30,
): QueryTier[] {
  if (card.game === 'onepiece') return onePieceTiers(card, tcgMarket, minMargin);
  return pokemonTiers(card, tcgMarket, minMargin);
}

export function buildEbayConditionFilter(condition: string): string {
  return conditionIds(condition);
}
