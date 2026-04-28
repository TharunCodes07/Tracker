"use client";

import * as React from "react";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { FileSpreadsheet, Maximize2, Minimize2, RefreshCw, X } from "lucide-react";

import { getIssueTableColumns } from "@/components/issues/issue-table-columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  GENERAL_MODULE_FILTER_VALUE,
  type IssueListItem,
  type ProjectModuleListItem,
} from "@/routes/issues/types";

type IssueSheetKind = "all" | "general" | "main" | "main-direct" | "sub";

interface IssueSheet {
  id: string;
  label: string;
  kind: IssueSheetKind;
  moduleId?: string;
  count: number;
}

interface IssueWorkbook {
  title: string;
  description: string;
  defaultSheetId: string;
  sheets: IssueSheet[];
}

interface IssueExcelTableProps {
  issues: IssueListItem[];
  fullscreenIssues: IssueListItem[];
  fullscreenIssuesError?: string | null;
  isFullscreenIssuesLoading?: boolean;
  modules: ProjectModuleListItem[];
  selectedModuleFilters: string[];
  totalIssueCount: number;
  visibleIssueCount: number;
  canEdit: boolean;
  actionPending?: boolean;
  sorting: SortingState;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onSortingChange: OnChangeFn<SortingState>;
  onPageIndexChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick?: (issue: IssueListItem) => void;
  onEdit: (issue: IssueListItem) => void;
  onDelete: (issue: IssueListItem) => void;
  onLoadFullscreenIssues: (sortingOverride?: SortingState) => void;
  fullscreenReloadKey: string;
  fullscreenFilters?: React.ReactNode;
}

function filterIssuesBySheet(issues: IssueListItem[], sheet: Omit<IssueSheet, "count">) {
  switch (sheet.kind) {
    case "general":
      return issues.filter((issue) => !issue.moduleId);
    case "main":
      return issues.filter((issue) => issue.mainModuleId === sheet.moduleId);
    case "main-direct":
      return issues.filter((issue) => issue.moduleId === sheet.moduleId && !issue.subModuleId);
    case "sub":
      return issues.filter((issue) => issue.subModuleId === sheet.moduleId || issue.moduleId === sheet.moduleId);
    case "all":
    default:
      return issues;
  }
}

function withSheetCounts(issues: IssueListItem[], sheets: Omit<IssueSheet, "count">[]) {
  return sheets.map((sheet) => ({
    ...sheet,
    count: filterIssuesBySheet(issues, sheet).length,
  }));
}

function getSelectedMainModule(
  modules: ProjectModuleListItem[],
  selectedModuleFilters: string[]
) {
  const moduleById = new Map(modules.map((moduleItem) => [moduleItem.id, moduleItem]));
  const selectedModuleIds = selectedModuleFilters.filter(
    (value) => value !== GENERAL_MODULE_FILTER_VALUE
  );

  if (selectedModuleIds.length === 0) {
    return null;
  }

  const selectedMainModuleIds = new Set<string>();

  for (const moduleId of selectedModuleIds) {
    const moduleItem = moduleById.get(moduleId);

    if (!moduleItem) {
      continue;
    }

    selectedMainModuleIds.add(moduleItem.parentModuleId ?? moduleItem.id);
  }

  if (selectedMainModuleIds.size !== 1) {
    return null;
  }

  return moduleById.get(Array.from(selectedMainModuleIds)[0]) ?? null;
}

