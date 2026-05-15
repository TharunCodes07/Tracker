import { AsyncLocalStorage } from 'node:async_hooks';

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/tracker';

const client = postgres(connectionString, {
  max: 20,              // max pooled connections
  idle_timeout: 20,     // seconds before idle connections close
  connect_timeout: 10,  // seconds to wait while connecting
});

const rawDb = drizzle(client, { schema });
type Database = typeof rawDb;

const organizationScope = new AsyncLocalStorage<Database>();

export const db = new Proxy(rawDb, {
  get(target, property, receiver) {
    const scopedDb = organizationScope.getStore() ?? target;
    const value = Reflect.get(scopedDb, property, receiver);

    return typeof value === 'function' ? value.bind(scopedDb) : value;
  },
}) as Database;

export async function withOrganizationScope<T>(
  organizationId: string,
  callback: () => Promise<T>
) {
  return rawDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_organization_id', ${organizationId}, true)`);

    return organizationScope.run(tx as unknown as Database, callback);
  });
}

export { rawDb as unscopedDb };
