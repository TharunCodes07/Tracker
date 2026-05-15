import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  Bug,
  ShieldCheck,
  Siren,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireServerSession, withServerOrganization } from "@/lib/auth-session";
import { normalizeRole, type AppSessionUser } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { getDashboardOverviewForUser } from "@/routes/dashboard/queries";

function getIssueAccentClassName(value: number, tone: "open" | "pending" | "critical") {
  if (value <= 0) {
    return "text-muted-foreground";
  }

  switch (tone) {
    case "pending":
      return "text-cyan-700 dark:text-cyan-300";
    case "critical":
      return "text-rose-700 dark:text-rose-300";
    case "open":
    default:
      return "text-amber-700 dark:text-amber-300";
  }
}

export default async function DashboardPage() {
  const session = await requireServerSession();
  const role = normalizeRole((session.user as AppSessionUser).role);

  if (role !== "USER") {
    return null;
  }

  const overview = await withServerOrganization(
    () => getDashboardOverviewForUser(session.user.id),
    { roles: ["USER"] }
  );
  const firstName = session.user.name.split(" ")[0] ?? session.user.name;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[34px] border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.68))] px-5 py-5 shadow-sm dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.1),transparent_30%),linear-gradient(180deg,rgba(9,14,19,0.96),rgba(9,14,19,0.88))] sm:px-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge
              variant="outline"
              className="w-fit border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Workspace overview
            </Badge>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {firstName}, here is the signal that matters today.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Your teams, projects, open defects, pending tests, and unread activity are grouped
                into one operating view so you can decide where to jump next without scanning every
                project manually.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90">
                <Link href="/teams">
                  Open teams
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/notifications">
                  Open notifications
                  <BellRing className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem] xl:max-w-104">
            <div className="rounded-3xl border border-border/60 bg-background/80 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Teams
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">
                {overview.totalTeams}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {overview.editableTeams} with edit access
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/80 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Projects
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">
                {overview.totalProjects}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">currently accessible</div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/80 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Open issues
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">
                {overview.openIssues}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {overview.pendingTestIssues} waiting on test
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/80 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Unread
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">
                {overview.unreadNotifications}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">notifications in the inbox</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
        <div className="rounded-[30px] border border-border/60 bg-card/80 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Project health</h2>
              <p className="text-sm text-muted-foreground">
                The busiest projects across your current workspace.
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              {overview.topProjects.length} projects
            </Badge>
          </div>

          {overview.topProjects.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-muted-foreground">
              No projects are linked to your teams yet.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {overview.topProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/teams/${project.teamId}/projects/${project.id}`}
                  className="grid gap-4 px-5 py-4 transition-colors hover:bg-accent/35 lg:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-foreground">
                        {project.name}
                      </h3>
                      <Badge variant="secondary">{project.totalIssues} total</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{project.teamNames}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-right sm:min-w-[18rem]">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Open
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-lg font-semibold",
                          getIssueAccentClassName(project.openIssues, "open")
                        )}
                      >
                        {project.openIssues}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Awaiting review
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-lg font-semibold",
                          getIssueAccentClassName(project.pendingTestIssues, "pending")
                        )}
                      >
                        {project.pendingTestIssues}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Critical
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-lg font-semibold",
                          getIssueAccentClassName(project.criticalIssues, "critical")
                        )}
                      >
                        {project.criticalIssues}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-[30px] border border-border/60 bg-card/80 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Role footprint</h2>
                <p className="text-sm text-muted-foreground">
                  Where you are expected to build or test.
                </p>
              </div>
              <BriefcaseBusiness className="h-5 w-5 text-emerald-500" />
            </div>

            <div className="grid gap-3 px-5 py-5">
              <div className="rounded-3xl border border-border/60 bg-background/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">Developer roles</div>
                    <div className="text-sm text-muted-foreground">
                      Teams where reopened work comes back to you.
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-foreground">
                    {overview.developerRoleCount}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/60 bg-background/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">Tester roles</div>
                    <div className="text-sm text-muted-foreground">
                      Teams where new and done issues route to you.
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-foreground">
                    {overview.testerRoleCount}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/60 bg-background/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">Critical issues</div>
                    <div className="text-sm text-muted-foreground">
                      Current high-risk defects across the workspace.
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-rose-700 dark:text-rose-300">
                    {overview.criticalIssues}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-border/60 bg-card/80 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
                <p className="text-sm text-muted-foreground">
                  The latest signals from projects and issue flows.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/notifications">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {overview.recentNotifications.length === 0 ? (
              <div className="px-5 py-10 text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {overview.recentNotifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    className="group flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent/35"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            notification.isRead ? "bg-border" : "bg-rose-500"
                          )}
                        />
                        <p className="truncate text-sm font-semibold text-foreground">
                          {notification.title}
                        </p>
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-border/60 bg-card/80 px-5 py-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bug className="h-4 w-4 text-amber-500" />
            Open workload
          </div>
          <div className="mt-3 text-3xl font-semibold text-foreground">{overview.openIssues}</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Issues that are not done yet across all accessible projects.
          </p>
        </div>

        <div className="rounded-[28px] border border-border/60 bg-card/80 px-5 py-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-cyan-500" />
            Awaiting review
          </div>
          <div className="mt-3 text-3xl font-semibold text-foreground">
            {overview.pendingTestIssues}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Items finished by developers but still waiting on tester confirmation.
          </p>
        </div>

        <div className="rounded-[28px] border border-border/60 bg-card/80 px-5 py-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Siren className="h-4 w-4 text-rose-500" />
            Critical watchlist
          </div>
          <div className="mt-3 text-3xl font-semibold text-foreground">
            {overview.criticalIssues}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            High-risk issues that deserve the fastest response window.
          </p>
        </div>
      </section>
    </div>
  );
}
