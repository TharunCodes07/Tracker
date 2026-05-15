import Link from "next/link";

import { ArrowRight, ShieldCheck, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireServerSession, withServerOrganization } from "@/lib/auth-session";
import { normalizeRole, type AppSessionUser } from "@/lib/rbac";
import { getDashboardOverviewForUser } from "@/routes/dashboard/queries";
import { listAdminUsers } from "@/routes/admin/accounts";

export default async function AdminDashboardPage() {
  const session = await requireServerSession();
  const actor = session.user as AppSessionUser;

  if (normalizeRole(actor.role) !== "ADMIN") {
    return null;
  }

  const [overview, managedUsers] = await Promise.all([
    withServerOrganization(() => getDashboardOverviewForUser(session.user.id), {
      roles: ["ADMIN"],
    }),
    listAdminUsers(actor),
  ]);
  const pendingPasswords = managedUsers.filter((user) => user.mustChangePassword).length;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border bg-card/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Admin dashboard
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Workspace control</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review users, team coverage, and work volume for your organization.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/users">
                Manage users
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/teams">
                Open teams
                <UsersRound className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Users", managedUsers.length, `${pendingPasswords} need password change`],
          ["Teams", overview.totalTeams, `${overview.editableTeams} editable`],
          ["Projects", overview.totalProjects, "accessible in this org"],
          ["Open issues", overview.openIssues, `${overview.criticalIssues} critical`],
        ].map(([label, value, caption]) => (
          <div key={label} className="rounded-2xl border bg-card/80 p-5 shadow-sm">
            <div className="text-xs uppercase text-muted-foreground">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{value}</div>
            <p className="mt-2 text-sm text-muted-foreground">{caption}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border bg-card/80 shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold text-foreground">Recent user accounts</h2>
          <p className="text-sm text-muted-foreground">
            Accounts visible to your admin role.
          </p>
        </div>
        <div className="divide-y">
          {managedUsers.slice(0, 5).map((managedUser) => (
            <div
              key={managedUser.id}
              className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{managedUser.name}</div>
                <div className="truncate text-sm text-muted-foreground">{managedUser.email}</div>
              </div>
              <Badge variant="secondary">{managedUser.role === "ADMIN" ? "Admin" : "User"}</Badge>
              <Badge variant={managedUser.mustChangePassword ? "outline" : "secondary"}>
                {managedUser.mustChangePassword ? "Password pending" : managedUser.status}
              </Badge>
            </div>
          ))}
          {managedUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No users have been created yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
