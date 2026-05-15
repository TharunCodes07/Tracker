"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import {
  getOrganizationId,
  hasRole,
  normalizeRole,
  type AppRole,
  type AppSessionUser,
} from "@/lib/rbac";

interface AuthGuardProps {
  children: ReactNode;
  roles?: AppRole[];
  organizationRequired?: boolean;
}

export function AuthGuard({ children, roles, organizationRequired }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user as AppSessionUser | undefined;
  const role = normalizeRole(user?.role);
  const allowedByRole = user && (!roles || hasRole(user, roles));
  const allowedByOrganization =
    !organizationRequired || role === "SUPER_ADMIN" || Boolean(user && getOrganizationId(user));
  const canRender = Boolean(user && allowedByRole && allowedByOrganization && !user.mustChangePassword);

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }

    if (!allowedByRole) {
      router.replace(role === "SUPER_ADMIN" ? "/admin/organizations" : "/dashboard");
      return;
    }

    if (!allowedByOrganization) {
      router.replace("/login");
    }
  }, [allowedByOrganization, allowedByRole, isPending, pathname, role, router, user]);

  if (isPending || !canRender) {
    return null;
  }

  return <>{children}</>;
}
