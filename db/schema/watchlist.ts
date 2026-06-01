import { pgTable, text, real, timestamp } from 'drizzle-orm/pg-core';

export const watchlistCards = pgTable('watchlist_cards', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  game:       text('game').notNull(),       // 'pokemon' | 'onepiece' | 'sports'
  set:        text('set').notNull(),
  cardNumber: text('card_number').notNull(),
  cardName:   text('card_name').notNull(),
  rarity:     text('rarity').notNull(),
  condition:  text('condition').notNull(),  // 'NM' | 'LP' | 'MP' | 'HP'
  tcgMarket:  real('tcg_market').notNull(),
  tcgLow:     real('tcg_low').notNull(),
  art:        text('art').notNull().default('?'),
  createdAt:  timestamp('created_at').defaultNow(),
});

export type WatchlistCard = typeof watchlistCards.$inferSelect;
export type NewWatchlistCard = typeof watchlistCards.$inferInsert;
