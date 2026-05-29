import type { KeyboardEvent } from "react";

import {
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flag,
  Layers3,
  PackageCheck,
  UserCheck,
  UserRound,
} from "lucide-react";

import {
  getIssuePriorityCardAccentClassName,
  IssuePriorityBadge,
  IssueReopenedBadge,
  IssueStatusBadge,
} from "@/components/issues/shared/issue-display";
import {
  getIssueAssignmentLabel,
  getIssueTesterAssignmentLabel,
} from "@/components/issues/shared/issue-text";
import { IssueMediaSummary } from "@/components/issues/media/issue-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { IssueListItem } from "@/routes/issues/types";

interface IssueCardViewProps {
  issues: IssueListItem[];
  totalIssueCount: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  canEdit: boolean;
  onIssueClick?: (issue: IssueListItem) => void;
  selectedIssueIds?: string[];
  onSelectedIssueIdsChange?: (issueIds: string[]) => void;
  onPageIndexChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100];

function getModuleLabel(issue: IssueListItem) {
  return issue.moduleName ?? "Unassigned module";
}

function getComponentLabel(issue: IssueListItem) {
  return issue.componentName ?? "No component";
}

function handleCardKeyDown(
  event: KeyboardEvent<HTMLElement>,
  issue: IssueListItem,
  onIssueClick?: (issue: IssueListItem) => void
) {
  if (!onIssueClick || event.currentTarget !== event.target) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onIssueClick(issue);
  }
}

