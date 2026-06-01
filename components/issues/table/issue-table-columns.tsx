"use client";

import type { MouseEvent } from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { PencilLine, Trash2 } from "lucide-react";

import {
  IssuePriorityBadge,
  IssueReopenedBadge,
  IssueStatusBadge,
} from "@/components/issues/shared/issue-display";
import {
  getClaimableIssueRoles,
  IssueClaimActions,
  type IssueClaimMember,
  type IssueClaimRole,
} from "@/components/issues/shared/issue-claim";
import {
  getIssueAssignmentLabel,
  getIssueTesterAssignmentLabel,
  splitBulletItems,
} from "@/components/issues/shared/issue-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { cn } from "@/lib/utils";
import {
  DEPLOYMENT_STATUS_OPTIONS,
  DEVELOPMENT_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  type DeploymentStatus,
  type DevelopmentStatus,
  type IssueListItem,
} from "@/routes/issues/types";

interface IssueTableColumnOptions {
  canEdit: boolean;
  onEdit: (issue: IssueListItem) => void;
  onDelete: (issue: IssueListItem) => void;
  actionPending?: boolean;
  issueTextMode?: "compact" | "full";
  currentMember?: IssueClaimMember | null;
  onClaim?: (issue: IssueListItem, role: IssueClaimRole) => void;
  claimActionPending?: boolean;
}

const ISSUE_TEXT_WIDTH_CLASS = "max-w-[28rem]";
const LONG_TEXT_WIDTH_CLASS = "max-w-[18rem]";
const LONG_TEXT_HEIGHT_CLASS =
  "tracker-thin-scrollbar min-h-10 max-h-28 overflow-y-auto pr-1";

function stopRowClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

function optionLabel<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function TypeBadge({ issue }: { issue: IssueListItem }) {
  return (
    <span className="text-xs text-muted-foreground">
      {optionLabel(ISSUE_TYPE_OPTIONS, issue.issueType)}
    </span>
  );
}

function TextCell({
  value,
  fallback,
}: {
  value: string | null;
  fallback: string;
}) {
  const displayValue = value?.trim() ? value : fallback;

  return (
    <div
      className={cn(
        "min-w-0 whitespace-pre-wrap text-left leading-5 [overflow-wrap:anywhere]",
        LONG_TEXT_WIDTH_CLASS,
        LONG_TEXT_HEIGHT_CLASS,
      )}
      title={displayValue}
    >
      {displayValue}
    </div>
  );
}

