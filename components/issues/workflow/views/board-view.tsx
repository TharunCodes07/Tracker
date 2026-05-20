import { useMemo, useState, type ReactNode } from "react";

import Link from "next/link";
import { ArrowRight, Boxes, Flag, ListTodo, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  KanbanBoard,
  KanbanBoardSkeleton,
  type KanbanColumn,
} from "@/components/ui/kanban-board";
import {
  ACTIVE_ISSUE_STATUS_OPTIONS,
  EPIC_STATUS_OPTIONS,
  RELEASE_STATUS_OPTIONS,
  type EpicStatus,
  type IssueListItem,
  type IssueStatus,
  type ProjectEpicListItem,
  type ProjectIssuesListResponse,
  type ProjectReleaseListItem,
  type ProjectReleaseStatus,
} from "@/routes/issues/types";

import { getIssueCompletion, ProgressBar } from "../ui";
import { WorkflowIssueCard } from "../workflow-issue-card";

type BoardTab = "issues" | "epics" | "versions";

export function BoardView({
  issueByStatus,
  epics,
  epicCounts,
  releases,
  releaseCounts,
  basePath,
  canEdit,
  onOpenIssue,
  onStatusDrop,
  onEpicStatusDrop,
  onReleaseStatusDrop,
  isUpdating,
  isLoading,
  selectedIssueIds,
  onIssueSelectionChange,
  onCreateIssue,
  bulkActionBar,
}: {
  issues: IssueListItem[];
  issueByStatus: Map<IssueStatus, IssueListItem[]>;
  epics: ProjectEpicListItem[];
  epicCounts: ProjectIssuesListResponse["epicCounts"];
  releases: ProjectReleaseListItem[];
  releaseCounts: ProjectIssuesListResponse["releaseCounts"];
  basePath: string;
  canEdit: boolean;
  onOpenIssue: (issue: IssueListItem) => void;
  onStatusDrop: (status: IssueStatus, issueId: string) => void;
  onEpicStatusDrop: (status: EpicStatus, epicId: string) => void;
  onReleaseStatusDrop: (status: ProjectReleaseStatus, releaseId: string) => void;
  isUpdating: boolean;
  isLoading: boolean;
  selectedIssueIds: string[];
  onIssueSelectionChange: (issueId: string, selected: boolean) => void;
  onCreateIssue: () => void;
  bulkActionBar?: ReactNode;
}) {
  const [boardTab, setBoardTab] = useState<BoardTab>("issues");

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Move work across status columns. The same board shell is used for issues, epics, and
            releases.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="inline-flex rounded-lg border border-border/70 bg-background p-1 shadow-sm">
            <BoardTabButton active={boardTab === "issues"} onClick={() => setBoardTab("issues")}>
              <ListTodo className="h-3.5 w-3.5" />
              Issues
            </BoardTabButton>
            <BoardTabButton active={boardTab === "epics"} onClick={() => setBoardTab("epics")}>
              <Boxes className="h-3.5 w-3.5" />
              Epics
            </BoardTabButton>
            <BoardTabButton active={boardTab === "versions"} onClick={() => setBoardTab("versions")}>
              <Flag className="h-3.5 w-3.5" />
              Releases
            </BoardTabButton>
          </div>
          {canEdit ? (
            <Button type="button" size="sm" onClick={onCreateIssue} className="w-full sm:w-fit">
              <Plus className="h-3.5 w-3.5" />
              Issue
            </Button>
          ) : null}
        </div>
      </div>

      {bulkActionBar}

      {isLoading ? (
        <KanbanBoardSkeleton columns={boardTab === "versions" ? 4 : 4} />
      ) : boardTab === "issues" ? (
        <KanbanBoard
          columns={ISSUE_BOARD_COLUMNS}
          itemsByColumn={issueByStatus}
          getItemKey={(issue) => issue.id}
          onItemDrop={canEdit ? onStatusDrop : undefined}
          emptyColumnText="No issues here"
          renderItem={(issue) => (
            <WorkflowIssueCard
              issue={issue}
              onOpen={onOpenIssue}
              selected={selectedIssueIds.includes(issue.id)}
              onSelectedChange={canEdit ? onIssueSelectionChange : undefined}
              draggable={canEdit}
            />
          )}
        />
      ) : null}

      {!isLoading && boardTab === "epics" ? (
        <PlanningKanban
          columns={EPIC_STATUS_OPTIONS}
          items={epics}
          counts={epicCounts}
          hrefForItem={(epic) => `${basePath}/epics/${epic.id}`}
          emptyText="No epics match this project yet."
          canEdit={canEdit}
          isUpdating={isUpdating}
          onStatusDrop={onEpicStatusDrop}
        />
      ) : null}

      {!isLoading && boardTab === "versions" ? (
        <PlanningKanban
          columns={RELEASE_STATUS_OPTIONS}
          items={releases}
          counts={releaseCounts}
          hrefForItem={(release) => `${basePath}/releases/${release.id}`}
          emptyText="No versions have been created yet."
          canEdit={canEdit}
          isUpdating={isUpdating}
          onStatusDrop={onReleaseStatusDrop}
        />
      ) : null}
    </section>
  );
}

function BoardTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant={active ? "secondary" : "ghost"} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}

const ISSUE_BOARD_COLUMNS: readonly KanbanColumn<IssueStatus>[] = ACTIVE_ISSUE_STATUS_OPTIONS.map(
  (status) => ({
    value: status.value,
    label: status.label,
  })
);

function PlanningKanban<
  TStatus extends string,
  T extends { id: string; name: string; status: TStatus; description?: string | null },
>({
  columns,
  items,
  counts,
  hrefForItem,
  emptyText,
  canEdit,
  isUpdating,
  onStatusDrop,
}: {
  columns: readonly { value: TStatus; label: string }[];
  items: T[];
  counts: ProjectIssuesListResponse["epicCounts"];
  hrefForItem: (item: T) => string;
  emptyText: string;
  canEdit: boolean;
  isUpdating: boolean;
  onStatusDrop: (status: TStatus, itemId: string) => void;
}) {
  const itemsByStatus = useMemo(() => {
    const groupedItems = new Map<TStatus, T[]>();

    for (const column of columns) groupedItems.set(column.value, []);
    for (const item of items) {
      const targetGroup =
        groupedItems.get(item.status) ?? (columns[0] ? groupedItems.get(columns[0].value) : undefined);
      targetGroup?.push(item);
    }

    return groupedItems;
  }, [columns, items]);
  const kanbanColumns = useMemo(
    () => columns.map((column) => ({ value: column.value, label: column.label })),
    [columns]
  );

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <KanbanBoard
      columns={kanbanColumns}
      itemsByColumn={itemsByStatus}
      getItemKey={(item) => item.id}
      onItemDrop={canEdit ? onStatusDrop : undefined}
      emptyColumnText="Nothing in this column"
      renderItem={(item) => {
        const count = counts.find((countItem) => countItem.id === item.id);
        const total = count?.issueCount ?? 0;
        const done = count?.doneCount ?? 0;
        const progress = getIssueCompletion(total, done);

        return (
          <Link
            href={hrefForItem(item)}
            draggable={canEdit}
            onDragStart={(event) => {
              if (!canEdit) {
                event.preventDefault();
                return;
              }

              event.dataTransfer.setData("text/plain", item.id);
            }}
            className="relative block min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card p-3 shadow-sm transition-colors hover:bg-muted/40"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/70 to-cyan-400/70" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="line-clamp-2 break-words text-sm font-medium">{item.name}</div>
                <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
                  {item.description ?? "No description."}
                </p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <div className="mt-3">
              <div className="mb-1.5 flex justify-between gap-3 text-xs text-muted-foreground">
                <span>{done}/{total} done</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
            {isUpdating ? (
              <div className="mt-2 text-xs text-muted-foreground">Saving change...</div>
            ) : null}
          </Link>
        );
      }}
    />
  );
}
