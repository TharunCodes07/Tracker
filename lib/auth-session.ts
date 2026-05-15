import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { withOrganizationScope } from "@/db";
import { auth } from "@/lib/auth";
import {
  getOrganizationId,
  hasRole,
  isActiveUser,
  normalizeRole,
  type AppRole,
  type AppSessionUser,
} from "@/lib/rbac";

export const getServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

interface RequireServerSessionOptions {
  roles?: AppRole[];
  organizationRequired?: boolean;
  allowPasswordChangeRequired?: boolean;
}

export async function requireServerSession(options: RequireServerSessionOptions = {}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const user = session.user as AppSessionUser;

  if (!isActiveUser(user)) {
    redirect("/login");
  }

  if (user.mustChangePassword && !options.allowPasswordChangeRequired) {
    redirect("/change-password");
  }

  if (options.roles && !hasRole(user, options.roles)) {
    const role = normalizeRole(user.role);
    redirect(role === "SUPER_ADMIN" ? "/admin/organizations" : "/dashboard");
  }

  if (options.organizationRequired && !getOrganizationId(user)) {
    redirect("/admin/organizations");
  }

  return session;
}

export async function withServerOrganization<T>(
  callback: () => Promise<T>,
  options: Omit<RequireServerSessionOptions, "organizationRequired"> = {}
) {
  const session = await requireServerSession({
    ...options,
    organizationRequired: true,
  });
  const organizationId = getOrganizationId(session.user as AppSessionUser);

  if (!organizationId) {
    redirect("/admin/organizations");
  }

  return withOrganizationScope(organizationId, callback);
}

export async function redirectIfAuthenticated(path = "/dashboard") {
  const session = await getServerSession();

  if (session) {
    const user = session.user as AppSessionUser;

    if (user.mustChangePassword) {
      redirect("/change-password");
    }

    redirect(path);
  }
}
