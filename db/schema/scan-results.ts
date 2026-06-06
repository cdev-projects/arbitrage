import { pgTable, text, real, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const scanResults = pgTable('scan_results', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cardId:      text('card_id').notNull(),   // watchlist row UUID — audit trail, no cascade
  tcgCardId:   text('tcg_card_id'),          // stable join key across watch/unwatch cycles
  listingId:   text('listing_id').notNull(),   // eBay item ID
  title:       text('title').notNull(),
  price:       real('price').notNull(),
  condition:   text('condition').notNull(),
  listingType: text('listing_type').notNull(), // 'bin' | 'auction' | 'both'
  sold30:      integer('sold_30'),
  netProfit:   real('net_profit').notNull(),
  margin:      real('margin').notNull(),
  isDeal:      boolean('is_deal').notNull(),
  ebayUrl:     text('ebay_url').notNull(),
  scannedAt:   timestamp('scanned_at').defaultNow(),
});

export type ScanResult = typeof scanResults.$inferSelect;