function buildWorkbook(
  issues: IssueListItem[],
  modules: ProjectModuleListItem[],
  selectedModuleFilters: string[]
): IssueWorkbook {
  const selectedMainModule = getSelectedMainModule(modules, selectedModuleFilters);
  const selectedOnlyGeneral =
    selectedModuleFilters.length === 1 &&
    selectedModuleFilters.includes(GENERAL_MODULE_FILTER_VALUE);
  const mainModules = modules.filter((moduleItem) => !moduleItem.parentModuleId);
  const subModulesByParentId = new Map<string, ProjectModuleListItem[]>();

  for (const moduleItem of modules) {
    if (!moduleItem.parentModuleId) {
      continue;
    }

    const siblings = subModulesByParentId.get(moduleItem.parentModuleId) ?? [];
    siblings.push(moduleItem);
    subModulesByParentId.set(moduleItem.parentModuleId, siblings);
  }

  if (selectedMainModule) {
    const selectedModuleId = selectedModuleFilters.find(
      (value) => value !== GENERAL_MODULE_FILTER_VALUE
    );
    const selectedModule = modules.find((moduleItem) => moduleItem.id === selectedModuleId);
    const defaultSheetId = selectedModule?.parentModuleId
      ? `sub:${selectedModule.id}`
      : `main:${selectedMainModule.id}`;
    const subModules = subModulesByParentId.get(selectedMainModule.id) ?? [];
    const sheets = withSheetCounts(issues, [
      {
        id: `main:${selectedMainModule.id}`,
        label: selectedMainModule.name,
        kind: "main",
        moduleId: selectedMainModule.id,
      },
      {
        id: `main-direct:${selectedMainModule.id}`,
        label: "Main Module",
        kind: "main-direct",
        moduleId: selectedMainModule.id,
      },
      ...subModules.map((moduleItem) => ({
        id: `sub:${moduleItem.id}`,
        label: moduleItem.name,
        kind: "sub" as const,
        moduleId: moduleItem.id,
      })),
    ]);

    return {
      title: `${selectedMainModule.name} workbook`,
      description: "Main-module issues and every sub module are available as sheets.",
      defaultSheetId,
      sheets,
    };
  }

  if (selectedOnlyGeneral) {
    return {
      title: "General issues workbook",
      description: "Issues without a module are shown as a single workbook sheet.",
      defaultSheetId: "__general__",
      sheets: withSheetCounts(issues, [
        {
          id: "__general__",
          label: "General",
          kind: "general",
        },
      ]),
    };
  }

  const sheets = withSheetCounts(issues, [
    {
      id: "__all__",
      label: "All Issues",
      kind: "all",
    },
    {
      id: "__general__",
      label: "General",
      kind: "general",
    },
    ...mainModules.flatMap((mainModule) => [
      {
        id: `main:${mainModule.id}`,
        label: mainModule.name,
        kind: "main" as const,
        moduleId: mainModule.id,
      },
      ...(subModulesByParentId.get(mainModule.id) ?? []).map((subModule) => ({
        id: `sub:${subModule.id}`,
        label: subModule.name,
        kind: "sub" as const,
        moduleId: subModule.id,
      })),
    ]),
  ]);

  return {
    title: "Project workbook",
    description: "The fullscreen workbook groups general issues, main modules, and sub modules into sheets.",
    defaultSheetId: "__all__",
    sheets,
  };
}

