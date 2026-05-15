import type { Metadata } from "next";

import { UserManagement } from "@/components/admin/user-management";
import { requireServerSession } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Users | Tracker",
  description: "Manage Tracker users.",
};

export default async function UsersPage() {
  await requireServerSession({ roles: ["SUPER_ADMIN", "ADMIN"] });

  return <UserManagement />;
}
