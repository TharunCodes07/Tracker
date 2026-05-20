import "dotenv/config";

import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";

import { unscopedDb as db } from "../db";
import {
  account,
  issueActivity,
  issueComments,
  issueLinks,
  issueMedia,
  issues,
  notifications,
  organizationMembers,
  organizations,
  projectComponents,
  projectReleases,
  projects,
  session,
  sprints,
  teamMemberRoles,
  teams,
  teamsToProjects,
  user,
  usersToTeams,
  verification,
} from "../db/schema";

const SUPER_ADMIN_NAME = process.env.SEED_SUPER_ADMIN_NAME ?? "Super Admin";
const SUPER_ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL ?? "superadmin@tracker.local";
const SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "SuperAdmin@123";

const RLS_TABLES = [
  "teams",
  "projects",
  "project_components",
  "project_releases",
  "sprints",
  "issue_comments",
  "issue_activity",
  "issue_links",
  "users_to_teams",
  "team_member_roles",
  "teams_to_projects",
  "issues",
  "issue_media",
  "notifications",
];

async function setRls(enabled: boolean) {
  for (const table of RLS_TABLES) {
    await db.execute(sql.raw(`ALTER TABLE "${table}" ${enabled ? "ENABLE" : "DISABLE"} ROW LEVEL SECURITY`));

    if (enabled) {
      await db.execute(sql.raw(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`));
    }
  }
}

async function cleanDatabase() {
  await setRls(false);

  await db.transaction(async (tx) => {
    await tx.delete(issueMedia);
    await tx.delete(notifications);
    await tx.delete(issueLinks);
    await tx.delete(issueActivity);
    await tx.delete(issueComments);
    await tx.delete(issues);
    await tx.delete(sprints);
    await tx.delete(projectReleases);
    await tx.delete(projectComponents);
    await tx.delete(teamsToProjects);
    await tx.delete(teamMemberRoles);
    await tx.delete(usersToTeams);
    await tx.delete(projects);
    await tx.delete(teams);
    await tx.delete(organizationMembers);
    await tx.delete(session);
    await tx.delete(account);
    await tx.delete(verification);
    await tx.delete(organizations);
    await tx.delete(user);
  });

  await setRls(true);
}

async function createSuperAdmin() {
  const userId = randomUUID();
  const passwordHash = await hashPassword(SUPER_ADMIN_PASSWORD);

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL.toLowerCase(),
      emailVerified: true,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      organizationId: null,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await tx.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}

async function main() {
  await cleanDatabase();
  await createSuperAdmin();

  console.log("Seed complete. Created a single clean super admin.");
  console.log(`Email: ${SUPER_ADMIN_EMAIL.toLowerCase()}`);
  console.log(`Password: ${SUPER_ADMIN_PASSWORD}`);
}

main()
  .catch(async (error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
