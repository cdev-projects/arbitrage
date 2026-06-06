import { pgTable, text, real, integer, timestamp } from 'drizzle-orm/pg-core';

export const priceSnapshots = pgTable('price_snapshots', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cardId:         text('card_id').notNull(),   // watchlist row UUID — audit trail, no cascade
  tcgCardId:      text('tcg_card_id'),          // stable join key across watch/unwatch cycles
  condition:      text('condition'),            // 'NM' | 'LP' | 'MP' | 'HP'
  tcgMarket:      real('tcg_market').notNull(),
  avgEbayListing: real('avg_ebay_listing'),
  dealCount:      integer('deal_count').default(0),
  takenAt:        timestamp('taken_at').defaultNow(),
});

export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
