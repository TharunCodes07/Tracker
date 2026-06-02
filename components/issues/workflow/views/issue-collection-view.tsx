import { useMemo, useRef, type ChangeEvent, type ReactNode } from "react";

import type {
  OnChangeFn,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import { ChevronDown, Download, FileDown, Loader2, Upload } from "lucide-react";

import {
  IssueCardView,
  IssueEmptyState,
} from "@/components/issues/cards/issue-card-view";
import type {
  IssueClaimMember,
  IssueClaimRole,
} from "@/components/issues/shared/issue-claim";
import { getIssueTableColumns } from "@/components/issues/table/issue-table-columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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
  onDownloadTemplate,
  onImportExcel,
  isExporting,
  isImportingExcel,
  selectedIssueIds = [],
  onSelectedIssueIdsChange,
  bulkActionBar,
  toolbarActions,
  currentMember,
  onClaimIssue,
  claimActionPending = false,
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
  onDownloadTemplate: () => void;
  onImportExcel: (file: File) => void;
  isExporting: boolean;
  isImportingExcel: boolean;
  selectedIssueIds?: string[];
  onSelectedIssueIdsChange?: (issueIds: string[]) => void;
  bulkActionBar?: ReactNode;
  toolbarActions?: ReactNode;
  currentMember?: IssueClaimMember | null;
  onClaimIssue?: (issue: IssueListItem, role: IssueClaimRole) => void;
  claimActionPending?: boolean;
}) {
  const excelImportInputRef = useRef<HTMLInputElement>(null);
  const canSelectIssues = canEdit && Boolean(onSelectedIssueIdsChange);
  const isExcelBusy = isExporting || isImportingExcel;
  const excelBusyLabel = isImportingExcel
    ? "Uploading..."
    : isExporting
      ? "Downloading..."
      : "Excel";
  const excelStatusTitle = isImportingExcel
    ? "Uploading workbook"
    : "Preparing Excel file";
  const excelStatusDescription = isImportingExcel
    ? "Importing rows and updating issue lists."
    : "Building the workbook for download.";
  const columns = useMemo(
    () =>
      getIssueTableColumns({
        canEdit,
        onEdit: onEditIssue,
        onDelete: onDeleteIssue,
        actionPending: false,
        issueTextMode: "full",
        currentMember,
        onClaim: onClaimIssue,
        claimActionPending,
      }),
    [
      canEdit,
      claimActionPending,
      currentMember,
      onClaimIssue,
      onDeleteIssue,
      onEditIssue,
    ],
  );
  const rowSelection = useMemo<RowSelectionState>(
    () =>
      selectedIssueIds.reduce<RowSelectionState>((selection, issueId) => {
        selection[issueId] = true;
        return selection;
      }, {}),
    [selectedIssueIds],
  );

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    if (!onSelectedIssueIdsChange) return;

    const nextSelection =
      typeof updater === "function" ? updater(rowSelection) : updater;

    onSelectedIssueIdsChange(
      Object.entries(nextSelection)
        .filter(([, selected]) => selected)
        .map(([issueId]) => issueId),
    );
  };

  function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (file) {
      onImportExcel(file);
    }

    event.currentTarget.value = "";
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={excelImportInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleImportFileChange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExcelBusy}
              >
                {isExcelBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {excelBusyLabel}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onExport} disabled={isExcelBusy}>
                <Download className="h-4 w-4" />
                Export issues
              </DropdownMenuItem>
              {canEdit ? (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    excelImportInputRef.current?.click();
                  }}
                  disabled={isExcelBusy}
                >
                  <Upload className="h-4 w-4" />
                  Upload workbook
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onDownloadTemplate}
                disabled={isExcelBusy}
              >
                <FileDown className="h-4 w-4" />
                Download template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {toolbarActions}
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {isExcelBusy ? (
        <ExcelOperationSkeleton
          title={excelStatusTitle}
          description={excelStatusDescription}
        />
      ) : null}

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
            onSelectedIssueIdsChange={
              canSelectIssues ? onSelectedIssueIdsChange : undefined
            }
            onPageIndexChange={onPageIndexChange}
            onPageSizeChange={onPageSizeChange}
            currentMember={currentMember}
            onClaimIssue={onClaimIssue}
            claimActionPending={claimActionPending}
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
          emptyMessage={
            <IssueEmptyState className="border-0 bg-transparent py-10 shadow-none" />
          }
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

function ExcelOperationSkeleton({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="truncate text-sm font-medium">{title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {description}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-1.5 w-24 rounded-full" />
          <Skeleton className="h-1.5 flex-1 rounded-full" />
          <Skeleton className="h-1.5 w-12 rounded-full" />
        </div>
      </div>
    </div>
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
