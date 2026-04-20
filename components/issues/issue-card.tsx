"use client";

import type { MouseEvent } from "react";

import { format } from "date-fns";
import {
  CalendarClock,
  CheckCheck,
  Layers3,
  MapPinned,
  PencilLine,
  Rocket,
  ShieldCheck,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";

import {
  getIssuePriorityCardAccentClassName,
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/issues/issue-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { IssueListItem } from "@/routes/issues/types";

interface IssueCardProps {
  issue: IssueListItem;
  canEdit?: boolean;
  actionPending?: boolean;
  onEdit?: (issue: IssueListItem) => void;
  onDelete?: (issue: IssueListItem) => void;
}

function stopCardClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

function getBooleanLabel(value: boolean) {
  return value ? "Yes" : "No";
}

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UserRound;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/55 px-3 py-2.5">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 line-clamp-2 text-sm text-foreground">{value}</div>
    </div>
  );
}

export function IssueCard({
  issue,
  canEdit = false,
  actionPending = false,
  onEdit,
  onDelete,
}: IssueCardProps) {
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent ${getIssuePriorityCardAccentClassName(issue.priority)}`}
      />

      <CardHeader className="gap-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 pr-4">
            <Badge variant="outline">#{issue.no}</Badge>
            <IssuePriorityBadge priority={issue.priority} />
            <IssueStatusBadge status={issue.status} />
          </div>

          {canEdit && onEdit && onDelete ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-xl"
                onClick={(event) => {
                  stopCardClick(event);
                  onEdit(issue);
                }}
                disabled={actionPending}
                aria-label={`Edit ${issue.title}`}
              >
                <PencilLine className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-xl text-destructive hover:text-destructive"
                onClick={(event) => {
                  stopCardClick(event);
                  onDelete(issue);
                }}
                disabled={actionPending}
                aria-label={`Delete ${issue.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <CardTitle
              className="line-clamp-2 text-lg leading-tight [overflow-wrap:anywhere]"
              title={issue.title}
            >
              {issue.title}
            </CardTitle>
            <p
              className="line-clamp-3 text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]"
              title={issue.description ?? "No description added yet."}
            >
              {issue.description ?? "No description added yet."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{issue.issueClassName ?? "Unclassified"}</Badge>
            <Badge variant="outline">{issue.moduleName ?? "General"}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2 mb-2">
        <DetailItem
          label="Assigned"
          value={issue.assignedToName ?? "Unassigned"}
          icon={UserRound}
        />
        <DetailItem
          label="Reviewed"
          value={issue.reviewedByName ?? "No reviewer"}
          icon={ShieldCheck}
        />
        <DetailItem
          label="Tested"
          value={issue.testedByName ?? "No tester"}
          icon={CheckCheck}
        />
        <DetailItem
          label="Navigation"
          value={issue.navigation ?? "No navigation"}
          icon={MapPinned}
        />
        <DetailItem
          label="Development"
          value={getBooleanLabel(issue.development)}
          icon={Wrench}
        />
        <DetailItem
          label="Deployement"
          value={getBooleanLabel(issue.deployment)}
          icon={Rocket}
        />
        <DetailItem
          label="Module"
          value={issue.moduleName ?? "General issue"}
          icon={Layers3}
        />
      </CardContent>

      <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" />
          Updated {format(new Date(issue.updatedAt), "MMM d, yyyy")}
        </div>
        <div className="truncate">Created by {issue.createdByName ?? "Unknown"}</div>
      </CardFooter>
    </>
  );
}
