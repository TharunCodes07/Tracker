import type { ComponentType } from "react";

import {
  CalendarDays,
  ClipboardList,
  Component,
  Folder,
  GitBranch,
  MessageSquareText,
  PackageCheck,
  Pencil,
  TestTube2,
  UserRound,
} from "lucide-react";

import {
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/issues/shared/issue-display";
import {
  getIssueAssignmentLabel,
  getIssueTesterAssignmentLabel,
  splitBulletItems,
} from "@/components/issues/shared/issue-text";
import { IssueMediaAttachmentList } from "@/components/issues/media/issue-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ISSUE_TYPE_OPTIONS, type IssueListItem } from "@/routes/issues/types";

import { labelFor } from "../forms";

export function IssueDetailContent({
  issue,
  onEdit,
  onRemoveMedia,
  mediaActionPending = false,
  variant = "page",
}: {
  issue: IssueListItem;
  onEdit?: (issue: IssueListItem) => void;
  onRemoveMedia?: (mediaId: string) => void;
  mediaActionPending?: boolean;
  variant?: "page" | "sheet";
}) {
  return (
    <div
      className={cn(
        "space-y-6 py-4",
        variant === "sheet" &&
          "lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)] lg:gap-6 lg:space-y-0"
      )}
    >
      <div className="min-w-0 space-y-6">
        {variant === "page" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {issue.key}
                  </Badge>
                  <Badge variant="outline">{labelFor(ISSUE_TYPE_OPTIONS, issue.issueType)}</Badge>
                  <IssueStatusBadge status={issue.status} />
                  <IssuePriorityBadge priority={issue.priority} />
                </div>
                <h2 className="break-words text-xl font-semibold leading-tight tracking-tight [overflow-wrap:anywhere]">
                  {issue.title}
                </h2>
              </div>

              {onEdit ? (
                <Button type="button" variant="outline" onClick={() => onEdit(issue)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              ) : null}
            </div>

            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
              {issue.description || "No description provided."}
            </p>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
            {issue.description || "No description provided."}
          </p>
        )}

        <IssueMediaAttachmentList
          issueId={issue.id}
          media={issue.media}
          canRemove={Boolean(onRemoveMedia)}
          disabled={mediaActionPending}
          onRemove={onRemoveMedia}
        />
      </div>

      <div className="min-w-0 space-y-6">
        <dl
          className={cn(
            "grid gap-x-8 gap-y-0 border-y border-border/70",
            variant === "sheet" ? "md:grid-cols-1" : "md:grid-cols-2"
          )}
        >
          <DetailItem icon={Folder} label="Module" value={issue.moduleName ?? "Unassigned"} />
          <DetailItem icon={Component} label="Component" value={issue.componentName ?? "No component"} />
          <DetailItem icon={GitBranch} label="Epic" value={issue.epicTitle ?? "None"} />
          <DetailItem icon={CalendarDays} label="Sprint" value={issue.sprintName ?? "Backlog"} />
          <DetailItem icon={PackageCheck} label="Release" value={issue.releaseName ?? "None"} />
          <DetailItem icon={UserRound} label="Development owner" value={getIssueAssignmentLabel(issue)} />
          <DetailItem icon={TestTube2} label="Testing owner" value={getIssueTesterAssignmentLabel(issue)} />
          <DetailItem icon={UserRound} label="Reporter" value={issue.reporterName ?? "Unknown"} />
          <DetailItem icon={TestTube2} label="Tested by" value={issue.testedByName ?? "Not tested"} />
          <DetailItem icon={CalendarDays} label="Fixed date" value={issue.fixedDate?.slice(0, 10) ?? "Not fixed"} />
          <DetailItem
            icon={ClipboardList}
            label="Development"
            value={issue.developmentStatus.replaceAll("_", " ")}
          />
          <DetailItem
            icon={PackageCheck}
            label="Deployment"
            value={issue.deploymentStatus.replaceAll("_", " ")}
          />
          <DetailItem icon={MessageSquareText} label="Comment count" value={`${issue.commentCount} comments`} />
        </dl>

        {issue.comments ? (
          <BulletTextBlock label="Comments" value={issue.comments} />
        ) : null}

        {issue.remark ? (
          <BulletTextBlock label="Remark" value={issue.remark} />
        ) : null}
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-b border-border/60 py-3 last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words text-sm font-medium capitalize [overflow-wrap:anywhere]">
          {value}
        </dd>
      </div>
    </div>
  );
}

function BulletTextBlock({ label, value }: { label: string; value: string }) {
  const items = splitBulletItems(value);

  return (
    <div className="border-l-2 border-emerald-500/60 pl-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex min-w-0 gap-2 [overflow-wrap:anywhere]">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