function BulletTextCell({
  value,
  fallback,
}: {
  value: string | null;
  fallback: string;
}) {
  const items = splitBulletItems(value);

  if (items.length === 0) {
    return <TextCell value={null} fallback={fallback} />;
  }

  return (
    <ul
      className={cn(
        "min-w-0 space-y-1 text-left leading-5 [overflow-wrap:anywhere]",
        LONG_TEXT_WIDTH_CLASS,
        LONG_TEXT_HEIGHT_CLASS,
      )}
      title={items.join("\n")}
    >
      {items.map((item, index) => (
        <li key={index} className="flex min-w-0 gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PersonCell({
  value,
  fallback,
}: {
  value: string | null;
  fallback: string;
}) {
  return (
    <div className="mx-auto min-w-0 max-w-[180px] text-center">
      <span className="line-clamp-2 break-words">{value ?? fallback}</span>
    </div>
  );
}

function StatusTextBadge({
  value,
  type,
}: {
  value: DevelopmentStatus | DeploymentStatus;
  type: "development" | "deployment";
}) {
  const label =
    type === "development"
      ? optionLabel(DEVELOPMENT_STATUS_OPTIONS, value as DevelopmentStatus)
      : optionLabel(DEPLOYMENT_STATUS_OPTIONS, value as DeploymentStatus);

  return (
    <Badge
      variant="outline"
      className={cn(
        type === "development"
          ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      )}
    >
      {label}
    </Badge>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return format(date, "MMM d, yyyy");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return format(date, "MMM d, yyyy h:mm a");
}

export function getIssueTableColumns({
  canEdit,
  onEdit,
  onDelete,
  actionPending = false,
  issueTextMode = "compact",
  currentMember,
  onClaim,
  claimActionPending = false,
}: IssueTableColumnOptions): ColumnDef<IssueListItem>[] {
  const showFullIssueText = issueTextMode === "full";

  return [
    {
      accessorKey: "serialNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="No" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.serialNumber}
        </span>
      ),
      size: 72,
      meta: {
        label: "No",
      },
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Issue" />
      ),
      cell: ({ row }) => (
        <div
          className={cn(
            "min-w-0 space-y-1 [overflow-wrap:anywhere]",
            showFullIssueText
              ? cn(
                  "text-left",
                  ISSUE_TEXT_WIDTH_CLASS,
                  "tracker-thin-scrollbar max-h-40 overflow-y-auto pr-1",
                )
              : "mx-auto max-w-[320px] text-center",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge issue={row.original} />
          </div>
          <div
            className={cn(
              "break-words font-medium text-foreground",
              showFullIssueText
                ? "whitespace-normal leading-5"
                : "line-clamp-2",
            )}
            title={row.original.title}
          >
            {row.original.title}
          </div>
          {row.original.description ? (
            <div
              className={cn(
                "break-words text-sm text-muted-foreground",
                showFullIssueText
                  ? "whitespace-normal leading-5"
                  : "line-clamp-2",
              )}
              title={row.original.description}
            >
              {row.original.description}
            </div>
          ) : null}
        </div>
      ),
      size: showFullIssueText ? 380 : 320,
      minSize: 260,
      maxSize: 480,
      meta: {
        label: "Issue",
        align: showFullIssueText ? "left" : "center",
        textMode: showFullIssueText ? "full" : "wrap",
      },
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ row }) => (
        <IssuePriorityBadge priority={row.original.priority} />
      ),
      size: 130,
      meta: {
        label: "Priority",
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col items-center gap-1">
          <IssueStatusBadge status={row.original.status} />
          {row.original.reopenedAt ? <IssueReopenedBadge /> : null}
        </div>
      ),
      size: 140,
      meta: {
        label: "Status",
      },
    },
    {
      accessorKey: "assigneeName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Dev owner" />
      ),
      cell: ({ row }) => (
        <PersonCell
          value={getIssueAssignmentLabel(row.original)}
          fallback="Unassigned"
        />
      ),
      size: 180,
      meta: {
        label: "Dev owner",
      },
    },
    {
      accessorKey: "testerAssigneeName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Testing owner" />
      ),
      cell: ({ row }) => (
        <PersonCell
          value={getIssueTesterAssignmentLabel(row.original)}
          fallback="Unassigned"
        />
      ),
      size: 180,
      meta: {
        label: "Testing owner",
      },
    },
    {
      accessorKey: "comments",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Comments" />
      ),
      cell: ({ row }) => (
        <BulletTextCell
          value={row.original.comments}
          fallback={
            row.original.commentCount > 0
              ? `${row.original.commentCount} comments`
              : "-"
          }
        />
      ),
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Remark" />
      ),
      cell: ({ row }) => (
        <BulletTextCell value={row.original.remark} fallback="-" />
      ),
      enableSorting: false,
      size: 220,
      minSize: 160,
      maxSize: 320,
      meta: {
        label: "Remark",
        align: "left",
        textMode: "full",
      },
    },
    {
      accessorKey: "moduleName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Module" />
      ),
      cell: ({ row }) => (
        <PersonCell value={row.original.moduleName} fallback="Unassigned" />
      ),
      size: 180,
      meta: {
        label: "Module",
      },
    },
    {
      accessorKey: "componentName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Component" />
      ),
      cell: ({ row }) => (
        <PersonCell
          value={row.original.componentName}
          fallback="No component"
        />
      ),
      size: 190,
      meta: {
        label: "Component",
      },
    },
    {
      accessorKey: "testedByName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tested By" />
      ),
      cell: ({ row }) => (
        <PersonCell value={row.original.testedByName} fallback="Not tested" />
      ),
      size: 180,
      meta: {
        label: "Tested By",
      },
    },
    {
      accessorKey: "fixedDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fixed Date" />
      ),
      cell: ({ row }) => formatDate(row.original.fixedDate),
      size: 140,
      meta: {
        label: "Fixed Date",
      },
    },
    {
      accessorKey: "developmentStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Development" />
      ),
      cell: ({ row }) => (
        <StatusTextBadge
          value={row.original.developmentStatus}
          type="development"
        />
      ),
      size: 160,
      meta: {
        label: "Development",
      },
    },
    {
      accessorKey: "deploymentStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deployment" />
      ),
      cell: ({ row }) => (
        <StatusTextBadge
          value={row.original.deploymentStatus}
          type="deployment"
        />
      ),
      size: 150,
      meta: {
        label: "Deployment",
      },
    },
    {
      accessorKey: "epicTitle",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Epic" />
      ),
      cell: ({ row }) => (
        <PersonCell value={row.original.epicTitle} fallback="No epic" />
      ),
      size: 220,
      meta: {
        label: "Epic",
      },
    },
    {
      accessorKey: "sprintName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sprint" />
      ),
      cell: ({ row }) => (
        <PersonCell value={row.original.sprintName} fallback="Backlog" />
      ),
      size: 170,
      meta: {
        label: "Sprint",
      },
    },
    {
      accessorKey: "releaseName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Release" />
      ),
      cell: ({ row }) => (
        <PersonCell value={row.original.releaseName} fallback="No release" />
      ),
      size: 180,
      meta: {
        label: "Release",
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated At" />
      ),
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
      size: 180,
      meta: {
        label: "Updated At",
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const claimableRoles = getClaimableIssueRoles(
          row.original,
          currentMember ?? null,
        );

        return canEdit ? (
          <div className="flex items-center justify-center gap-1">
            {onClaim && claimableRoles.length > 0 ? (
              <div onClick={(event) => event.stopPropagation()}>
                <IssueClaimActions
                  roles={claimableRoles}
                  pending={claimActionPending}
                  onClaim={(role) => onClaim(row.original, role)}
                  className="flex items-center gap-1"
                />
              </div>
            ) : null}
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
        );
      },
      enableSorting: false,
      size: 220,
    },
  ];
}
