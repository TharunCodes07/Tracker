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
import type { IssueListItem } from "@/routes/issues/types";

interface IssueTableColumnOptions {
  canEdit: boolean;
  onEdit: (issue: IssueListItem) => void;
  onDelete: (issue: IssueListItem) => void;
  actionPending?: boolean;
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
}: IssueTableColumnOptions): ColumnDef<IssueListItem>[] {
  return [
    {
      accessorKey: "no",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Issue" />,
      cell: ({ row }) => (
        <div className="mx-auto min-w-0 max-w-[320px] space-y-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline">#{row.original.no}</Badge>
            <span
              className="line-clamp-2 break-words font-medium text-foreground"
              title={row.original.title}
            >
              {row.original.title}
            </span>
          </div>
          <div
            className="line-clamp-1 break-words text-xs uppercase tracking-[0.16em] text-muted-foreground"
            title={row.original.navigation ?? "No navigation"}
          >
            {row.original.navigation ?? "No navigation"}
          </div>
          <div
            className="line-clamp-2 break-words text-sm text-muted-foreground"
            title={row.original.description ?? "No description"}
          >
            {row.original.description ?? "No description"}
          </div>
        </div>
      ),
      size: 340,
    },
    {
      accessorKey: "issueClassName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.issueClassName ?? "Unclassified"}</Badge>
      ),
      size: 160,
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
    },
    {
      accessorKey: "priority",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
      cell: ({ row }) => <IssuePriorityBadge priority={row.original.priority} />,
      size: 140,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <IssueStatusBadge status={row.original.status} />,
      size: 150,
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
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      cell: ({ row }) => format(new Date(row.original.updatedAt), "MMM d, yyyy"),
      size: 160,
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
