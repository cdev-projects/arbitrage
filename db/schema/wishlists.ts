import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const watchlists = pgTable('watchlists', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:      text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Watchlist    = typeof watchlists.$inferSelect;
export type NewWatchlist = typeof watchlists.$inferInsert;
