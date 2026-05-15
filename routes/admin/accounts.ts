import "server-only";

import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";

import { db, withOrganizationScope } from "@/db";
import { account, issues, organizationMembers, organizations, projects, teams, user } from "@/db/schema";
import { normalizeRole, type AppRole } from "@/lib/rbac";
import { RouteError } from "@/routes/errors";

export interface CreatedAccountCredentials {
  userId: string;
  email: string;
  password: string;
}

export interface OrganizationListItem {
  id: string;
  name: string;
  slug: string;
  adminEmail: string | null;
  memberCount: number;
  teamCount: number;
  projectCount: number;
  issueCount: number;
  createdAt: string;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: string;
  mustChangePassword: boolean;
  organizationId: string | null;
  organizationName: string | null;
  createdAt: string;
}

export interface OrganizationDetails extends OrganizationListItem {
  users: AdminUserListItem[];
}

export type AdminUserDetails = AdminUserListItem;

export interface CreateOrganizationInput {
  name?: string;
  slug?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
}

export interface CreateUserInput {
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  organizationId?: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  USER: "User",
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeName(value: string | undefined, label: string) {
  const normalized = value?.trim() ?? "";

  if (normalized.length < 2) {
    throw new RouteError(`${label} must be at least 2 characters long.`);
  }

  if (normalized.length > 255) {
    throw new RouteError(`${label} must be 255 characters or fewer.`);
  }

  return normalized;
}

function normalizeSlug(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(normalized)) {
    throw new RouteError("Slug must use lowercase letters, numbers, and hyphens.");
  }

  return normalized;
}

function normalizeEmail(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new RouteError("Enter a valid email address.");
  }

  return normalized;
}

function createTemporaryPassword() {
  return `12345678`;
}

async function ensureEmailAvailable(email: string) {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    throw new RouteError("A user with that email already exists.", 409);
  }
}

async function ensureEmailAvailableForUser(email: string, userId: string) {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.email, email), ne(user.id, userId)))
    .limit(1);

  if (existing) {
    throw new RouteError("A user with that email already exists.", 409);
  }
}

async function ensureSlugAvailableForOrganization(slug: string, organizationId: string) {
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.slug, slug), ne(organizations.id, organizationId)))
    .limit(1);

  if (existing) {
    throw new RouteError("An organization with that slug already exists.", 409);
  }
}

function normalizeStatus(value: string | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "ACTIVE";

  if (normalized !== "ACTIVE" && normalized !== "INACTIVE") {
    throw new RouteError("Status must be ACTIVE or INACTIVE.");
  }

  return normalized;
}

async function createCredentialAccount(input: {
  name: string;
  email: string;
  role: AppRole;
  organizationId: string | null;
}) {
  await ensureEmailAvailable(input.email);

  const userId = randomUUID();
  const password = createTemporaryPassword();
  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: input.role,
      status: "ACTIVE",
      organizationId: input.organizationId,
      mustChangePassword: input.role !== "SUPER_ADMIN",
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

    if (input.organizationId) {
      await tx.insert(organizationMembers).values({
        organizationId: input.organizationId,
        userId,
        role: input.role,
        createdAt: new Date(),
      });
    }
  });

  return {
    userId,
    email: input.email,
    password,
  } satisfies CreatedAccountCredentials;
}

async function getOrganizationStats(organizationId: string) {
  return withOrganizationScope(organizationId, async () => {
    const teamRows = await db.select({ value: count() }).from(teams);
    const projectRows = await db.select({ value: count() }).from(projects);
    const issueRows = await db.select({ value: count() }).from(issues);

    return {
      teamCount: Number(teamRows[0]?.value ?? 0),
      projectCount: Number(projectRows[0]?.value ?? 0),
      issueCount: Number(issueRows[0]?.value ?? 0),
    };
  });
}

async function listUsersForOrganization(organizationId: string): Promise<AdminUserListItem[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      organizationId: user.organizationId,
      organizationName: organizations.name,
      createdAt: user.createdAt,
    })
    .from(user)
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .where(and(eq(user.organizationId, organizationId), ne(user.role, "SUPER_ADMIN")))
    .orderBy(asc(user.role), asc(user.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role),
    status: row.status,
    mustChangePassword: row.mustChangePassword,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    createdAt: toIsoString(row.createdAt),
  }));
}

