import { describe, it, expect } from 'vitest';
import { dealPriceCeiling, buildTieredQueries } from '../query-builder';
import type { CardIdentity } from '../query-builder';

// ── dealPriceCeiling ──────────────────────────────────────────────────────────

describe('dealPriceCeiling', () => {
  it('is substantially lower than TCG market price', () => {
    // At 30% margin a $100 card should have ceiling ~$43, not $110
    const ceil = dealPriceCeiling(100, 30);
    expect(ceil).toBeLessThan(60);
    expect(ceil).toBeGreaterThan(0);
  });

  it('decreases as minMargin increases', () => {
    const low  = dealPriceCeiling(100, 10);
    const high = dealPriceCeiling(100, 50);
    expect(low).toBeGreaterThan(high);
  });

  it('scales with TCG market price', () => {
    const small = dealPriceCeiling(50,  30);
    const large = dealPriceCeiling(200, 30);
    expect(large).toBeGreaterThan(small);
  });

  it('never returns a negative ceiling', () => {
    // Very low-value card with high margin requirement
    expect(dealPriceCeiling(1, 60)).toBeGreaterThanOrEqual(0);
  });
});

// ── shared card fixtures ──────────────────────────────────────────────────────

const POKE_CARD: CardIdentity = {
  cardName:   'Charizard ex',
  set:        'Scarlet & Violet 151',
  cardNumber: '199/165',
  condition:  'NM',
  game:       'pokemon',
  rarity:     'Special Illustration Rare',
};

const OP_CARD: CardIdentity = {
  cardName:   'Monkey D. Luffy',
  set:        'Romance Dawn',
  cardNumber: 'OP01-060',
  condition:  'NM',
  game:       'onepiece',
  rarity:     'Secret Rare',
};

const OP_RARE_CARD: CardIdentity = {
  ...OP_CARD,
  rarity: 'Rare',
};

// ── buildTieredQueries — Pokémon ──────────────────────────────────────────────

describe('buildTieredQueries — Pokémon', () => {
  const tiers = buildTieredQueries(POKE_CARD, 100, 30);

  it('returns exactly 3 tiers', () => {
    expect(tiers).toHaveLength(3);
    expect(tiers.map((t) => t.tier)).toEqual([1, 2, 3]);
  });

  it('tier 1 includes card number and name, no language exclusions', () => {
    const { q } = tiers[0];
    expect(q).toContain('"Charizard ex"');
    expect(q).toContain('199/165');
    expect(q).not.toContain('-Japanese');
  });

  it('tier 2 adds set name, game keyword, and language exclusions', () => {
    const { q } = tiers[1];
    expect(q).toContain('"Scarlet & Violet 151"');
    expect(q).toContain('pokemon');
    expect(q).toContain('-Japanese');
    expect(q).toContain('-Korean');
  });

  it('tier 3 is broad — no set, adds language exclusions', () => {
    const { q } = tiers[2];
    expect(q).not.toContain('"Scarlet & Violet 151"');
    expect(q).toContain('pokemon tcg');
    expect(q).toContain('-Japanese');
  });

  it('all tiers include base exclusions', () => {
    for (const { q } of tiers) {
      expect(q).toContain('-lot');
      expect(q).toContain('-proxy');
      expect(q).toContain('-reprint');
    }
  });

  it('tier 3 filter uses loose conditions', () => {
    // NM loose = 1000|2750|3000 (includes LP)
    expect(tiers[2].filter).toContain('3000');
    // Tier 1/2 NM = 1000|2750 only
    expect(tiers[0].filter).not.toContain('3000');
  });

  it('all filters include a price ceiling', () => {
    for (const { filter } of tiers) {
      expect(filter).toMatch(/price:\[0\.\./);
    }
  });
});

// ── buildTieredQueries — One Piece ───────────────────────────────────────────

describe('buildTieredQueries — One Piece', () => {
  const tiers = buildTieredQueries(OP_CARD, 100, 30);

  it('returns exactly 3 tiers', () => {
    expect(tiers).toHaveLength(3);
  });

  it('includes SEC rarity term in all tiers', () => {
    for (const { q } of tiers) {
      expect(q).toContain('SEC');
    }
  });

  it('applies JP/KR language exclusions at all tiers', () => {
    for (const { q } of tiers) {
      expect(q).toContain('-Japanese');
      expect(q).toContain('-Korean');
    }
  });

  it('tier 1 uses card number', () => {
    expect(tiers[0].q).toContain('OP01-060');
  });

  it('tier 2 uses set code extracted from card number', () => {
    expect(tiers[1].q).toContain('OP01');
  });
});

describe('buildTieredQueries — One Piece Rare rarity', () => {
  const tiers = buildTieredQueries(OP_RARE_CARD, 100, 30);

  it('includes R rarity term at tier 1', () => {
    expect(tiers[0].q).toContain(' R ');
  });

  it('drops R rarity term at tiers 2 and 3 to avoid ambiguity', () => {
    expect(tiers[1].q).not.toMatch(/ R /);
    expect(tiers[2].q).not.toMatch(/ R /);
  });
});
