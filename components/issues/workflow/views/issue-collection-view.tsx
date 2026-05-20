import { useMemo, type ReactNode } from "react";

import type { OnChangeFn, RowSelectionState, SortingState } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { IssueCardView } from "@/components/issues/cards/issue-card-view";
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
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
        isLoading && issues.length === 0 ? (
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
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
          isLoading={isLoading && issues.length === 0}
          maxTableHeight="min(70vh, 760px)"
          emptyMessage="No issues match the current filters."
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