export async function listOrganizations(): Promise<OrganizationListItem[]> {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      adminEmail: sql<string | null>`min(case when ${organizationMembers.role} = 'ADMIN' then ${user.email} else null end)`,
      memberCount: count(organizationMembers.userId),
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .leftJoin(organizationMembers, eq(organizationMembers.organizationId, organizations.id))
    .leftJoin(user, eq(user.id, organizationMembers.userId))
    .groupBy(organizations.id)
    .orderBy(asc(organizations.name));

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      adminEmail: row.adminEmail,
      memberCount: Number(row.memberCount ?? 0),
      ...(await getOrganizationStats(row.id)),
      createdAt: toIsoString(row.createdAt),
    }))
  );
}

export async function getOrganizationDetails(organizationId: string): Promise<OrganizationDetails> {
  const [row] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      adminEmail: sql<string | null>`min(case when ${organizationMembers.role} = 'ADMIN' then ${user.email} else null end)`,
      memberCount: count(organizationMembers.userId),
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .leftJoin(organizationMembers, eq(organizationMembers.organizationId, organizations.id))
    .leftJoin(user, eq(user.id, organizationMembers.userId))
    .where(eq(organizations.id, organizationId))
    .groupBy(organizations.id)
    .limit(1);

  if (!row) {
    throw new RouteError("Organization not found.", 404);
  }

  const [stats, users] = await Promise.all([
    getOrganizationStats(row.id),
    listUsersForOrganization(row.id),
  ]);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    adminEmail: row.adminEmail,
    memberCount: Number(row.memberCount ?? 0),
    ...stats,
    createdAt: toIsoString(row.createdAt),
    users,
  };
}

export async function createOrganizationWithAdmin(input: CreateOrganizationInput, createdBy: string) {
  const name = normalizeName(input.name, "Organization name");
  const slug = normalizeSlug(input.slug);
  const adminEmail = `admin@${slug}.tracker.local`;

  const [existingOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (existingOrg) {
    throw new RouteError("An organization with that slug already exists.", 409);
  }

  await ensureEmailAvailable(adminEmail);

  const [createdOrg] = await db
    .insert(organizations)
    .values({
      name,
      slug,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
    });

  if (!createdOrg) {
    throw new RouteError("Organization could not be created.", 500);
  }

  const adminCredentials = await createCredentialAccount({
    name: `${name} Admin`,
    email: adminEmail,
    role: "ADMIN",
    organizationId: createdOrg.id,
  });

  return {
    organization: {
      id: createdOrg.id,
      name: createdOrg.name,
      slug: createdOrg.slug,
      adminEmail: adminCredentials.email,
      memberCount: 1,
      teamCount: 0,
      projectCount: 0,
      issueCount: 0,
      createdAt: toIsoString(createdOrg.createdAt),
    } satisfies OrganizationListItem,
    adminCredentials,
  };
}

export async function updateOrganization(
  organizationId: string,
  input: UpdateOrganizationInput
): Promise<OrganizationDetails> {
  const name = normalizeName(input.name, "Organization name");
  const slug = normalizeSlug(input.slug);

  const [existingOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!existingOrg) {
    throw new RouteError("Organization not found.", 404);
  }

  await ensureSlugAvailableForOrganization(slug, organizationId);

  await db
    .update(organizations)
    .set({
      name,
      slug,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));

  return getOrganizationDetails(organizationId);
}

export async function deleteOrganization(organizationId: string) {
  const [existingOrg] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!existingOrg) {
    throw new RouteError("Organization not found.", 404);
  }

  await db.transaction(async (tx) => {
    await tx.delete(user).where(and(eq(user.organizationId, organizationId), ne(user.role, "SUPER_ADMIN")));
    await tx.delete(organizations).where(eq(organizations.id, organizationId));
  });

  return {
    organizationId,
    name: existingOrg.name,
  };
}

export async function listAdminUsers(actor: {
  role?: string | null;
  organizationId?: string | null;
}): Promise<AdminUserListItem[]> {
  const role = normalizeRole(actor.role);
  const whereClause =
    role === "SUPER_ADMIN"
      ? ne(user.role, "SUPER_ADMIN")
      : actor.organizationId
        ? and(eq(user.organizationId, actor.organizationId), ne(user.role, "SUPER_ADMIN"))
        : eq(user.id, "__no_user__");

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      organizationId: user.organizationId,
      organizationName: organizations.name,
      createdAt: user.createdAt,
    })
    .from(user)
    .leftJoin(organizations, eq(user.organizationId, organizations.id))
    .where(whereClause)
    .orderBy(asc(organizations.name), asc(user.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role),
    status: row.status,
    mustChangePassword: row.mustChangePassword,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    createdAt: toIsoString(row.createdAt),
  }));
}

