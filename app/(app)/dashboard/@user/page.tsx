import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleDot,
  Inbox,
  ListChecks,
  Siren,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  requireServerSession,
  withServerOrganization,
} from "@/lib/auth-session";
import { normalizeRole, type AppSessionUser } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { getDashboardOverviewForUser } from "@/routes/dashboard/queries";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function getLoadClassName(value: number, tone: "normal" | "review" | "risk") {
  if (value <= 0) {
    return "text-muted-foreground";
  }

  if (tone === "risk") {
    return "text-destructive";
  }

  return "text-foreground";
}

export default async function DashboardPage() {
  const session = await requireServerSession();
  const role = normalizeRole((session.user as AppSessionUser).role);

  if (role !== "USER") {
    return null;
  }

  const overview = await withServerOrganization(
    () => getDashboardOverviewForUser(session.user.id),
    { roles: ["USER"] },
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* <Badge variant="outline" className="w-fit">
              Dashboard
            </Badge> */}

            {overview.claimableRoleIssues > 0 ? (
              <Badge variant="secondary" className="w-fit">
                {formatNumber(overview.claimableRoleIssues)} claimable
              </Badge>
            ) : null}
          </div>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Your work queue
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Active assignments, team-owned issues you can claim, project load,
            and the latest workflow notifications.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/teams">
              Open projects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/notifications">
              Notifications
              <BellRing className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          label="Assigned to me"
          value={overview.myAssignedIssues}
          caption="Open developer or tester assignments"
          icon={UserCheck}
          tone="assigned"
        />

        <DashboardMetric
          label="Claimable"
          value={overview.claimableRoleIssues}
          caption="Assigned to one of your roles"
          icon={ListChecks}
          tone="claim"
        />

        <DashboardMetric
          label="In review"
          value={overview.pendingTestIssues}
          caption="Waiting for tester action"
          icon={CheckCircle2}
          tone="review"
        />

        <DashboardMetric
          label="Unread"
          value={overview.unreadNotifications}
          caption="Notifications in your inbox"
          icon={BellRing}
          tone="risk"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
        <div className="rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Project workload
              </h2>

              <p className="text-sm text-muted-foreground">
                Active work grouped by project.
              </p>
            </div>

            <Badge variant="outline">{overview.topProjects.length} shown</Badge>
          </div>

          {overview.topProjects.length === 0 ? (
            <EmptyPanel
              icon={Inbox}
              title="No project activity"
              description="Projects linked to your teams will appear here."
            />
          ) : (
            <div className="grid gap-3 p-3">
              {overview.topProjects.map((project) => (
                <ProjectWorkloadCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Recent activity
              </h2>

              <p className="text-sm text-muted-foreground">
                Newest workflow notifications.
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
            <EmptyPanel
              icon={BellRing}
              title="No notifications"
              description="Issue and project updates will show here."
            />
          ) : (
            <div className="divide-y divide-border/70">
              {overview.recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  className="block px-4 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "mt-1.5 size-2.5 shrink-0 rounded-full",
                        notification.isRead ? "bg-border" : "bg-foreground",
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {notification.title}
                        </p>

                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            {
                              addSuffix: true,
                            },
                          )}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <QueueSummary
          label="Open issues"
          value={overview.openIssues}
          caption="All non-fixed issues in your accessible projects."
          icon={CircleDot}
          tone="normal"
        />

        <QueueSummary
          label="Review queue"
          value={overview.pendingTestIssues}
          caption="Issues marked in review and ready for testing attention."
          icon={CheckCircle2}
          tone="review"
        />

        <QueueSummary
          label="Critical"
          value={overview.criticalIssues}
          caption="Unfixed critical issues across your teams."
          icon={Siren}
          tone="risk"
        />
      </section>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  caption: string;
  icon: typeof UserCheck;
  tone: "assigned" | "claim" | "review" | "risk";
}) {
  const iconToneClassName =
    tone === "risk"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : tone === "review"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : tone === "claim"
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "bg-blue-500/10 text-blue-600 dark:text-blue-400";

  const valueTone = tone === "risk" ? "risk" : "normal";

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>

        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            iconToneClassName,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div
        className={cn(
          "mt-3 text-3xl font-semibold tracking-tight",
          getLoadClassName(value, valueTone),
        )}
      >
        {formatNumber(value)}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

function QueueSummary({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  caption: string;
  icon: typeof UserCheck;
  tone: "normal" | "review" | "risk";
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={cn("h-4 w-4", getLoadClassName(value, tone))} />
        {label}
      </div>

      <div
        className={cn(
          "mt-3 text-2xl font-semibold",
          getLoadClassName(value, tone),
        )}
      >
        {formatNumber(value)}
      </div>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">{caption}</p>
    </div>
  );
}

function ProjectWorkloadCard({
  project,
}: {
  project: {
    id: string;
    teamId: string;
    name: string;
    teamNames: string;
    totalIssues: number;
    openIssues: number;
    pendingTestIssues: number;
    criticalIssues: number;
  };
}) {
  return (
    <Link
      href={`/teams/${project.teamId}/projects/${project.id}`}
      className={cn(
        "group rounded-xl border border-border/70 bg-background p-4 shadow-sm transition-colors hover:bg-muted/35",
        project.criticalIssues > 0
          ? "border-l-4 border-l-destructive"
          : project.pendingTestIssues > 0
            ? "border-l-4 border-l-foreground/50"
            : "border-l-4 border-l-border",
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {project.name}
            </h3>

            <Badge variant="secondary">
              {formatNumber(project.totalIssues)} total
            </Badge>
          </div>

          <p className="mt-1 truncate text-sm text-muted-foreground">
            {project.teamNames}
          </p>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-80">
          <WorkloadChip label="Open" value={project.openIssues} tone="normal" />

          <WorkloadChip
            label="Review"
            value={project.pendingTestIssues}
            tone="review"
          />

          <WorkloadChip
            label="Critical"
            value={project.criticalIssues}
            tone="risk"
          />
        </div>
      </div>
    </Link>
  );
}

function WorkloadChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "normal" | "review" | "risk";
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
      <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div
        className={cn(
          "mt-1 text-base font-semibold",
          getLoadClassName(value, tone),
        )}
      >
        {formatNumber(value)}
      </div>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Inbox;
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-border/70 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>

      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
