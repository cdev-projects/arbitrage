import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as watchlistSchema from './schema/watchlist';
import * as wishlistsSchema from './schema/wishlists';
import * as snapshotsSchema from './schema/snapshots';
import * as scanResultsSchema from './schema/scan-results';

const schema = { ...watchlistSchema, ...wishlistsSchema, ...snapshotsSchema, ...scanResultsSchema };

let db: ReturnType<typeof drizzle<typeof schema>>;

function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Add it to .env.local');
    }
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    db = drizzle(client, { schema });
  }
  return db;
}

export { getDb };
export type Db = ReturnType<typeof getDb>;
