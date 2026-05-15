import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UserDetails } from "@/components/admin/user-details";
import { requireServerSession } from "@/lib/auth-session";
import { normalizeRole, type AppSessionUser } from "@/lib/rbac";
import { getAdminUserDetails, listOrganizations } from "@/routes/admin/accounts";
import { RouteError } from "@/routes/errors";

export const metadata: Metadata = {
  title: "User Details | Tracker",
  description: "Review Tracker user details.",
};

export default async function UserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await requireServerSession({ roles: ["SUPER_ADMIN", "ADMIN"] });
  const actor = session.user as AppSessionUser;
  const { userId } = await params;
  const isSuperAdmin = normalizeRole(actor.role) === "SUPER_ADMIN";

  const managedUser = await getAdminUserDetails(actor, userId).catch((error) => {
    if (error instanceof RouteError && error.status === 404) {
      notFound();
    }

    throw error;
  });
  const organizations = isSuperAdmin ? await listOrganizations() : [];

  return (
    <UserDetails
      currentUserId={actor.id}
      initialUser={managedUser}
      isSuperAdmin={isSuperAdmin}
      organizations={organizations}
    />
  );
}