export function IssueCardView({
  issues,
  totalIssueCount,
  pageIndex,
  pageSize,
  pageCount,
  canEdit,
  onIssueClick,
  selectedIssueIds = [],
  onSelectedIssueIdsChange,
  onPageIndexChange,
  onPageSizeChange,
}: IssueCardViewProps) {
  const canGoPrevious = pageIndex > 0;
  const canGoNext = pageIndex + 1 < pageCount;
  const resolvedPageCount = Math.max(1, pageCount);
  const canSelect = Boolean(onSelectedIssueIdsChange);

  function toggleIssueSelection(issueId: string, checked: boolean) {
    const nextSelection = new Set(selectedIssueIds);

    if (checked) {
      nextSelection.add(issueId);
    } else {
      nextSelection.delete(issueId);
    }

    onSelectedIssueIdsChange?.(Array.from(nextSelection));
  }

  if (issues.length === 0) {
    return <IssueEmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {issues.map((issue) => {
          const isInteractive = Boolean(onIssueClick);
          const assignedTo = getIssueAssignmentLabel(issue);
          const isSelected = selectedIssueIds.includes(issue.id);

          return (
            <Card
              key={issue.id}
              role={isInteractive ? "button" : undefined}
              tabIndex={isInteractive ? 0 : undefined}
              aria-label={
                isInteractive
                  ? `${canEdit ? "Edit" : "Open"} issue #${issue.no} ${issue.title}`
                  : undefined
              }
              onClick={isInteractive ? () => onIssueClick?.(issue) : undefined}
              onKeyDown={(event) => handleCardKeyDown(event, issue, onIssueClick)}
              className={cn(
                "relative min-h-50 min-w-0 border-border/60 bg-card shadow-sm transition-shadow duration-200",
                getIssuePriorityCardAccentClassName(issue.priority),
                isInteractive &&
                  "cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              <CardHeader className="gap-2 border-b border-border/40 px-4 py-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {canSelect ? (
                      <div onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            toggleIssueSelection(issue.id, checked === true)
                          }
                          aria-label={`Select ${issue.key}`}
                        />
                      </div>
                    ) : null}
                    <Badge variant="secondary" className="font-mono text-xs">
                      #{issue.no}
                    </Badge>
                  </div>
                  <div className="flex min-w-0 flex-wrap justify-end gap-1">
                    <IssuePriorityBadge priority={issue.priority} />
                    <IssueStatusBadge status={issue.status} />
                    {issue.reopenedAt ? <IssueReopenedBadge /> : null}
                  </div>
                </div>

                <div className="min-w-0 space-y-1.5">
                  <CardTitle
                    className="line-clamp-2 text-sm leading-snug font-medium wrap-anywhere"
                    title={issue.title}
                  >
                    {issue.title}
                  </CardTitle>
                  {issue.description && (
                    <p
                      className="line-clamp-1 text-xs leading-4 text-muted-foreground wrap-anywhere"
                      title={issue.description}
                    >
                      {issue.description}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <span className="truncate">{getModuleLabel(issue)}</span>
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <span className="truncate">{getComponentLabel(issue)}</span>
                  </Badge>
                </div>

                {issue.media.length > 0 ? (
                  <IssueMediaSummary
                    issueId={issue.id}
                    media={issue.media}
                    className="justify-start"
                    compact
                  />
                ) : null}

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <Boxes className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-muted-foreground">{issue.issueClassName}</span>
                  </div>
                  {issue.epicTitle ? (
                    <div className="flex items-start gap-2 min-w-0">
                      <Layers3 className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-muted-foreground">{issue.epicTitle}</span>
                    </div>
                  ) : null}
                  {issue.sprintName ? (
                    <div className="flex items-start gap-2 min-w-0">
                      <CalendarDays className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-muted-foreground">{issue.sprintName}</span>
                    </div>
                  ) : null}
                  {issue.releaseName ? (
                    <div className="flex items-start gap-2 min-w-0">
                      <Flag className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-muted-foreground">{issue.releaseName}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserRound className="h-3 w-3 shrink-0" />
                    <span className="truncate">Dev {assignedTo}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserCheck className="h-3 w-3 shrink-0" />
                    <span className="truncate">Test {getIssueTesterAssignmentLabel(issue)}</span>
                  </div>
                  {issue.testedByName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserCheck className="h-3 w-3 shrink-0" />
                      <span className="truncate">{issue.testedByName}</span>
                    </div>
                  )}
                </div>

                {(issue.developmentStatus || issue.deploymentStatus) && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs py-0">
                      <PackageCheck className="h-3 w-3" />
                      {issue.developmentStatus.replaceAll("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs py-0">
                      Deploy {issue.deploymentStatus.replaceAll("_", " ")}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Page {pageIndex + 1} of {resolvedPageCount} - {totalIssueCount}{" "}
          {totalIssueCount === 1 ? "issue" : "issues"}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageIndexChange(pageIndex - 1)}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageIndexChange(pageIndex + 1)}
            disabled={!canGoNext}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function IssueEmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-dashed border-border/70 bg-background/70 px-5 py-12 text-center",
        className
      )}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center">
        <IssueListEmptyVisual />
        <div className="mt-6 inline-flex items-center rounded-full border border-border/70 px-2 py-1 text-xs text-muted-foreground">
          Queue cleared
        </div>
        <h3 className="mt-3 text-xl font-semibold tracking-tight">No matching issues</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          The current filters did not return any issue cards.
        </p>
      </div>
    </div>
  );
}

function IssueListEmptyVisual() {
  return (
    <div className="relative h-52 w-full max-w-md">
      <QueueStackFrame />
      <DrawnIssueTick className="absolute inset-0" />
    </div>
  );
}

function QueueStackFrame() {
  return (
    <>
      <QueueCard className="left-1/2 top-0 w-[78%] -translate-x-1/2" delay={0} rows={2} />
      <QueueCard className="left-1/2 top-11 w-[84%] -translate-x-1/2" delay={160} rows={2} />
      <QueueCard className="left-1/2 top-[5.5rem] w-[76%] -translate-x-1/2" delay={320} rows={2} />
    </>
  );
}

function QueueCard({
  className,
  delay,
  rows,
  compact,
}: {
  className?: string;
  delay: number;
  rows: number;
  compact?: boolean;
}) {
  return (
    <div className={cn("absolute", className)}>
      <div className="tracker-empty-jiggle rounded-2xl border border-border/70 bg-background p-3 shadow-sm" style={{ animationDelay: `${delay}ms` }}>
        <div className="mb-3 flex items-center justify-between">
          <div className="h-2 w-20 rounded-full bg-muted" />
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500/50" />
            <span className="h-2 w-2 rounded-full bg-muted" />
          </div>
        </div>
        <IssueListRows rows={rows} compact={compact} />
      </div>
    </div>
  );
}

function IssueListRows({
  rows = 4,
  compact,
}: {
  rows?: number;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <IssueListRow key={index} compact={compact} />
      ))}
    </div>
  );
}

function IssueListRow({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3",
        compact ? "h-8" : "h-9"
      )}
    >
      <span className="h-3 w-3 rounded border border-border bg-background" />
      <span className="h-2 min-w-0 flex-1 rounded-full bg-muted" />
      <span className="h-2 w-10 rounded-full bg-muted/70" />
    </div>
  );
}

function DrawnIssueTick({ className }: { className?: string }) {
  return (
    <svg className={cn("pointer-events-none h-full w-full", className)} viewBox="0 0 420 220" aria-hidden="true">
      <path
        d="M130 112 182 157 292 63"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="22"
        className="text-emerald-500/10"
      />
      <path
        d="M130 112 182 157 292 63"
        fill="none"
        pathLength={118}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="14"
        className="tracker-empty-draw text-emerald-600/90 dark:text-emerald-300"
      />
    </svg>
  );
}
