import type { ComponentType } from "react";

import { CheckCircle2, CircleDot, Flag, Layers3, UserRound } from "lucide-react";

import {
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/issues/shared/issue-display";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  IssueListItem,
  ProjectEpicListItem,
  ProjectIssuesListResponse,
} from "@/routes/issues/types";

export function SummaryView({
  summary,
  issues,
  epics,
  currentUserId,
  onOpenIssue,
}: {
  summary: ProjectIssuesListResponse["summary"] | null;
  issues: IssueListItem[];
  criticalIssues: IssueListItem[];
  epics: ProjectEpicListItem[];
  currentUserId: string | null;
  onOpenIssue: (issue: IssueListItem) => void;
}) {
  const totalIssues = summary?.totalIssues ?? issues.length;
  const resolvedIssues = summary?.resolvedIssueCount ?? summary?.doneIssueCount ?? 0;
  const activeEpics = epics.filter((epic) => epic.status !== "done" && epic.status !== "archived").length;
  const recentIssues = issues.slice(0, 8);
  const assignedIssues = currentUserId
    ? issues
        .filter((issue) => issue.assigneeId === currentUserId || issue.assignedTo === currentUserId)
        .slice(0, 8)
    : [];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Summary</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A clean scan of project status and the issues that need attention.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {totalIssues} {totalIssues === 1 ? "issue" : "issues"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Open work"
          value={summary?.openIssueCount ?? 0}
          icon={CircleDot}
          accentClassName="text-cyan-600 bg-cyan-500/10 dark:text-cyan-300"
        />
        <SummaryMetric
          label="Resolved"
          value={resolvedIssues}
          icon={CheckCircle2}
          accentClassName="text-emerald-600 bg-emerald-500/10 dark:text-emerald-300"
        />
        <SummaryMetric
          label="Critical"
          value={summary?.criticalIssueCount ?? 0}
          icon={Flag}
          accentClassName="text-red-600 bg-red-500/10 dark:text-red-300"
        />
        <SummaryMetric
          label="Active epics"
          value={activeEpics}
          icon={Layers3}
          accentClassName="text-violet-600 bg-violet-500/10 dark:text-violet-300"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <IssueListPanel
          title="Recent Issues"
          description="Latest visible issues in this project."
          issues={recentIssues}
          emptyText="No issues have been created yet."
          onOpenIssue={onOpenIssue}
        />
        <IssueListPanel
          title="Assigned To Me"
          description="Your active slice from the current project."
          issues={assignedIssues}
          emptyText="No visible issues are assigned to you."
          onOpenIssue={onOpenIssue}
          icon={UserRound}
        />
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  accentClassName,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  accentClassName: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border/70 bg-card p-4 shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/70 to-cyan-400/70" />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accentClassName)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function IssueListPanel({
  title,
  description,
  issues,
  emptyText,
  onOpenIssue,
  icon: Icon,
}: {
  title: string;
  description: string;
  issues: IssueListItem[];
  emptyText: string;
  onOpenIssue: (issue: IssueListItem) => void;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/70 to-cyan-400/70" />
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {Icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      {issues.length > 0 ? (
        <div className="divide-y divide-border/70">
          {issues.map((issue) => (
            <button
              key={issue.id}
              type="button"
              onClick={() => onOpenIssue(issue)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            >
              <span className="mt-0.5 w-24 shrink-0 font-mono text-xs text-muted-foreground">
                {issue.key}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 break-words text-sm font-medium">
                  {issue.title}
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  <IssuePriorityBadge priority={issue.priority} />
                  <IssueStatusBadge status={issue.status} />
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</div>
      )}
    </section>
  );
}
