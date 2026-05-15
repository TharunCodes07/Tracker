import Link from "next/link";

import { ArrowRight, Building2, ShieldCheck, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireServerSession } from "@/lib/auth-session";
import { normalizeRole, type AppSessionUser } from "@/lib/rbac";
import { listAdminUsers, listOrganizations } from "@/routes/admin/accounts";

export default async function SuperAdminDashboardPage() {
  const session = await requireServerSession();
  const actor = session.user as AppSessionUser;

  if (normalizeRole(actor.role) !== "SUPER_ADMIN") {
    return null;
  }

  const [organizations, users] = await Promise.all([listOrganizations(), listAdminUsers(actor)]);
  const totals = organizations.reduce(
    (current, organization) => ({
      issues: current.issues + organization.issueCount,
      members: current.members + organization.memberCount,
      projects: current.projects + organization.projectCount,
      teams: current.teams + organization.teamCount,
    }),
    { issues: 0, members: 0, projects: 0, teams: 0 }
  );

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border bg-card/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Super admin dashboard
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Platform overview</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Monitor organizations, dummy admin handoffs, and tenant activity from one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/organizations">
                Manage orgs
                <Building2 className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/users">
                Manage users
                <UserCog className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Organizations", organizations.length, "managed tenants"],
          ["Users", totals.members, `${users.length} visible accounts`],
          ["Teams", totals.teams, "across all tenants"],
          ["Projects", totals.projects, `${totals.issues} total issues`],
        ].map(([label, value, caption]) => (
          <div key={label} className="rounded-2xl border bg-card/80 p-5 shadow-sm">
            <div className="text-xs uppercase text-muted-foreground">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{value}</div>
            <p className="mt-2 text-sm text-muted-foreground">{caption}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border bg-card/80 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Organizations</h2>
            <p className="text-sm text-muted-foreground">Most recent tenant summary.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/organizations">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="divide-y">
          {organizations.slice(0, 5).map((organization) => (
            <div
              key={organization.id}
              className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{organization.name}</div>
                <div className="truncate text-sm text-muted-foreground">
                  {organization.adminEmail ?? "No admin assigned"}
                </div>
              </div>
              <Badge variant="secondary">{organization.memberCount} users</Badge>
              <Badge variant="secondary">{organization.teamCount} teams</Badge>
              <Badge variant="outline">{organization.projectCount} projects</Badge>
            </div>
          ))}
          {organizations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No organizations have been created yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
