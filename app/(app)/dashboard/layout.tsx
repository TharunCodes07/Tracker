import type { ReactNode } from "react";

import { requireServerSession } from "@/lib/auth-session";
import { normalizeRole, type AppSessionUser } from "@/lib/rbac";

export default async function DashboardRoleLayout({
  admin,
  superAdmin,
  user,
}: Readonly<{
  admin: ReactNode;
  superAdmin: ReactNode;
  user: ReactNode;
}>) {
  const session = await requireServerSession();
  const role = normalizeRole((session.user as AppSessionUser).role);

  if (role === "SUPER_ADMIN") {
    return <>{superAdmin}</>;
  }

  if (role === "ADMIN") {
    return <>{admin}</>;
  }

  return <>{user}</>;
}
