"use client";

import type { MouseEvent } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { PencilLine, Trash2 } from "lucide-react";

import {
  IssuePriorityBadge,
  IssueReopenedBadge,
  IssueStatusBadge,
} from "@/components/issues/issue-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { cn } from "@/lib/utils";
import type { IssueListItem } from "@/routes/issues/types";

interface IssueTableColumnOptions {
  canEdit: boolean;
  onEdit: (issue: IssueListItem) => void;
  onDelete: (issue: IssueListItem) => void;
  actionPending?: boolean;
  issueTextMode?: "compact" | "full";
}

const NAVIGATION_TEXT_HEIGHT_CLASS =
  "tracker-thin-scrollbar min-h-9 max-h-24 overflow-y-auto pr-1";
const ISSUE_TEXT_HEIGHT_CLASS =
  "tracker-thin-scrollbar min-h-14 max-h-36 overflow-y-auto pr-1";
const LONG_TEXT_HEIGHT_CLASS =
  "tracker-thin-scrollbar min-h-10 max-h-32 overflow-y-auto pr-1";
const NAVIGATION_TEXT_WIDTH_CLASS = "max-w-[12rem]";
const ISSUE_TEXT_WIDTH_CLASS = "max-w-[24rem]";
const LONG_TEXT_WIDTH_CLASS = "max-w-[18rem]";

function stopRowClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

function getBooleanBadgeVariant(value: boolean): "secondary" | "outline" {
  return value ? "secondary" : "outline";
}

function getBooleanLabel(value: boolean) {
  return value ? "Yes" : "No";
}

function LongTextCell({ value, fallback }: { value: string | null; fallback: string }) {
  const displayValue = value?.trim() ? value : fallback;

  return (
    <div
      className={cn(
        "min-w-0 whitespace-pre-wrap text-left leading-5 [overflow-wrap:anywhere]",
        LONG_TEXT_WIDTH_CLASS,
        LONG_TEXT_HEIGHT_CLASS
      )}
      title={displayValue}
    >
      {displayValue}
    </div>
  );
}

