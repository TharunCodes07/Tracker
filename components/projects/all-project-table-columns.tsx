"use client";

import type { MouseEvent } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { PencilLine, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import type { UserProjectListItem } from "@/routes/projects/types";

interface AllProjectTableColumnOptions {
  onEdit: (project: UserProjectListItem) => void;
  onDelete: (project: UserProjectListItem) => void;
  actionPending?: boolean;
}

function stopRowClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

export function getAllProjectTableColumns({
  onEdit,
  onDelete,
  actionPending = false,
}: AllProjectTableColumnOptions): ColumnDef<UserProjectListItem>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
      cell: ({ row }) => (
        <div className="mx-auto min-w-0 max-w-[320px] space-y-1 text-center">
          <div
            className="line-clamp-2 break-words font-medium text-foreground"
            title={row.original.name}
          >
            {row.original.name}
          </div>
          <div
            className="truncate text-sm text-muted-foreground"
            title={row.original.description ?? "No description"}
          >
            {row.original.description ?? "No description"}
          </div>
        </div>
      ),
      size: 320,
    },
    {
      accessorKey: "teamName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Team" />,
      cell: ({ row }) => (
        <div className="mx-auto min-w-0 max-w-[220px] text-center">
          <span className="line-clamp-2 break-words" title={row.original.teamName}>
            {row.original.teamName}
          </span>
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: "issueCount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Issues" />,
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.issueCount} {row.original.issueCount === 1 ? "issue" : "issues"}
        </Badge>
      ),
      size: 140,
    },
    {
      id: "access",
      header: () => <div className="text-center">Access</div>,
      cell: ({ row }) => (
        <Badge variant={row.original.teamCanEdit ? "outline" : "secondary"}>
          {row.original.teamCanEdit ? "Edit" : "Read"}
        </Badge>
      ),
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => format(new Date(row.original.createdAt), "MMM d, yyyy"),
      size: 160,
    },
    {
      id: "actions",
      header: () => (
        <div className="line-clamp-2 break-words text-center leading-5" title="Actions">
          Actions
        </div>
      ),
      cell: ({ row }) =>
        row.original.teamCanEdit ? (
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
              aria-label={`Edit ${row.original.name}`}
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
              aria-label={`Delete ${row.original.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      enableSorting: false,
      size: 140,
    },
  ];
}
