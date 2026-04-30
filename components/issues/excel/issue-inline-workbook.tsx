"use client";

import * as React from "react";
import type { OnChangeFn, SortingState, VisibilityState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Check, PencilLine, RotateCcw, Trash2, X } from "lucide-react";

import type { IssueFormValues } from "@/components/issues/issue-dialog";
import {
  IssueDisplayCell,
  IssueDraftCell,
  NEW_ROW_ID,
  WorkbookToolbar,
  canSaveDraft,
  getModuleDraftPatch,
  getStickyColumnClassName,
  stopCellEvent,
} from "@/components/issues/excel/issue-inline-workbook-controls";
import {
  createEmptyIssueForm,
  createIssueFormFromIssue,
} from "@/components/issues/helpers/project-issues-workspace-utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  GENERAL_MODULE_FILTER_VALUE,
  type IssueClassListItem,
  type IssueListItem,
  type IssueListSortField,
  type ProjectModuleListItem,
} from "@/routes/issues/types";
import type { TeamMemberListItem } from "@/routes/teams/types";

type InlineColumn = {
  id: string;
  label: string;
  width: string;
  sortableId?: IssueListSortField;
  required?: boolean;
};

type ActiveEditTarget = {
  rowId: string;
  columnId: string;
};

interface IssueInlineWorkbookProps {
  issues: IssueListItem[];
  modules: ProjectModuleListItem[];
  issueClasses: IssueClassListItem[];
  members: TeamMemberListItem[];
  canEdit: boolean;
  actionPending?: boolean;
  isLoading?: boolean;
  columnVisibility: VisibilityState;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  onCreateIssue: (values: IssueFormValues) => Promise<boolean>;
  onUpdateIssue: (issue: IssueListItem, values: IssueFormValues) => Promise<boolean>;
  onOpenModalEdit: (issue: IssueListItem) => void;
  onDeleteIssue: (issue: IssueListItem) => void;
  selectedModuleFilters: string[];
  emptyMessage?: string;
}

export const ISSUE_INLINE_WORKBOOK_COLUMNS: InlineColumn[] = [
  { id: "no", label: "#", width: "w-16", sortableId: "no" },
  { id: "navigation", label: "Navigation", width: "w-56", sortableId: "navigation" },
  { id: "title", label: "Issue", width: "w-[26rem]", sortableId: "title", required: true },
  {
    id: "issueClassName",
    label: "Type",
    width: "w-40",
    sortableId: "issueClassName",
    required: true,
  },
  { id: "moduleName", label: "Module", width: "w-56", sortableId: "moduleName" },
  { id: "priority", label: "Priority", width: "w-36", sortableId: "priority" },
  { id: "status", label: "Status", width: "w-36", sortableId: "status" },
  { id: "assignedToName", label: "Assigned", width: "w-44", sortableId: "assignedToName" },
  { id: "reviewedByName", label: "Reviewed By", width: "w-44", sortableId: "reviewedByName" },
  { id: "comments", label: "Comments", width: "w-64" },
  { id: "remark", label: "Remarks", width: "w-64" },
  { id: "testedByName", label: "Tested By", width: "w-44", sortableId: "testedByName" },
  { id: "fixedDate", label: "Fixed Date", width: "w-40" },
  { id: "development", label: "Development", width: "w-32" },
  { id: "deployment", label: "Deployment", width: "w-32" },
  { id: "updatedAt", label: "Updated", width: "w-40", sortableId: "updatedAt" },
  { id: "actions", label: "Actions", width: "w-32" },
];

function isColumnVisible(columnVisibility: VisibilityState, columnId: string) {
  return columnVisibility[columnId] !== false;
}

function createInlineDraft(
  issueClasses: IssueClassListItem[],
  selectedModuleFilters: string[],
  modules: ProjectModuleListItem[]
) {
  const draft = createEmptyIssueForm(issueClasses[0]?.id ?? "");
  const selectedModuleId =
    selectedModuleFilters.length === 1 &&
    selectedModuleFilters[0] !== GENERAL_MODULE_FILTER_VALUE
      ? selectedModuleFilters[0]
      : "";

  return {
    ...draft,
    ...getModuleDraftPatch(selectedModuleId, modules),
  };
}

function getEditableColumnId(columnId: string) {
  switch (columnId) {
    case "navigation":
    case "title":
    case "issueClassName":
    case "moduleName":
    case "priority":
    case "status":
    case "assignedToName":
    case "reviewedByName":
    case "comments":
    case "remark":
    case "testedByName":
    case "fixedDate":
    case "development":
    case "deployment":
      return columnId;
    default:
      return null;
  }
}

function updateSorting(
  column: InlineColumn,
  sorting: SortingState,
  onSortingChange: OnChangeFn<SortingState>
) {
  if (!column.sortableId) {
    return;
  }

  const activeSort = sorting[0];
  const nextDesc = activeSort?.id === column.sortableId ? !activeSort.desc : false;

  onSortingChange([{ id: column.sortableId, desc: nextDesc }]);
}