export function getIssueTableColumns({
  canEdit,
  onEdit,
  onDelete,
  actionPending = false,
  issueTextMode = "compact",
}: IssueTableColumnOptions): ColumnDef<IssueListItem>[] {
  const showFullIssueText = issueTextMode === "full";

  return [
    {
      accessorKey: "navigation",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Navigation" />,
      cell: ({ row }) => (
        <div
          className={cn(
            "min-w-0 whitespace-pre-wrap text-left leading-5 [overflow-wrap:anywhere]",
            NAVIGATION_TEXT_WIDTH_CLASS,
            NAVIGATION_TEXT_HEIGHT_CLASS
          )}
          title={row.original.navigation ?? "No navigation"}
        >
          {row.original.navigation ?? "No navigation"}
        </div>
      ),
      size: 160,
      minSize: 120,
      maxSize: 220,
      meta: {
        label: "Navigation",
        align: "left",
        textMode: "wrap",
      },
    },
    {
      accessorKey: "no",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Issue" />,
      cell: ({ row }) => (
        <div
          className={cn(
            "min-w-0 space-y-1 [overflow-wrap:anywhere]",
            showFullIssueText
              ? cn("text-left", ISSUE_TEXT_WIDTH_CLASS, ISSUE_TEXT_HEIGHT_CLASS)
              : "mx-auto max-w-[320px] text-center"
          )}
        >
          <div
            className={cn(
              "flex gap-2",
              showFullIssueText ? "items-start justify-start" : "items-center justify-center"
            )}
          >
            {/* <Badge variant="outline" className="mt-0.5 shrink-0">
              #{row.original.no}
            </Badge> */}
            <span
              className={cn(
                "break-words font-medium text-foreground",
                showFullIssueText ? "whitespace-normal leading-5" : "line-clamp-2"
              )}
              title={row.original.title}
            >
              {row.original.title}
            </span>
          </div>
          <div
            className={cn(
              "break-words text-sm text-muted-foreground",
              showFullIssueText ? "whitespace-normal leading-5" : "line-clamp-2"
            )}
            title={row.original.description ?? "No description"}
          >
            {row.original.description ?? "No description"}
          </div>
        </div>
      ),
      size: showFullIssueText ? 340 : 300,
      minSize: 260,
      maxSize: 440,
      meta: {
        label: "Issue",
        align: showFullIssueText ? "left" : "center",
        textMode: showFullIssueText ? "full" : "wrap",
      },
    },
    {
      accessorKey: "issueClassName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.issueClassName ?? "Unclassified"}</Badge>
      ),
      size: 120,
      meta: {
        label: "Type",
      },
    },
    {
      accessorKey: "moduleName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Module" />,
      cell: ({ row }) => (
        <div className="mx-auto min-w-0 max-w-[180px] text-center">
          <span className="line-clamp-2 break-words">{row.original.moduleName ?? "General"}</span>
        </div>
      ),
      size: 180,
      meta: {
        label: "Module",
      },
    },
    {
      accessorKey: "priority",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
      cell: ({ row }) => <IssuePriorityBadge priority={row.original.priority} />,
      size: 120,
      meta: {
        label: "Priority",
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <div className="flex flex-col items-center gap-1">
          <IssueStatusBadge status={row.original.status} />
          {row.original.reopenedAt ? <IssueReopenedBadge /> : null}
        </div>
      ),
      size: 120,
      meta: {
        label: "Status",
      },
    },
    {
      accessorKey: "comments",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Comments" />,
      cell: ({ row }) => <LongTextCell value={row.original.comments} fallback="No comments" />,
      enableSorting: false,
      size: 220,
      minSize: 160,
      maxSize: 320,
      meta: {
        label: "Comments",
        align: "left",
        textMode: "full",
      },
    },
    {
      accessorKey: "remark",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Remarks" />,
      cell: ({ row }) => <LongTextCell value={row.original.remark} fallback="No remarks" />,
      enableSorting: false,
      size: 220,
      minSize: 160,
      maxSize: 320,
      meta: {
        label: "Remarks",
        align: "left",
        textMode: "full",
      },
    },
    {
      accessorKey: "assignedToName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned" />,
      cell: ({ row }) => (
        <div className="mx-auto min-w-0 max-w-[180px] text-center">
          <span className="line-clamp-2 break-words">
            {row.original.assignedToName ?? "Unassigned"}
          </span>
        </div>
      ),
      size: 180,
      meta: {
        label: "Assigned",
      },
    },
    {
      accessorKey: "reviewedByName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reviewed By" />,
      cell: ({ row }) => (
        <div className="mx-auto min-w-0 max-w-[180px] text-center">
          <span className="line-clamp-2 break-words">
            {row.original.reviewedByName ?? "Not reviewed"}
          </span>
        </div>
      ),
      size: 180,
      meta: {
        label: "Reviewed By",
      },
    },
    {
      accessorKey: "testedByName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tested By" />,
      cell: ({ row }) => (
        <div className="mx-auto min-w-0 max-w-[180px] text-center">
          <span className="line-clamp-2 break-words">
            {row.original.testedByName ?? "Not tested"}
          </span>
        </div>
      ),
      size: 180,
      meta: {
        label: "Tested By",
      },
    },
    {
      accessorKey: "development",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Development" />,
      cell: ({ row }) => (
        <Badge variant={getBooleanBadgeVariant(row.original.development)}>
          {getBooleanLabel(row.original.development)}
        </Badge>
      ),
      size: 140,
      meta: {
        label: "Development",
      },
    },
    {
      accessorKey: "deployment",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Deployement" />,
      cell: ({ row }) => (
        <Badge variant={getBooleanBadgeVariant(row.original.deployment)}>
          {getBooleanLabel(row.original.deployment)}
        </Badge>
      ),
      size: 140,
      meta: {
        label: "Deployment",
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      cell: ({ row }) => format(new Date(row.original.updatedAt), "MMM d, yyyy"),
      size: 140,
      meta: {
        label: "Updated",
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) =>
        canEdit ? (
          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-xl"
              onClick={(event) => {
                stopRowClick(event);
                onEdit(row.original);
              }}
              disabled={actionPending}
              aria-label={`Edit ${row.original.title}`}
            >
              <PencilLine className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-xl text-destructive hover:text-destructive"
              onClick={(event) => {
                stopRowClick(event);
                onDelete(row.original);
              }}
              disabled={actionPending}
              aria-label={`Delete ${row.original.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      enableSorting: false,
      size: 130,
    },
  ];
}
