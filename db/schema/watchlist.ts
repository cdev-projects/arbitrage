import { pgTable, text, real, boolean, timestamp } from 'drizzle-orm/pg-core';
import { wishlists } from './wishlists';

export const watchlistCards = pgTable('watchlist_cards', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  wishlistId: text('wishlist_id').references(() => wishlists.id, { onDelete: 'cascade' }),
  tcgCardId:  text('tcg_card_id'),          // TCG API numeric card ID — stable join key across watch cycles
  isActive:   boolean('is_active').notNull().default(true),
  game:       text('game').notNull(),       // 'pokemon' | 'onepiece' | 'sports'
  set:        text('set').notNull(),
  cardNumber: text('card_number').notNull(),
  cardName:   text('card_name').notNull(),
  rarity:     text('rarity').notNull(),
  condition:  text('condition').notNull(),  // 'NM' | 'LP' | 'MP' | 'HP'
  tcgMarket:  real('tcg_market').notNull(),
  tcgLow:     real('tcg_low').notNull(),
  art:        text('art').notNull().default('?'),
  imageUrl:   text('image_url'),
  createdAt:  timestamp('created_at').defaultNow(),
});

export type WatchlistCard = typeof watchlistCards.$inferSelect;
export type NewWatchlistCard = typeof watchlistCards.$inferInsert;
