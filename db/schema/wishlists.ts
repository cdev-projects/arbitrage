import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const wishlists = pgTable('wishlists', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:      text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Wishlist    = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;
