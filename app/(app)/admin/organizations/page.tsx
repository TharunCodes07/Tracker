import type { Metadata } from "next";

import { OrganizationManagement } from "@/components/admin/organization-management";
import { requireServerSession } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Organizations | Tracker",
  description: "Manage Tracker organizations.",
};

export default async function OrganizationsPage() {
  await requireServerSession({ roles: ["SUPER_ADMIN"] });

  return <OrganizationManagement />;
}
