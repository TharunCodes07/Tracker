export const APP_ROLES = ["SUPER_ADMIN", "ADMIN", "USER"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface AppSessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  organizationId?: string | null;
  mustChangePassword?: boolean | null;
}

export function normalizeRole(role: string | null | undefined): AppRole {
  return APP_ROLES.includes(role as AppRole) ? (role as AppRole) : "USER";
}

export function isActiveUser(user: AppSessionUser) {
  return (user.status ?? "ACTIVE") === "ACTIVE";
}

export function hasRole(user: AppSessionUser, roles: AppRole[]) {
  return roles.includes(normalizeRole(user.role));
}

export function isSuperAdmin(user: AppSessionUser) {
  return normalizeRole(user.role) === "SUPER_ADMIN";
}

export function getOrganizationId(user: AppSessionUser) {
  return user.organizationId ?? null;
}
