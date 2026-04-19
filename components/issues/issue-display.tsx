"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  type IssuePriority,
  type IssueStatus,
} from "@/routes/issues/types";

export function getIssuePriorityLabel(priority: IssuePriority) {
  return ISSUE_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? priority;
}

export function getIssueStatusLabel(status: IssueStatus) {
  return ISSUE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function getIssuePriorityOrder(priority: IssuePriority) {
  switch (priority) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}

export function getIssueStatusOrder(status: IssueStatus) {
  switch (status) {
    case "done":
      return 4;
    case "review":
      return 3;
    case "in_progress":
      return 2;
    case "open":
    default:
      return 1;
  }
}

export function isIssueResolved(status: IssueStatus) {
  return status === "done";
}

export function getIssuePriorityBadgeClassName(priority: IssuePriority) {
  switch (priority) {
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300";
    case "high":
      return "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300";
    case "medium":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "low":
    default:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
}

export function getIssuePriorityTextClassName(priority: IssuePriority) {
  switch (priority) {
    case "critical":
      return "text-red-700 dark:text-red-300";
    case "high":
      return "text-orange-700 dark:text-orange-300";
    case "medium":
      return "text-amber-700 dark:text-amber-300";
    case "low":
    default:
      return "text-emerald-700 dark:text-emerald-300";
  }
}

export function getIssuePriorityFilterAccentClassName(priority: IssuePriority) {
  switch (priority) {
    case "critical":
      return "bg-red-500 ring-red-500/18 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]";
    case "high":
      return "bg-orange-500 ring-orange-500/18 shadow-[0_0_0_1px_rgba(249,115,22,0.35)]";
    case "medium":
      return "bg-amber-500 ring-amber-500/18 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]";
    case "low":
    default:
      return "bg-emerald-500 ring-emerald-500/18 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]";
  }
}

export function getIssuePriorityCardAccentClassName(priority: IssuePriority) {
  switch (priority) {
    case "critical":
      return "via-red-500/60 to-orange-400/50";
    case "high":
      return "via-orange-500/60 to-amber-400/50";
    case "medium":
      return "via-amber-500/60 to-cyan-400/40";
    case "low":
    default:
      return "via-emerald-500/60 to-cyan-400/50";
  }
}

export function getIssueStatusBadgeClassName(status: IssueStatus) {
  switch (status) {
    case "done":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "review":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
    case "in_progress":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "open":
    default:
      return "border-border/80 bg-muted/70 text-muted-foreground";
  }
}

export function IssuePriorityBadge({
  priority,
  className,
}: {
  priority: IssuePriority;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border-transparent", getIssuePriorityBadgeClassName(priority), className)}
    >
      <span className="size-1.5 rounded-full bg-current/70" />
      {getIssuePriorityLabel(priority)}
    </Badge>
  );
}

export function IssueStatusBadge({
  status,
  className,
}: {
  status: IssueStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border-transparent", getIssueStatusBadgeClassName(status), className)}
    >
      <span className="size-1.5 rounded-full bg-current/70" />
      {getIssueStatusLabel(status)}
    </Badge>
  );
}
