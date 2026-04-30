"use client";

import * as React from "react";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import type { VisibilityState } from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
} from "lucide-react";

import { getIssueTableColumns } from "@/components/issues/issue-table-columns";
import type { IssueFormValues } from "@/components/issues/issue-dialog";
import {
  ISSUE_INLINE_WORKBOOK_COLUMNS,
  IssueInlineWorkbook,
} from "@/components/issues/excel/issue-inline-workbook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  type IssueClassListItem,
  type IssueListItem,
  type ProjectModuleListItem,
} from "@/routes/issues/types";
import type { TeamMemberListItem } from "@/routes/teams/types";

type IssueSheetKind = "all" | "general" | "main" | "sub";

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
  sheets: IssueSheet[];
}

interface IssueExcelTableProps {
  resolutionControls?: React.ReactNode;
  issues: IssueListItem[];
  fullscreenIssues: IssueListItem[];
  fullscreenIssuesError?: string | null;
  isFullscreenIssuesLoading?: boolean;
  modules: ProjectModuleListItem[];
  issueClasses: IssueClassListItem[];
  members: TeamMemberListItem[];
  selectedModuleFilters: string[];
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
  onCreateInlineIssue: (values: IssueFormValues) => Promise<boolean>;
  onUpdateInlineIssue: (issue: IssueListItem, values: IssueFormValues) => Promise<boolean>;
  onModuleFilterToggle: (value: string) => void;
  onClearModuleFilters: () => void;
  onLoadFullscreenIssues: (sortingOverride?: SortingState) => void;
  fullscreenReloadKey: string;
  fullscreenFilters?: React.ReactNode;
}

function filterIssuesBySheet(issues: IssueListItem[], sheet: Omit<IssueSheet, "count">) {
  switch (sheet.kind) {
    case "general":
      return issues.filter((issue) => !issue.moduleId);
    case "main":
      return issues.filter((issue) => issue.moduleId === sheet.moduleId && !issue.subModuleId);
    case "sub":
      return issues.filter((issue) => issue.moduleId === sheet.moduleId);
    case "all":
    default:
      return issues;
  }
}

function filterIssuesByModuleFilters(issues: IssueListItem[], selectedModuleFilters: string[]) {
  if (selectedModuleFilters.length === 0) {
    return issues;
  }

  const selectedModules = new Set(
    selectedModuleFilters.filter((value) => value !== GENERAL_MODULE_FILTER_VALUE)
  );
  const includesGeneral = selectedModuleFilters.includes(GENERAL_MODULE_FILTER_VALUE);

  return issues.filter((issue) => {
    if (!issue.moduleId) {
      return includesGeneral;
    }

    return selectedModules.has(issue.moduleId);
  });
}

function withSheetCounts(issues: IssueListItem[], sheets: Omit<IssueSheet, "count">[]) {
  return sheets.map((sheet) => ({
    ...sheet,
    count: filterIssuesBySheet(issues, sheet).length,
  }));
}

function buildWorkbook(
  issues: IssueListItem[],
  modules: ProjectModuleListItem[],
): IssueWorkbook {
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
    description: "",
      // "The fullscreen workbook groups general issues, direct main-module issues, and sub modules into sheets.",
    sheets,
  };
}

