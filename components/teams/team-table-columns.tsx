"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Copy, PencilLine, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import type { TeamListItem } from "@/routes/teams/types";

interface TeamTableColumnOptions {
  onEdit: (team: TeamListItem) => void;
  onDelete: (team: TeamListItem) => void;
  onCopyCode: (code: string) => void;
  actionPending?: boolean;
}

export function getTeamTableColumns({
  onEdit,
  onDelete,
  onCopyCode,
  actionPending = false,
}: TeamTableColumnOptions): ColumnDef<TeamListItem>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Team" />,
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
      size: 300,
    },
    {
      accessorKey: "createdByName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created By" />,
      cell: ({ row }) => (
        <div className="mx-auto flex min-w-0 max-w-[220px] items-center justify-center gap-2">
          <span
            className="line-clamp-2 break-words text-center"
            title={row.original.createdByName}
          >
            {row.original.createdByName}
          </span>
          {row.original.isOwner ? <Badge variant="outline">You</Badge> : null}
        </div>
      ),
      size: 180,
    },
    {
      accessorKey: "memberCount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Members" />,
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.memberCount} {row.original.memberCount === 1 ? "member" : "members"}
        </Badge>
      ),
      size: 140,
    },
    {
      accessorKey: "joinCode",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Join Code" />,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1.5">
          <Badge variant="outline" className="gap-1.5 font-mono">
            Code {row.original.joinCode}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="rounded-lg"
            onClick={() => onCopyCode(row.original.joinCode)}
            aria-label={`Copy code for ${row.original.name}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      size: 220,
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
        row.original.isOwner ? (
          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-xl"
              onClick={() => onEdit(row.original)}
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
              onClick={() => onDelete(row.original)}
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
      size: 120,
    },
  ];
}
