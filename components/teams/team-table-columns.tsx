"use client";

import type { MouseEvent } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Copy, Globe2, Lock, PencilLine, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import type { TeamListItem } from "@/routes/teams/types";

interface TeamTableColumnOptions {
  onEdit: (team: TeamListItem) => void;
  onDelete: (team: TeamListItem) => void;
  onCopyCode: (code: string) => void;
  onRequestAccess: (team: TeamListItem) => void;
  actionPending?: boolean;
  pendingRequestTeamId?: string | null;
}

function stopRowClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

export function getTeamTableColumns({
  onEdit,
  onDelete,
  onCopyCode,
  onRequestAccess,
  actionPending = false,
  pendingRequestTeamId = null,
}: TeamTableColumnOptions): ColumnDef<TeamListItem>[] {
  return [
    {
      accessorKey: "name",
      meta: {
        label: "Team",
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Team" />,
      cell: ({ row }) => (
        <div className="mx-auto min-w-0 max-w-[320px] space-y-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <Badge variant={row.original.visibility === "public" ? "outline" : "secondary"}>
              {row.original.visibility === "public" ? (
                <Globe2 className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {row.original.visibility === "public" ? "Public" : "Private"}
            </Badge>
            {row.original.membershipStatus === "pending" ? (
              <Badge variant="secondary">Pending</Badge>
            ) : row.original.isOwner ? (
              <Badge variant="default">Owner</Badge>
            ) : row.original.membershipStatus === "active" ? (
              <Badge variant={row.original.canEdit ? "outline" : "secondary"}>
                {row.original.canEdit ? "Edit" : "Read"}
              </Badge>
            ) : null}
          </div>
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
      meta: {
        label: "Created By",
      },
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
      meta: {
        label: "Members",
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Members" />,
      cell: ({ row }) => (
        <div className="flex flex-col items-center gap-1">
          <Badge variant="secondary">
            {row.original.memberCount} {row.original.memberCount === 1 ? "member" : "members"}
          </Badge>
          {row.original.isOwner && row.original.pendingRequestCount > 0 ? (
            <span className="text-xs text-amber-600 dark:text-amber-300">
              {row.original.pendingRequestCount} pending
            </span>
          ) : null}
        </div>
      ),
      size: 140,
    },
    {
      accessorKey: "accessLevel",
      meta: {
        label: "Access",
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Access" />,
      cell: ({ row }) => {
        if (row.original.membershipStatus === "pending") {
          return <Badge variant="secondary">Pending</Badge>;
        }

        if (row.original.membershipStatus !== "active" || !row.original.accessLevel) {
          return <Badge variant="secondary">No access</Badge>;
        }

        if (row.original.accessLevel === "owner") {
          return <Badge>Owner</Badge>;
        }

        return (
          <Badge variant={row.original.accessLevel === "edit" ? "outline" : "secondary"}>
            {row.original.accessLevel === "edit" ? "Edit" : "Read"}
          </Badge>
        );
      },
      size: 120,
    },
    {
      accessorKey: "joinCode",
      meta: {
        label: "Join Code",
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Join Code" />,
      cell: ({ row }) =>
        row.original.joinCode ? (
          <div className="flex items-center justify-center gap-1.5">
            <Badge variant="outline" className="gap-1.5 font-mono">
              Code {row.original.joinCode}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="rounded-lg"
              onClick={(event) => {
                stopRowClick(event);
                onCopyCode(row.original.joinCode as string);
              }}
              aria-label={`Copy code for ${row.original.name}`}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : row.original.membershipStatus === "pending" ? (
          <Badge variant="secondary">Awaiting approval</Badge>
        ) : (
          <span className="text-muted-foreground">Hidden</span>
        ),
      size: 220,
    },
    {
      accessorKey: "createdAt",
      meta: {
        label: "Created",
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => format(new Date(row.original.createdAt), "MMM d, yyyy"),
      size: 160,
    },
    {
      id: "actions",
      meta: {
        label: "Actions",
      },
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
        ) : row.original.canRequestAccess ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              stopRowClick(event);
              onRequestAccess(row.original);
            }}
            disabled={actionPending || pendingRequestTeamId === row.original.id}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {pendingRequestTeamId === row.original.id ? "Requesting..." : "Request"}
          </Button>
        ) : row.original.membershipStatus === "pending" ? (
          <span className="text-muted-foreground">Pending</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      enableSorting: false,
      enableHiding: false,
      size: 120,
    },
  ];
}
