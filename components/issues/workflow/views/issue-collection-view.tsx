import { useMemo, type ReactNode } from "react";

import type { OnChangeFn, RowSelectionState, SortingState } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { IssueCardView, IssueEmptyState } from "@/components/issues/cards/issue-card-view";
import { getIssueTableColumns } from "@/components/issues/table/issue-table-columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { ViewMode } from "@/hooks/use-persisted-view-mode";
import type { IssueListItem } from "@/routes/issues/types";

import { ViewModeToggle } from "../ui";

export function IssueCollectionView({
  title,
  description,
  issues,
  totalIssueCount,
  viewMode,
  setViewMode,
  canEdit,
  isLoading,
  sorting,
  onSortingChange,
  pageIndex,
  pageSize,
  pageCount,
  onPageIndexChange,
  onPageSizeChange,
  onOpenIssue,
  onEditIssue,
  onDeleteIssue,
  onExport,
  isExporting,
  selectedIssueIds = [],
  onSelectedIssueIdsChange,
  bulkActionBar,
  toolbarActions,
}: {
  title: string;
  description: string;
  issues: IssueListItem[];
  totalIssueCount: number;
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
  canEdit: boolean;
  isLoading: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPageIndexChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpenIssue: (issue: IssueListItem) => void;
  onEditIssue: (issue: IssueListItem) => void;
  onDeleteIssue: (issue: IssueListItem) => void;
  onExport: () => void;
  isExporting: boolean;
  selectedIssueIds?: string[];
  onSelectedIssueIdsChange?: (issueIds: string[]) => void;
  bulkActionBar?: ReactNode;
  toolbarActions?: ReactNode;
}) {
  const canSelectIssues = canEdit && Boolean(onSelectedIssueIdsChange);
  const columns = useMemo(
    () =>
      getIssueTableColumns({
        canEdit,
        onEdit: onEditIssue,
        onDelete: onDeleteIssue,
        actionPending: false,
        issueTextMode: "full",
      }),
    [canEdit, onDeleteIssue, onEditIssue]
  );
  const rowSelection = useMemo<RowSelectionState>(
    () =>
      selectedIssueIds.reduce<RowSelectionState>((selection, issueId) => {
        selection[issueId] = true;
        return selection;
      }, {}),
    [selectedIssueIds]
  );

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    if (!onSelectedIssueIdsChange) return;

    const nextSelection = typeof updater === "function" ? updater(rowSelection) : updater;

    onSelectedIssueIdsChange(
      Object.entries(nextSelection)
        .filter(([, selected]) => selected)
        .map(([issueId]) => issueId)
    );
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          {toolbarActions}
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {bulkActionBar ? <div className="mb-4">{bulkActionBar}</div> : null}

      {viewMode === "grid" ? (
        isLoading ? (
          <IssueCardViewSkeleton />
        ) : (
          <IssueCardView
            issues={issues}
            totalIssueCount={totalIssueCount}
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={pageCount}
            canEdit={canEdit}
            onIssueClick={onOpenIssue}
            selectedIssueIds={selectedIssueIds}
            onSelectedIssueIdsChange={canSelectIssues ? onSelectedIssueIdsChange : undefined}
            onPageIndexChange={onPageIndexChange}
            onPageSizeChange={onPageSizeChange}
          />
        )
      ) : (
        <DataTable
          columns={columns}
          data={issues}
          visualMode="excel"
          enableRowSelection={canSelectIssues}
          getRowId={(issue) => issue.id}
          rowSelection={rowSelection}
          onRowSelectionChange={handleRowSelectionChange}
          onRowClick={onOpenIssue}
          sorting={sorting}
          onSortingChange={onSortingChange}
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          onPageIndexChange={onPageIndexChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={isLoading}
          maxTableHeight="min(70vh, 760px)"
          emptyMessage={<IssueEmptyState className="border-0 bg-transparent py-10 shadow-none" />}
          enableFullscreen
          toolbarExtras={
            <div className="flex flex-1 justify-end">
              <Badge variant="outline">{totalIssueCount} issues</Badge>
            </div>
          }
        />
      )}
    </section>
  );
}

function IssueCardViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="min-h-50 animate-pulse rounded-lg border border-border/60 bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="h-5 w-16 rounded-full bg-muted" />
              <div className="flex gap-1">
                <div className="h-5 w-14 rounded-full bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-4 w-11/12 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
            <div className="mt-5 flex gap-2">
              <div className="h-5 w-24 rounded-full bg-muted" />
              <div className="h-5 w-20 rounded-full bg-muted" />
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border/60 pt-3">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}
