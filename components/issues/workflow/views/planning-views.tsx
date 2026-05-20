import { useMemo, useState, type ReactNode } from "react";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, ListPlus, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ViewMode } from "@/hooks/use-persisted-view-mode";
import {
  EPIC_STATUS_OPTIONS,
  RELEASE_STATUS_OPTIONS,
  SPRINT_STATUS_OPTIONS,
  type IssueListItem,
  type ProjectEpicListItem,
  type ProjectIssuesListResponse,
  type ProjectReleaseListItem,
  type ProjectSprintListItem,
} from "@/routes/issues/types";

import { EmptyState, getIssueCompletion, ProgressBar } from "../ui";
import { IssueCollectionView } from "./issue-collection-view";

interface PlanningIssueViewProps {
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
  isLoading: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPageIndexChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
  onEditIssue: (issue: IssueListItem) => void;
  onDeleteIssue: (issue: IssueListItem) => void;
  onExport: () => void;
  isExporting: boolean;
  totalIssueCount: number;
  selectedIssueIds: string[];
  onSelectedIssueIdsChange: (issueIds: string[]) => void;
  bulkActionBar?: ReactNode;
}

type PlanningDirectoryItem<TStatus extends string> = {
  id: string;
  name: string;
  description?: string | null;
  goal?: string | null;
  status: TStatus;
  startDate?: string | null;
  targetDate?: string | null;
  endDate?: string | null;
  releasedAt?: string | null;
};

export function ReleasesView({
  releases,
  counts,
  canEdit,
  onCreateRelease,
  basePath,
}: {
  releases: ProjectReleaseListItem[];
  counts: ProjectIssuesListResponse["releaseCounts"];
  issues: IssueListItem[];
  canEdit: boolean;
  onOpenIssue: (issue: IssueListItem) => void;
  onCreateRelease: () => void;
  basePath: string;
} & PlanningIssueViewProps) {
  return (
    <PlanningDirectoryView
      title="Releases"
      description="Shipping packages grouped by release status."
      emptyTitle="No releases yet"
      emptyDescription="Create releases to group the issues planned for each shipping package."
      items={releases}
      counts={counts}
      canEdit={canEdit}
      createLabel="Release"
      onCreate={onCreateRelease}
      getItemHref={(release) => `${basePath}/releases/${release.id}`}
      statusOptions={RELEASE_STATUS_OPTIONS}
    />
  );
}

export function EpicsView({
  epics,
  counts,
  canEdit,
  onCreateEpic,
  basePath,
}: {
  epics: ProjectEpicListItem[];
  counts: ProjectIssuesListResponse["epicCounts"];
  issues: IssueListItem[];
  canEdit: boolean;
  onOpenIssue: (issue: IssueListItem) => void;
  onCreateEpic: () => void;
  basePath: string;
} & PlanningIssueViewProps) {
  return (
    <PlanningDirectoryView
      title="Epics"
      description="Goal wrappers for related work across modules, releases, and sprints."
      emptyTitle="No epics yet"
      emptyDescription="Create epics as goal wrappers, then assign issues into them."
      items={epics}
      counts={counts}
      canEdit={canEdit}
      createLabel="Epic"
      onCreate={onCreateEpic}
      getItemHref={(epic) => `${basePath}/epics/${epic.id}`}
      statusOptions={EPIC_STATUS_OPTIONS}
    />
  );
}

export function SprintsView({
  sprints,
  counts,
  canEdit,
  onCreateSprint,
  basePath,
}: {
  sprints: ProjectSprintListItem[];
  counts: ProjectIssuesListResponse["sprintCounts"];
  issues: IssueListItem[];
  canEdit: boolean;
  onOpenIssue: (issue: IssueListItem) => void;
  onCreateSprint: () => void;
  basePath: string;
} & PlanningIssueViewProps) {
  return (
    <PlanningDirectoryView
      title="Sprints"
      description="Time-boxed planning windows with their own assigned issue lists."
      emptyTitle="No sprints yet"
      emptyDescription="Create time-boxed sprints and move issues from the backlog into them."
      items={sprints}
      counts={counts}
      canEdit={canEdit}
      createLabel="Sprint"
      onCreate={onCreateSprint}
      getItemHref={(sprint) => `${basePath}/sprints/${sprint.id}`}
      statusOptions={SPRINT_STATUS_OPTIONS}
    />
  );
}