export function IssueExcelTable({
  issues,
  fullscreenIssues,
  fullscreenIssuesError,
  isFullscreenIssuesLoading = false,
  modules,
  selectedModuleFilters,
  totalIssueCount,
  visibleIssueCount,
  canEdit,
  actionPending = false,
  sorting,
  pageIndex,
  pageSize,
  pageCount,
  onSortingChange,
  onPageIndexChange,
  onPageSizeChange,
  onRowClick,
  onEdit,
  onDelete,
  onLoadFullscreenIssues,
  fullscreenReloadKey,
  fullscreenFilters,
}: IssueExcelTableProps) {
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);
  const [hasRequestedFullscreenIssues, setHasRequestedFullscreenIssues] = React.useState(false);
  const lastFullscreenReloadKeyRef = React.useRef<string | null>(null);
  const loadFullscreenIssuesRef = React.useRef(onLoadFullscreenIssues);

  React.useEffect(() => {
    loadFullscreenIssuesRef.current = onLoadFullscreenIssues;
  }, [onLoadFullscreenIssues]);
  const compactColumns = React.useMemo(
    () =>
      getIssueTableColumns({
        canEdit,
        onEdit,
        onDelete,
        actionPending,
        issueTextMode: "full",
      }),
    [actionPending, canEdit, onDelete, onEdit]
  );
  const fullscreenColumns = React.useMemo(
    () =>
      getIssueTableColumns({
        canEdit,
        onEdit,
        onDelete,
        actionPending,
        issueTextMode: "full",
      }),
    [actionPending, canEdit, onDelete, onEdit]
  );
  const workbookRows = hasRequestedFullscreenIssues ? fullscreenIssues : issues;
  const workbook = React.useMemo(
    () => buildWorkbook(workbookRows, modules, selectedModuleFilters),
    [workbookRows, modules, selectedModuleFilters]
  );
  const [selectedSheetId, setSelectedSheetId] = React.useState<string | null>(null);
  const activeSheet =
    workbook.sheets.find((sheet) => sheet.id === selectedSheetId) ??
    workbook.sheets.find((sheet) => sheet.id === workbook.defaultSheetId) ??
    workbook.sheets[0];
  const activeSheetRows = activeSheet ? filterIssuesBySheet(workbookRows, activeSheet) : workbookRows;

  function handleFullscreenOpenChange(open: boolean) {
    setIsFullscreenOpen(open);

    if (open) {
      lastFullscreenReloadKeyRef.current = fullscreenReloadKey;
      setHasRequestedFullscreenIssues(true);
      onLoadFullscreenIssues();
    }
  }

  React.useEffect(() => {
    if (!isFullscreenOpen || !hasRequestedFullscreenIssues) {
      return;
    }

    if (lastFullscreenReloadKeyRef.current === fullscreenReloadKey) {
      return;
    }

    lastFullscreenReloadKeyRef.current = fullscreenReloadKey;
    loadFullscreenIssuesRef.current();
  }, [fullscreenReloadKey, hasRequestedFullscreenIssues, isFullscreenOpen]);

  const handleFullscreenSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextSorting = typeof updater === "function" ? updater(sorting) : updater;

    onSortingChange(nextSorting);
    onLoadFullscreenIssues(nextSorting);
  };

  return (
    <>
      <DataTable
        columns={compactColumns}
        data={issues}
        visualMode="excel"
        showRowNumbers
        fullTextColumnIds={["no"]}
        columnTextModes={{
          moduleName: "wrap",
          assignedToName: "wrap",
          reviewedByName: "wrap",
          testedByName: "wrap",
        }}
        onRowClick={onRowClick}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPageIndexChange={onPageIndexChange}
        onPageSizeChange={onPageSizeChange}
        maxTableHeight="min(68vh, 720px)"
        toolbarExtras={
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel table
            </Badge>
            <Badge variant="outline">
              {visibleIssueCount} of {totalIssueCount}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => handleFullscreenOpenChange(true)}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Full screen
            </Button>
          </div>
        }
      />

      <Dialog open={isFullscreenOpen} onOpenChange={handleFullscreenOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-2 left-2 top-2 h-[calc(100svh-1rem)] max-h-none w-[calc(100vw-1rem)] max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-none"
        >
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-3 z-50 rounded-full bg-background/90 shadow-sm"
              aria-label="Close fullscreen workbook"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>

          <div className="flex flex-col gap-3 border-b border-border/70 bg-background px-4 py-3 pr-14 lg:flex-row lg:items-center lg:justify-between">
            <DialogHeader className="min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="truncate">{workbook.title}</DialogTitle>
                  <DialogDescription className="truncate">{workbook.description}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {activeSheetRows.length} visible rows
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onLoadFullscreenIssues()}
                disabled={isFullscreenIssuesLoading}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isFullscreenIssuesLoading && "animate-spin")} />
                Refresh
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">
                  <Minimize2 className="h-3.5 w-3.5" />
                  Close
                </Button>
              </DialogClose>
            </div>
          </div>

          <div className="min-h-0 overflow-hidden p-3">
            <DataTable
              columns={fullscreenColumns}
              data={activeSheetRows}
              visualMode="excel"
              showRowNumbers
              showPagination={false}
              fullTextColumnIds={["no"]}
              columnTextModes={{
                moduleName: "wrap",
                assignedToName: "wrap",
                reviewedByName: "wrap",
                testedByName: "wrap",
              }}
              isLoading={isFullscreenIssuesLoading}
              skeletonRowCount={12}
              onRowClick={onRowClick}
              sorting={sorting}
              onSortingChange={handleFullscreenSortingChange}
              pageIndex={0}
              pageSize={Math.max(activeSheetRows.length, 1)}
              pageCount={1}
              fillHeight
              emptyMessage="No issues on this sheet."
              toolbarExtras={
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                  {fullscreenIssuesError ? (
                    <Badge variant="destructive">{fullscreenIssuesError}</Badge>
                  ) : null}
                  {fullscreenFilters}
                </div>
              }
            />
          </div>

          <div className="border-t border-border/70 bg-muted/30 px-3 py-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {workbook.sheets.map((sheet) => (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => setSelectedSheetId(sheet.id)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-2 rounded-t-md border border-border/70 bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    sheet.id === activeSheet?.id &&
                      "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 shadow-sm dark:text-emerald-300"
                  )}
                >
                  <span className="max-w-[11rem] truncate">{sheet.label}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.68rem] tabular-nums text-muted-foreground">
                    {sheet.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
