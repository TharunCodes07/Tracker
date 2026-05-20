import type { KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IssueMediaSummary } from "@/components/issues/media/issue-media";
import {
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/issues/shared/issue-display";
import { ISSUE_TYPE_OPTIONS, type IssueListItem } from "@/routes/issues/types";

import { labelFor } from "./forms";

export function WorkflowIssueCard({
  issue,
  onOpen,
  selected = false,
  onSelectedChange,
  draggable = false,
}: {
  issue: IssueListItem;
  onOpen: (issue: IssueListItem) => void;
  selected?: boolean;
  onSelectedChange?: (issueId: string, selected: boolean) => void;
  draggable?: boolean;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.currentTarget !== event.target) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(issue);
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) {
          event.preventDefault();
          return;
        }

        event.dataTransfer.setData("text/plain", issue.id);
      }}
      onClick={() => onOpen(issue)}
      onKeyDown={handleKeyDown}
      className="w-full min-w-0 rounded-lg border border-border/70 bg-background p-3 text-left shadow-sm transition hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {onSelectedChange ? (
            <div onClick={(event) => event.stopPropagation()}>
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectedChange(issue.id, checked === true)}
                aria-label={`Select ${issue.key}`}
              />
            </div>
          ) : null}
          <span className="font-mono text-xs font-medium text-muted-foreground">
            {issue.key}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap justify-end gap-1">
          <IssuePriorityBadge priority={issue.priority} />
          <IssueStatusBadge status={issue.status} />
        </div>
      </div>
      <div className="mt-2 line-clamp-3 break-words text-sm font-medium leading-5 text-foreground">
        {issue.title}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{labelFor(ISSUE_TYPE_OPTIONS, issue.issueType)}</Badge>
        {issue.moduleName ? <Badge variant="outline">{issue.moduleName}</Badge> : null}
        {issue.componentName ? <Badge variant="outline">{issue.componentName}</Badge> : null}
        {issue.epicTitle ? <Badge variant="outline">{issue.epicTitle}</Badge> : null}
        {issue.sprintName ? <Badge variant="outline">{issue.sprintName}</Badge> : null}
        {issue.releaseName ? <Badge variant="outline">{issue.releaseName}</Badge> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{issue.assigneeName ?? "Unassigned"}</span>
        <span>{issue.testedByName ?? "Not tested"}</span>
        <span className="capitalize">Dev {issue.developmentStatus.replaceAll("_", " ")}</span>
        <span className="capitalize">Deploy {issue.deploymentStatus.replaceAll("_", " ")}</span>
      </div>
      {issue.media.length > 0 ? (
        <IssueMediaSummary issueId={issue.id} media={issue.media} className="mt-3 justify-start" compact />
      ) : null}
    </article>
  );
}
