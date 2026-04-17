import "server-only";

import { count } from "drizzle-orm";

import { db } from "@/db";
import { issues, projects, teams } from "@/db/schema";
import {
  getAuthAccountCount,
  getAuthSessionCount,
  getAuthUserCount,
  listRecentAuthUsers,
} from "@/routes/auth/queries";

async function getTableCount(table: typeof issues | typeof projects | typeof teams) {
  const [result] = await db.select({ total: count() }).from(table);

  return Number(result?.total ?? 0);
}

export async function getDashboardOverview() {
  const [
    issueCount,
    projectCount,
    teamCount,
    authUserCount,
    authAccountCount,
    sessionCount,
    recentUsers,
  ] = await Promise.all([
    getTableCount(issues),
    getTableCount(projects),
    getTableCount(teams),
    getAuthUserCount(),
    getAuthAccountCount(),
    getAuthSessionCount(),
    listRecentAuthUsers(5),
  ]);

  return {
    metrics: [
      { label: "Auth users", value: authUserCount },
      { label: "Auth accounts", value: authAccountCount },
      { label: "Active sessions", value: sessionCount },
      { label: "Teams", value: teamCount },
      { label: "Projects", value: projectCount },
      { label: "Issues", value: issueCount },
    ],
    recentUsers,
  };
}