function PlanningDirectoryView<TStatus extends string>({
  title,
  description,
  emptyTitle,
  emptyDescription,
  items,
  counts,
  canEdit,
  createLabel,
  onCreate,
  getItemHref,
  statusOptions,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  items: PlanningDirectoryItem<TStatus>[];
  counts: ProjectIssuesListResponse["releaseCounts"];
  canEdit: boolean;
  createLabel: string;
  onCreate: () => void;
  getItemHref: (item: PlanningDirectoryItem<TStatus>) => string;
  statusOptions: readonly { value: TStatus; label: string }[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TStatus | "all">("all");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const searchableText = [
          item.name,
          item.description,
          item.goal,
          statusOptions.find((option) => option.value === item.status)?.label,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesStatus && (!normalizedSearch || searchableText.includes(normalizedSearch));
      }),
    [items, normalizedSearch, statusFilter, statusOptions]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {canEdit ? (
          <Button type="button" onClick={onCreate} className="w-full sm:w-fit">
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 rounded-full border-border/60 bg-background/80 pl-9 shadow-sm"
            placeholder={`Search ${title.toLowerCase()}`}
          />
        </div>
        <div className="tracker-thin-scrollbar flex gap-1 overflow-x-auto">
          <StatusFilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            All
          </StatusFilterButton>
          {statusOptions.map((option) => (
            <StatusFilterButton
              key={option.value}
              active={statusFilter === option.value}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </StatusFilterButton>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={`No matching ${title.toLowerCase()}`}
          description="Adjust the local search or status filter."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {filteredItems.map((item) => {
            const count = counts.find((countItem) => countItem.id === item.id);
            const issueCount = count?.issueCount ?? 0;
            const doneCount = count?.doneCount ?? 0;
            const progress = getIssueCompletion(issueCount, doneCount);
            const statusLabel =
              statusOptions.find((option) => option.value === item.status)?.label ?? item.status;

            return (
              <Link
                key={item.id}
                href={getItemHref(item)}
                className="group relative flex min-h-48 min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/70 to-cyan-400/70" />
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="secondary" className="mb-3 capitalize">
                      {statusLabel}
                    </Badge>
                    <h2 className="line-clamp-2 break-words text-base font-semibold">
                      {item.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">
                      {item.description ?? item.goal ?? "No description."}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>

                <div className="mt-auto pt-5">
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>{doneCount}/{issueCount} done</span>
                    <span>{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{issueCount} {issueCount === 1 ? "issue" : "issues"}</span>
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{formatPlanningDates(item)}</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusFilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      className="shrink-0 rounded-full"
    >
      {children}
    </Button>
  );
}

export function PlanningDetailView({
  collectionLabel,
  entityName,
  listHref,
  issues,
  canEdit,
  onOpenIssue,
  onAssignIssues,
  ...issueViewProps
}: {
  collectionLabel: "Releases" | "Sprints" | "Epics";
  entityName: string;
  listHref: string;
  issues: IssueListItem[];
  canEdit: boolean;
  onOpenIssue: (issue: IssueListItem) => void;
  onAssignIssues: () => void;
} & PlanningIssueViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href={listHref}>
              <ArrowLeft className="h-4 w-4" />
              {collectionLabel}
            </Link>
          </Button>
          <h1 className="line-clamp-2 break-words text-2xl font-semibold tracking-tight">
            {entityName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Issues assigned to this {collectionLabel.slice(0, -1).toLowerCase()}.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" onClick={onAssignIssues} className="w-full sm:w-fit">
            <ListPlus className="h-4 w-4" />
            Assign issues
          </Button>
        ) : null}
      </div>

      <IssueCollectionView
        title="Assigned issues"
        description="Only issues currently assigned here are shown in this list."
        issues={issues}
        canEdit={canEdit}
        onOpenIssue={onOpenIssue}
        {...issueViewProps}
      />
    </div>
  );
}

function formatPlanningDates(item: PlanningDirectoryItem<string>) {
  const startDate = item.startDate ? formatDate(item.startDate) : null;
  const endDate = item.releasedAt
    ? formatDate(item.releasedAt)
    : item.targetDate
      ? formatDate(item.targetDate)
      : item.endDate
        ? formatDate(item.endDate)
        : null;

  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  }

  return startDate ?? endDate ?? "No dates";
}

function formatDate(value: string) {
  return format(new Date(value), "MMM d");
}
