import "server-only";

import { count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";

export async function getUserCount() {
  const [result] = await db.select({ total: count() }).from(user);

  return Number(result?.total ?? 0);
}

export async function getUserByEmail(email: string) {
  const [result] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return result ?? null;
}

export async function listRecentUsers(limit = 5) {
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
