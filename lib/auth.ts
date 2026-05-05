import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { db } from "../db";
import * as schema from "../db/schema";

const authBaseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
  "http://localhost:3000";

const isProductionBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  (isProductionBuild ? "build-time-only-better-auth-secret" : undefined);

if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET is required.");
}

const trustedOrigins = Array.from(
  new Set(
    [
      authBaseURL,
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS
        ?.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean) ?? []),
    ].filter(Boolean)
  )
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
  secret: authSecret,
  baseURL: authBaseURL,
  trustedOrigins,
});
