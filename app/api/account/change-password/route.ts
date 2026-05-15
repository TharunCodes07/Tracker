import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { account, user } from "@/db/schema";
import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { RouteError } from "@/routes/errors";

interface ChangePasswordInput {
  password?: string;
}

export async function POST(request: Request) {
  try {
    const actor = await requireRouteUser(request, {
      allowPasswordChangeRequired: true,
    });
    const body = await readJsonBody<ChangePasswordInput>(request);
    const password = body.password ?? "";

    if (password.length < 8) {
      throw new RouteError("Password must be at least 8 characters long.");
    }

    const passwordHash = await hashPassword(password);

    await db.transaction(async (tx) => {
      const [credentialAccount] = await tx
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.userId, actor.id), eq(account.providerId, "credential")))
        .limit(1);

      if (credentialAccount) {
        await tx
          .update(account)
          .set({
            password: passwordHash,
            updatedAt: new Date(),
          })
          .where(eq(account.id, credentialAccount.id));
      } else {
        await tx.insert(account).values({
          id: randomUUID(),
          accountId: actor.id,
          providerId: "credential",
          userId: actor.id,
          password: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await tx
        .update(user)
        .set({
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(user.id, actor.id));
    });

    return NextResponse.json({
      message: "Password updated. Continue to your workspace.",
    });
  } catch (error) {
    return handleRouteError(error, "Unable to update password.");
  }
}