export function IssueExcelTable({
  resolutionControls,
  issues,
  fullscreenIssues,
  fullscreenIssuesError,
  isFullscreenIssuesLoading = false,
  modules,
  issueClasses,
  members,
  selectedModuleFilters,
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
  onCreateInlineIssue,
  onUpdateInlineIssue,
  onModuleFilterToggle,
  onClearModuleFilters,
  onLoadFullscreenIssues,
  fullscreenReloadKey,
  fullscreenFilters,
}: IssueExcelTableProps) {
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);
  const [hasRequestedFullscreenIssues, setHasRequestedFullscreenIssues] = React.useState(false);
  const [fullscreenColumnVisibility, setFullscreenColumnVisibility] =
    React.useState<VisibilityState>({});
  const [expandedMainModuleIds, setExpandedMainModuleIds] = React.useState<string[]>([]);
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
  const fullscreenColumnToggleItems = React.useMemo(
    () =>
      ISSUE_INLINE_WORKBOOK_COLUMNS
        .filter((column) => column.id !== "actions")
        .map((column) => ({
          id: column.id,
          label: column.label,
        })),
    []
  );
  const workbookRows = hasRequestedFullscreenIssues ? fullscreenIssues : issues;
  const workbook = React.useMemo(
    () => buildWorkbook(workbookRows, modules),
    [workbookRows, modules]
  );
  const selectedModuleFilterSet = React.useMemo(
    () => new Set(selectedModuleFilters),
    [selectedModuleFilters]
  );
  const moduleById = React.useMemo(
    () => new Map(modules.map((moduleItem) => [moduleItem.id, moduleItem])),
    [modules]
  );
  const mainModules = React.useMemo(
    () => modules.filter((moduleItem) => !moduleItem.parentModuleId),
    [modules]
  );
  const subModulesByParentId = React.useMemo(() => {
    const map = new Map<string, ProjectModuleListItem[]>();

    for (const moduleItem of modules) {
      if (!moduleItem.parentModuleId) {
        continue;
      }

      const siblings = map.get(moduleItem.parentModuleId) ?? [];
      siblings.push(moduleItem);
      map.set(moduleItem.parentModuleId, siblings);
    }

    return map;
  }, [modules]);
  const selectedMainGroupIds = React.useMemo(() => {
    const ids = new Set<string>();

    for (const moduleId of selectedModuleFilters) {
      if (moduleId === GENERAL_MODULE_FILTER_VALUE) {
        continue;
      }

      const moduleItem = moduleById.get(moduleId);

      if (moduleItem) {
        ids.add(moduleItem.parentModuleId ?? moduleItem.id);
      }
    }

    return ids;
  }, [moduleById, selectedModuleFilters]);
  const sheetById = React.useMemo(
    () => new Map(workbook.sheets.map((sheet) => [sheet.id, sheet])),
    [workbook.sheets]
  );
  const activeSheetRows = React.useMemo(
    () => filterIssuesByModuleFilters(workbookRows, selectedModuleFilters),
    [selectedModuleFilters, workbookRows]
  );

  function toggleMainModuleExpansion(moduleId: string) {
    setExpandedMainModuleIds((currentIds) =>
      currentIds.includes(moduleId)
        ? currentIds.filter((id) => id !== moduleId)
        : [...currentIds, moduleId]
    );
  }

  function renderSheetButton(
    sheet: IssueSheet,
    options?: {
      highlighted?: boolean;
      active?: boolean;
      nested?: boolean;
      attachedLeft?: boolean;
      attachedRight?: boolean;
      onClick?: () => void;
    }
  ) {
    const isActive = options?.active ?? false;

    return (
      <button
        key={sheet.id}
        type="button"
        onClick={options?.onClick}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-2 rounded-t-md border border-border/70 bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          options?.nested && "h-7 rounded-none border-l-0 px-2 text-[11px]",
          options?.nested && !options?.attachedRight && "rounded-r-md",
          options?.attachedLeft && "rounded-l-none border-l-0",
          options?.attachedRight && "rounded-r-none",
          options?.highlighted &&
            "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
          isActive &&
            "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 shadow-sm dark:text-emerald-300"
        )}
      >
        <span className="max-w-[11rem] truncate">{sheet.label}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.68rem] tabular-nums text-muted-foreground">
          {sheet.count}
        </span>
      </button>
    );
  }

  function renderMainModuleSheetGroup(props: {
    mainModule: ProjectModuleListItem;
    mainSheet: IssueSheet;
    subModules: ProjectModuleListItem[];
    isExpanded: boolean;
    hasSelectedInGroup: boolean;
  }) {
    const { mainModule, mainSheet, subModules, isExpanded, hasSelectedInGroup } = props;
    const hasSubModules = subModules.length > 0;

    return (
      <div
        key={`sheet-group-${mainModule.id}`}
        className={cn(
          "flex shrink-0 items-end gap-0 rounded-t-md",
          hasSelectedInGroup && "bg-cyan-500/5"
        )}
      >
        {renderSheetButton(mainSheet, {
          active: selectedModuleFilterSet.has(mainModule.id),
          highlighted: selectedModuleFilterSet.has(mainModule.id),
          attachedRight: hasSubModules,
          onClick: () => onModuleFilterToggle(mainModule.id),
        })}

        {hasSubModules ? (
          <button
            type="button"
            onClick={() => toggleMainModuleExpansion(mainModule.id)}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-tr-md border border-l-0 border-border/70 bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              isExpanded && "rounded-r-none",
              hasSelectedInGroup &&
                "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
            )}
            aria-label={
              isExpanded
                ? `Collapse ${mainModule.name} sub modules`
                : `Expand ${mainModule.name} sub modules`
            }
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}

        {isExpanded
          ? subModules.map((subModule, index) => {
              const subSheet = sheetById.get(`sub:${subModule.id}`);

              return subSheet
                ? renderSheetButton(subSheet, {
                    active: selectedModuleFilterSet.has(subModule.id),
                    highlighted: selectedModuleFilterSet.has(subModule.id),
                    nested: true,
                    attachedLeft: true,
                    attachedRight: index < subModules.length - 1,
                    onClick: () => onModuleFilterToggle(subModule.id),
                  })
                : null;
            })
          : null}
      </div>
    );
  }

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
        toolbarClassName="flex-wrap"
        toolbarExtras={
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {resolutionControls}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="secondary" size="sm">
                    View
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {fullscreenColumnToggleItems.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={fullscreenColumnVisibility[column.id] !== false}
                      onCheckedChange={(checked) =>
                        setFullscreenColumnVisibility((currentVisibility) => ({
                          ...currentVisibility,
                          [column.id]: Boolean(checked),
                        }))
                      }
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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

          <div className="flex min-h-0 flex-col gap-3 overflow-hidden p-3">
            {(fullscreenIssuesError || fullscreenFilters) ? (
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 rounded-xl border border-border/70 bg-muted/25 p-2 shadow-sm">
                {fullscreenIssuesError ? (
                  <Badge variant="destructive">{fullscreenIssuesError}</Badge>
                ) : null}
                {fullscreenFilters}
              </div>
            ) : null}
            <IssueInlineWorkbook
              issues={activeSheetRows}
              modules={modules}
              issueClasses={issueClasses}
              members={members}
              canEdit={canEdit}
              actionPending={actionPending}
              isLoading={isFullscreenIssuesLoading}
              sorting={sorting}
              onSortingChange={handleFullscreenSortingChange}
              columnVisibility={fullscreenColumnVisibility}
              onCreateIssue={onCreateInlineIssue}
              onUpdateIssue={onUpdateInlineIssue}
              onOpenModalEdit={onEdit}
              onDeleteIssue={onDelete}
              selectedModuleFilters={selectedModuleFilters}
              emptyMessage="No issues match the selected module filters."
            />
          </div>

          <div className="border-t border-border/70 bg-muted/30 px-3 py-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {renderSheetButton(sheetById.get("__all__") ?? workbook.sheets[0], {
                active: selectedModuleFilters.length === 0,
                onClick: onClearModuleFilters,
              })}
              {sheetById.get("__general__")
                ? renderSheetButton(sheetById.get("__general__")!, {
                    active: selectedModuleFilterSet.has(GENERAL_MODULE_FILTER_VALUE),
                    highlighted: selectedModuleFilterSet.has(GENERAL_MODULE_FILTER_VALUE),
                    onClick: () => onModuleFilterToggle(GENERAL_MODULE_FILTER_VALUE),
                  })
                : null}

              {mainModules.map((mainModule) => {
                const mainSheet = sheetById.get(`main:${mainModule.id}`);
                const subModules = subModulesByParentId.get(mainModule.id) ?? [];
                const isExpanded =
                  selectedMainGroupIds.has(mainModule.id) ||
                  expandedMainModuleIds.includes(mainModule.id);
                const hasSelectedInGroup = selectedMainGroupIds.has(mainModule.id);

                if (!mainSheet) {
                  return null;
                }

                return renderMainModuleSheetGroup({
                  mainModule,
                  mainSheet,
                  subModules,
                  isExpanded,
                  hasSelectedInGroup,
                });
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
