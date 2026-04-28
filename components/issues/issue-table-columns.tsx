"use client";

import type { MouseEvent } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { PencilLine, Trash2 } from "lucide-react";

import {
  IssuePriorityBadge,
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

function stopRowClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

function getBooleanBadgeVariant(value: boolean): "secondary" | "outline" {
  return value ? "secondary" : "outline";
}

function getBooleanLabel(value: boolean) {
  return value ? "Yes" : "No";
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
      accessorKey: "no",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Issue" />,
      cell: ({ row }) => (
        <div
          className={cn(
            "min-w-0 space-y-1",
            showFullIssueText ? "max-w-none text-left" : "mx-auto max-w-[320px] text-center"
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
      size: 440,
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
      size: 160,
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
      size: 140,
      meta: {
        label: "Priority",
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <IssueStatusBadge status={row.original.status} />,
      size: 150,
      meta: {
        label: "Status",
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
      size: 150,
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
      size: 150,
      meta: {
        label: "Deployment",
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      cell: ({ row }) => format(new Date(row.original.updatedAt), "MMM d, yyyy"),
      size: 160,
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
