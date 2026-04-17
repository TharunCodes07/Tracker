import "server-only";

import { count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { account, session, user } from "@/db/schema";

async function getTableCount(table: typeof user | typeof account | typeof session) {
  const [result] = await db.select({ total: count() }).from(table);

  return Number(result?.total ?? 0);
}

export async function getAuthUserCount() {
  return getTableCount(user);
}

export async function getAuthUserByEmail(email: string) {
  const [result] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return result ?? null;
}

export async function getAuthSessionCount() {
  return getTableCount(session);
}

export async function getAuthAccountCount() {
  return getTableCount(account);
}

export async function listRecentAuthUsers(limit = 5) {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(limit);
}
