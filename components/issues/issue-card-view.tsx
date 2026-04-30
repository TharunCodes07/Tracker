import type { KeyboardEvent, ReactNode } from "react";

import { ChevronLeft, ChevronRight, MapPin, UserCheck, UserRound } from "lucide-react";

import { IssueReopenedBadge, IssueStatusBadge } from "@/components/issues/issue-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  onPageIndexChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100];

function getModuleLabel(issue: IssueListItem) {
  return issue.moduleName ?? "General";
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

function IssueMetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="truncate text-sm font-medium text-foreground" title={value}>
        {value}
      </div>
    </div>
  );
}

export function IssueCardView({
  issues,
  totalIssueCount,
  pageIndex,
  pageSize,
  pageCount,
  canEdit,
  onIssueClick,
  onPageIndexChange,
  onPageSizeChange,
}: IssueCardViewProps) {
  const canGoPrevious = pageIndex > 0;
  const canGoNext = pageIndex + 1 < pageCount;
  const resolvedPageCount = Math.max(1, pageCount);

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-background/60 px-5 py-12 text-center">
        <h3 className="text-base font-semibold text-foreground">No issues found</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Adjust the filters or switch the issue status view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {issues.map((issue) => {
          const isInteractive = canEdit && Boolean(onIssueClick);
          const assignedTo = issue.assignedToName ?? "Unassigned";
          const testedBy = issue.testedByName ?? "Not tested";

          return (
            <Card
              key={issue.id}
              role={isInteractive ? "button" : undefined}
              tabIndex={isInteractive ? 0 : undefined}
              aria-label={isInteractive ? `Edit issue #${issue.no} ${issue.title}` : undefined}
              onClick={isInteractive ? () => onIssueClick?.(issue) : undefined}
              onKeyDown={(event) => handleCardKeyDown(event, issue, onIssueClick)}
              className={cn(
                "min-h-[238px] rounded-lg border-border/70 bg-background/85 py-0 shadow-sm",
                isInteractive &&
                  "cursor-pointer transition-colors hover:border-foreground/20 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              <CardHeader className="gap-3 border-b border-border/60 px-4 py-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <Badge variant="secondary" className="font-mono">
                    #{issue.no}
                  </Badge>
                  <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
                    <IssueStatusBadge status={issue.status} />
                    {issue.reopenedAt ? <IssueReopenedBadge /> : null}
                    {issue.development ? (
                      <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                        Development
                      </Badge>
                    ) : null}
                    {issue.deployment ? (
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        Deployment
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="min-w-0 space-y-2">
                  <CardTitle
                    className="line-clamp-2 text-base leading-snug [overflow-wrap:anywhere]"
                    title={issue.title}
                  >
                    {issue.title}
                  </CardTitle>
                  <p
                    className="line-clamp-3 text-sm leading-5 text-muted-foreground [overflow-wrap:anywhere]"
                    title={issue.description ?? "No description added."}
                  >
                    {issue.description ?? "No description added."}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4 px-4 py-4">
                <div className="flex min-w-0 flex-wrap gap-2">
                  <Badge variant="outline" className="max-w-full">
                    <span className="truncate">{getModuleLabel(issue)}</span>
                  </Badge>
                </div>

                <IssueMetaItem
                  icon={<MapPin className="h-3.5 w-3.5 text-cyan-500" />}
                  label="Navigation"
                  value={issue.navigation ?? "Not set"}
                />

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <IssueMetaItem
                    icon={<UserRound className="h-3.5 w-3.5 text-muted-foreground" />}
                    label="Assigned to"
                    value={assignedTo}
                  />
                  <IssueMetaItem
                    icon={<UserCheck className="h-3.5 w-3.5 text-muted-foreground" />}
                    label="Tested by"
                    value={testedBy}
                  />
                </div>
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
            <SelectTrigger size="sm" className="w-[112px]">
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
