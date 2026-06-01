export interface CardIdentity {
  cardName:   string;
  set:        string;
  cardNumber: string;
  condition:  string;
}

// eBay condition filter IDs
const CONDITION_MAP: Record<string, string> = {
  NM: '3000', // Very Good
  LP: '4000', // Good
  MP: '5000', // Acceptable
  HP: '6000', // For parts or not working
};

export function buildEbayQuery(card: CardIdentity): string {
  return `"${card.cardName}" "${card.set}" "${card.cardNumber}"`;
}

export function buildEbayConditionFilter(condition: string): string {
  return CONDITION_MAP[condition] ?? '3000';
}