export function IssueInlineWorkbook({
  issues,
  modules,
  issueClasses,
  members,
  canEdit,
  actionPending = false,
  isLoading = false,
  columnVisibility,
  sorting,
  onSortingChange,
  onCreateIssue,
  onUpdateIssue,
  onOpenModalEdit,
  onDeleteIssue,
  selectedModuleFilters,
  emptyMessage = "No issues match the selected module filters.",
}: IssueInlineWorkbookProps) {
  const [newIssueValues, setNewIssueValues] = React.useState(() =>
    createInlineDraft(issueClasses, selectedModuleFilters, modules)
  );
  const [isNewIssueVisible, setIsNewIssueVisible] = React.useState(false);
  const [editingIssueId, setEditingIssueId] = React.useState<string | null>(null);
  const [editingValues, setEditingValues] = React.useState<IssueFormValues | null>(null);
  const [activeEditTarget, setActiveEditTarget] = React.useState<ActiveEditTarget | null>(null);
  const [savingRowId, setSavingRowId] = React.useState<string | null>(null);

  const visibleColumns = React.useMemo(
    () => ISSUE_INLINE_WORKBOOK_COLUMNS.filter((column) => isColumnVisible(columnVisibility, column.id)),
    [columnVisibility]
  );
  const activeEditingIssue = editingIssueId
    ? issues.find((issue) => issue.id === editingIssueId) ?? null
    : null;

  function patchNewIssueValues(patch: Partial<IssueFormValues>) {
    setNewIssueValues((currentValues) => ({
      ...currentValues,
      ...patch,
    }));
  }

  function patchEditingValues(patch: Partial<IssueFormValues>) {
    setEditingValues((currentValues) =>
      currentValues
        ? {
            ...currentValues,
            ...patch,
          }
        : currentValues
    );
  }

  function isActiveTarget(rowId: string, columnId: string) {
    return activeEditTarget?.rowId === rowId && activeEditTarget.columnId === columnId;
  }

  function startNewIssue() {
    setEditingIssueId(null);
    setEditingValues(null);
    setNewIssueValues(createInlineDraft(issueClasses, selectedModuleFilters, modules));
    setIsNewIssueVisible(true);
    setActiveEditTarget({ rowId: NEW_ROW_ID, columnId: "title" });
  }

  function cancelNewIssue() {
    setIsNewIssueVisible(false);
    setNewIssueValues(createInlineDraft(issueClasses, selectedModuleFilters, modules));

    if (activeEditTarget?.rowId === NEW_ROW_ID) {
      setActiveEditTarget(null);
    }
  }

  function cancelEditing() {
    setEditingIssueId(null);
    setEditingValues(null);
    setActiveEditTarget(null);
  }

  function startEditing(issue: IssueListItem, columnId: string) {
    if (!canEdit || actionPending || savingRowId) {
      return;
    }

    const editableColumnId = getEditableColumnId(columnId);

    if (!editableColumnId) {
      return;
    }

    setIsNewIssueVisible(false);
    setEditingIssueId(issue.id);
    setEditingValues(createIssueFormFromIssue(issue, issueClasses[0]?.id ?? ""));
    setActiveEditTarget({
      rowId: issue.id,
      columnId: editableColumnId,
    });
  }

  async function saveNewIssue() {
    if (!canSaveDraft(newIssueValues) || savingRowId) {
      return;
    }

    setSavingRowId(NEW_ROW_ID);

    try {
      const didSave = await onCreateIssue(newIssueValues);

      if (didSave) {
        setNewIssueValues(createInlineDraft(issueClasses, selectedModuleFilters, modules));
        setIsNewIssueVisible(false);
        setActiveEditTarget(null);
      }
    } finally {
      setSavingRowId(null);
    }
  }

  async function saveEditedIssue(issue: IssueListItem) {
    if (!editingValues || !canSaveDraft(editingValues) || savingRowId) {
      return;
    }

    setSavingRowId(issue.id);

    try {
      const didSave = await onUpdateIssue(issue, editingValues);

      if (didSave) {
        cancelEditing();
      }
    } finally {
      setSavingRowId(null);
    }
  }

  function renderActions(issue: IssueListItem) {
    const isEditing = editingIssueId === issue.id;

    if (!canEdit) {
      return <span className="text-muted-foreground">-</span>;
    }

    if (isEditing) {
      const isReopeningIssue = issue.status === "done" && editingValues?.status !== "done";

      return (
        <div className="flex items-center justify-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            onClick={(event) => {
              stopCellEvent(event);
              void saveEditedIssue(issue);
            }}
            disabled={!editingValues || !canSaveDraft(editingValues) || Boolean(savingRowId)}
            aria-label={isReopeningIssue ? `Reopen ${issue.title}` : `Save ${issue.title}`}
          >
            {isReopeningIssue ? (
              <RotateCcw className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={(event) => {
              stopCellEvent(event);
              cancelEditing();
            }}
            disabled={Boolean(savingRowId)}
            aria-label={`Cancel editing ${issue.title}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={(event) => {
            stopCellEvent(event);
            onOpenModalEdit(issue);
          }}
          disabled={actionPending || Boolean(savingRowId)}
          aria-label={`Open ${issue.title} in the edit modal`}
        >
          <PencilLine className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          onClick={(event) => {
            stopCellEvent(event);
            onDeleteIssue(issue);
          }}
          disabled={actionPending || Boolean(savingRowId)}
          aria-label={`Delete ${issue.title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <WorkbookToolbar
        canEdit={canEdit}
        isNewIssueVisible={isNewIssueVisible}
        editingIssue={activeEditingIssue}
        editingValues={editingValues}
        savingRowId={savingRowId}
        newIssueValues={newIssueValues}
        onStartNewIssue={startNewIssue}
        onSaveNewIssue={() => void saveNewIssue()}
        onCancelNewIssue={cancelNewIssue}
        onSaveEditedIssue={() => {
          if (activeEditingIssue) {
            void saveEditedIssue(activeEditingIssue);
          }
        }}
        onCancelEdit={cancelEditing}
      />

      <div className="tracker-thin-scrollbar min-h-0 flex-1 overflow-auto rounded-xl border border-border/70 bg-background shadow-inner [&_[data-slot=table-container]]:overflow-visible">
        <Table className="min-w-max border-separate border-spacing-0">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {visibleColumns.map((column) => {
                const activeSort = column.sortableId
                  ? sorting[0]?.id === column.sortableId
                    ? sorting[0]
                    : null
                  : null;

                return (
                  <TableHead
                    key={column.id}
                    className={cn(
                      "sticky top-0 z-40 h-9 border-r border-b border-border/70 bg-muted px-2 text-xs uppercase shadow-[0_1px_0_var(--border)]",
                      column.width,
                      getStickyColumnClassName(column.id, true)
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-center gap-1 text-center",
                        column.sortableId ? "cursor-pointer hover:text-foreground" : "cursor-default"
                      )}
                      onClick={() => updateSorting(column, sorting, onSortingChange)}
                      disabled={!column.sortableId}
                    >
                      <span>{column.label}</span>
                      {activeSort ? (
                        activeSort.desc ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUp className="h-3 w-3" />
                        )
                      ) : null}
                      {column.required ? <span className="text-destructive">*</span> : null}
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {canEdit && isNewIssueVisible ? (
              <TableRow className="bg-emerald-500/5 hover:bg-emerald-500/10">
                {visibleColumns.map((column) => (
                  <TableCell
                    key={`new-${column.id}`}
                    className={cn(
                      "border-r border-b border-border/60 p-2 align-top",
                      getStickyColumnClassName(column.id)
                    )}
                  >
                    {column.id === "actions" ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          onClick={() => void saveNewIssue()}
                          disabled={!canSaveDraft(newIssueValues) || Boolean(savingRowId)}
                          aria-label="Add issue"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={cancelNewIssue}
                          disabled={Boolean(savingRowId)}
                          aria-label="Cancel new issue"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <IssueDraftCell
                        columnId={column.id}
                        values={newIssueValues}
                        patch={patchNewIssueValues}
                        issueClasses={issueClasses}
                        modules={modules}
                        members={members}
                        isTarget={isActiveTarget(NEW_ROW_ID, column.id)}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ) : null}

            {isLoading ? (
              Array.from({ length: 10 }).map((_, rowIndex) => (
                <TableRow key={`loading-${rowIndex}`}>
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={`loading-${rowIndex}-${column.id}`}
                      className="h-12 border-r border-b border-border/60 p-2"
                    >
                      <div className="h-4 rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : issues.length > 0 ? (
              issues.map((issue) => {
                const isEditing = editingIssueId === issue.id && editingValues;

                return (
                  <TableRow
                    key={issue.id}
                    className={cn(
                      "h-12 odd:bg-muted/[0.12] hover:bg-emerald-500/5",
                      isEditing && "bg-cyan-500/5 hover:bg-cyan-500/10"
                    )}
                  >
                    {visibleColumns.map((column) => (
                      <TableCell
                        key={`${issue.id}-${column.id}`}
                        onClick={() => {
                          if (!isEditing && getEditableColumnId(column.id)) {
                            startEditing(issue, column.id);
                          }
                        }}
                        className={cn(
                          "border-r border-b border-border/60 p-2 text-center align-top",
                          !isEditing && getEditableColumnId(column.id) && canEdit && "cursor-cell",
                          getStickyColumnClassName(column.id)
                        )}
                      >
                        {column.id === "actions" ? (
                          renderActions(issue)
                        ) : isEditing ? (
                          <IssueDraftCell
                            columnId={column.id}
                            values={editingValues}
                            patch={patchEditingValues}
                            issue={issue}
                            issueClasses={issueClasses}
                            modules={modules}
                            members={members}
                            isTarget={isActiveTarget(issue.id, column.id)}
                          />
                        ) : (
                          <IssueDisplayCell columnId={column.id} issue={issue} />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