export async function getAdminUserDetails(
  actor: {
    role?: string | null;
    organizationId?: string | null;
  },
  userId: string
): Promise<AdminUserDetails> {
  const users = await listAdminUsers(actor);
  const managedUser = users.find((item) => item.id === userId);

  if (!managedUser) {
    throw new RouteError("User not found.", 404);
  }

  return managedUser;
}

export async function createManagedUser(
  actor: {
    role?: string | null;
    organizationId?: string | null;
  },
  input: CreateUserInput
) {
  const actorRole = normalizeRole(actor.role);
  const name = normalizeName(input.name, "Full name");
  const email = normalizeEmail(input.email);
  const requestedRole = normalizeRole(input.role);
  const organizationId =
    actorRole === "SUPER_ADMIN" ? input.organizationId?.trim() : actor.organizationId;

  if (!organizationId) {
    throw new RouteError("Choose an organization for this user.");
  }

  if (requestedRole === "SUPER_ADMIN") {
    throw new RouteError("Super admins can only be created by the seed script.", 403);
  }

  if (actorRole !== "SUPER_ADMIN" && requestedRole !== "USER") {
    throw new RouteError("Organization admins can only create users.", 403);
  }

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new RouteError("Organization not found.", 404);
  }

  const credentials = await createCredentialAccount({
    name,
    email,
    role: requestedRole,
    organizationId,
  });

  return {
    user: {
      id: credentials.userId,
      name,
      email,
      role: requestedRole,
      status: "ACTIVE",
      mustChangePassword: true,
      organizationId,
      organizationName: org.name,
      createdAt: new Date().toISOString(),
    } satisfies AdminUserListItem,
    credentials,
    roleLabel: ROLE_LABELS[requestedRole],
  };
}

export async function updateManagedUser(
  actor: {
    role?: string | null;
    organizationId?: string | null;
  },
  userId: string,
  input: UpdateUserInput
) {
  const actorRole = normalizeRole(actor.role);
  const target = await getAdminUserDetails(actor, userId);
  const name = normalizeName(input.name, "Full name");
  const email = normalizeEmail(input.email);
  const requestedRole = normalizeRole(input.role);
  const status = normalizeStatus(input.status);
  const organizationId =
    actorRole === "SUPER_ADMIN" ? input.organizationId?.trim() : actor.organizationId;

  if (!organizationId) {
    throw new RouteError("Choose an organization for this user.");
  }

  if (requestedRole === "SUPER_ADMIN") {
    throw new RouteError("Super admins can only be managed by the seed script.", 403);
  }

  if (actorRole !== "SUPER_ADMIN" && (requestedRole !== "USER" || target.role !== "USER")) {
    throw new RouteError("Organization admins can only manage users.", 403);
  }

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new RouteError("Organization not found.", 404);
  }

  await ensureEmailAvailableForUser(email, userId);

  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({
        name,
        email,
        role: requestedRole,
        status,
        organizationId,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    await tx.delete(organizationMembers).where(eq(organizationMembers.userId, userId));
    await tx.insert(organizationMembers).values({
      organizationId,
      userId,
      role: requestedRole,
      createdAt: new Date(),
    });
  });

  return {
    id: userId,
    name,
    email,
    role: requestedRole,
    status,
    mustChangePassword: target.mustChangePassword,
    organizationId,
    organizationName: org.name,
    createdAt: target.createdAt,
  } satisfies AdminUserListItem;
}

export async function deleteManagedUser(
  actor: {
    id?: string | null;
    role?: string | null;
    organizationId?: string | null;
  },
  userId: string
) {
  if (actor.id === userId) {
    throw new RouteError("You cannot delete your own account.", 403);
  }

  const actorRole = normalizeRole(actor.role);
  const target = await getAdminUserDetails(actor, userId);

  if (actorRole !== "SUPER_ADMIN" && target.role !== "USER") {
    throw new RouteError("Organization admins can only delete users.", 403);
  }

  await db.delete(user).where(eq(user.id, userId));

  return {
    userId,
    name: target.name,
  };
}
