import { drizzle } from 'drizzle-orm/postgres-js';
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

export const db = drizzle(client, { schema });