import { pgTable, text, real, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { watchlistCards } from './watchlist';

export const scanResults = pgTable('scan_results', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cardId:      text('card_id').notNull().references(() => watchlistCards.id, { onDelete: 'cascade' }),
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
