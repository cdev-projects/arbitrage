import { pgTable, text, real, integer, timestamp } from 'drizzle-orm/pg-core';
import { watchlistCards } from './watchlist';

export const priceSnapshots = pgTable('price_snapshots', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cardId:         text('card_id').notNull().references(() => watchlistCards.id, { onDelete: 'cascade' }),
  tcgMarket:      real('tcg_market').notNull(),
  avgEbayListing: real('avg_ebay_listing'),
  dealCount:      integer('deal_count').default(0),
  takenAt:        timestamp('taken_at').defaultNow(),
});

export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
