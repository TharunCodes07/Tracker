import type { ComponentType } from "react";

import {
  CalendarDays,
  ClipboardList,
  Component,
  Folder,
  GitBranch,
  ListChecks,
  PackageCheck,
  PencilLine,
  TestTube2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { IssueMediaAttachmentList } from "@/components/issues/media/issue-media";
import {
  getIssuePriorityCardAccentClassName,
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/issues/shared/issue-display";
import {
  getIssueAssignmentLabel,
  getIssueTesterAssignmentLabel,
  splitBulletItems,
} from "@/components/issues/shared/issue-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ISSUE_TYPE_OPTIONS, type IssueListItem } from "@/routes/issues/types";

import { labelFor } from "../forms";

export function IssueSheet({
  open,
  selectedIssue,
  canEdit,
  mediaActionPending,
  onOpenChange,
  onEditIssue,
  onDeleteIssue,
  onRemoveMedia,
}: {
  open: boolean;
  selectedIssue: IssueListItem | null;
  canEdit: boolean;
  mediaActionPending: boolean;
  onOpenChange: (open: boolean) => void;
  onEditIssue: (issue: IssueListItem) => void;
  onDeleteIssue: (issue: IssueListItem) => void;
  onRemoveMedia: (issue: IssueListItem, mediaId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex h-[min(900px,92svh)] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-border/70 bg-background p-0 shadow-2xl sm:max-w-6xl",
          selectedIssue &&
            getIssuePriorityCardAccentClassName(selectedIssue.priority),
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {selectedIssue ? selectedIssue.key : "Issue detail"}
          </DialogTitle>
        </DialogHeader>

        {selectedIssue ? (
          <>
            <div className="relative border-b border-border/70 bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/80 to-cyan-400/80" />
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {selectedIssue.key}
                  </Badge>
                  <Badge variant="outline">
                    {labelFor(ISSUE_TYPE_OPTIONS, selectedIssue.issueType)}
                  </Badge>
                  <IssueStatusBadge status={selectedIssue.status} />
                  <IssuePriorityBadge priority={selectedIssue.priority} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <h2 className="min-w-0 break-words text-xl font-semibold leading-tight tracking-tight [overflow-wrap:anywhere]">
                    {selectedIssue.title}
                  </h2>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {canEdit ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          className="rounded-full text-muted-foreground hover:text-foreground"
                          onClick={() => onEditIssue(selectedIssue)}
                          aria-label={`Edit ${selectedIssue.title}`}
                        >
                          <PencilLine className="size-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          className="rounded-full text-destructive hover:text-destructive"
                          onClick={() => onDeleteIssue(selectedIssue)}
                          aria-label={`Delete ${selectedIssue.title}`}
                        >
                          <Trash2 className="size-5" />
                        </Button>
                      </>
                    ) : null}
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        className="rounded-full text-muted-foreground hover:text-foreground"
                        aria-label="Close issue detail"
                      >
                        <X className="size-5" />
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 sm:px-6">
              <IssueOperationsDetail
                issue={selectedIssue}
                mediaActionPending={mediaActionPending}
                onRemoveMedia={
                  canEdit
                    ? (mediaId) => onRemoveMedia(selectedIssue, mediaId)
                    : undefined
                }
              />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function IssueOperationsDetail({
  issue,
  mediaActionPending,
  onRemoveMedia,
}: {
  issue: IssueListItem;
  mediaActionPending: boolean;
  onRemoveMedia?: (mediaId: string) => void;
}) {
  return (
    <div className="space-y-4 py-5">
      <div className="grid gap-2 md:grid-cols-4">
        <SummaryTile label="Status" value={issue.status.replaceAll("_", " ")} />
        <SummaryTile label="Priority" value={issue.priority} />
        <SummaryTile label="Developer" value={getIssueAssignmentLabel(issue)} />
        <SummaryTile label="Comments" value={`${issue.commentCount}`} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="min-w-0 space-y-4">
          <TextSection
            title="Description"
            value={issue.description || "No description provided."}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <BulletTextSection
              title="Comments"
              value={issue.comments}
              fallback="No comments."
              subtle
            />
            <BulletTextSection
              title="Remark"
              value={issue.remark}
              fallback="No remark."
              subtle
            />
          </div>
          <MetaPanel
            title="Delivery"
            items={deliveryItems(issue)}
            columns="two"
          />
          <MediaSection
            issue={issue}
            mediaActionPending={mediaActionPending}
            onRemoveMedia={onRemoveMedia}
          />
        </main>

        <aside className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <StatusPanel issue={issue} />
          <MetaPanel title="Planning" items={planningItems(issue)} dense />
          <MetaPanel title="People" items={peopleItems(issue)} dense />
        </aside>
      </div>
    </div>
  );
}

function StatusPanel({ issue }: { issue: IssueListItem }) {
  return (
    <section className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="mb-3 text-xs font-medium uppercase text-muted-foreground">
        Current state
      </div>
      <div className="flex flex-wrap gap-2">
        <IssueStatusBadge status={issue.status} />
        <IssuePriorityBadge priority={issue.priority} />
        <Badge variant="outline">
          {labelFor(ISSUE_TYPE_OPTIONS, issue.issueType)}
        </Badge>
      </div>
    </section>
  );
}

function TextSection({
  title,
  value,
  subtle,
}: {
  title: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-border/70 bg-background p-4">
      <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        {title}
      </div>
      <p
        className={cn(
          "whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]",
          subtle && "text-muted-foreground",
        )}
      >
        {value}
      </p>
    </section>
  );
}

function BulletTextSection({
  title,
  value,
  fallback,
  subtle,
}: {
  title: string;
  value: string | null;
  fallback: string;
  subtle?: boolean;
}) {
  const items = splitBulletItems(value);

  return (
    <section className="min-w-0 rounded-xl border border-border/70 bg-background p-4">
      <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        {title}
      </div>
      {items.length > 0 ? (
        <ul
          className={cn(
            "space-y-1.5 text-sm leading-6",
            subtle && "text-muted-foreground",
          )}
        >
          {items.map((item, index) => (
            <li
              key={index}
              className="flex min-w-0 gap-2 [overflow-wrap:anywhere]"
            >
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="min-w-0 break-words">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={cn("text-sm leading-6", subtle && "text-muted-foreground")}
        >
          {fallback}
        </p>
      )}
    </section>
  );
}

function MediaSection({
  issue,
  mediaActionPending,
  onRemoveMedia,
}: {
  issue: IssueListItem;
  mediaActionPending: boolean;
  onRemoveMedia?: (mediaId: string) => void;
}) {
  if (issue.media.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
        No media attached.
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-xl border border-border/70 bg-background p-4">
      <div className="mb-3 text-xs font-medium uppercase text-muted-foreground">
        Media
      </div>
      <IssueMediaAttachmentList
        issueId={issue.id}
        media={issue.media}
        canRemove={Boolean(onRemoveMedia)}
        disabled={mediaActionPending}
        onRemove={onRemoveMedia}
      />
    </section>
  );
}

function MetaPanel({
  title,
  items,
  dense,
  columns = "one",
}: {
  title: string;
  items: Array<{
    label: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
  }>;
  dense?: boolean;
  columns?: "one" | "two";
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-background p-3">
      <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        {title}
      </div>
      <dl
        className={cn(
          "grid divide-y divide-border/60",
          dense && "text-xs",
          columns === "two" && "gap-x-4 sm:grid-cols-2 sm:divide-y-0",
        )}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex min-w-0 gap-2 border-border/60 py-2",
              dense && "py-1.5",
              columns === "two" && "sm:border-b",
            )}
          >
            <item.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="truncate font-medium capitalize">{item.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold capitalize">
        {value}
      </div>
    </div>
  );
}

function planningItems(issue: IssueListItem) {
  return [
    { label: "Module", value: issue.moduleName ?? "Unassigned", icon: Folder },
    {
      label: "Component",
      value: issue.componentName ?? "No component",
      icon: Component,
    },
    { label: "Epic", value: issue.epicTitle ?? "None", icon: GitBranch },
    {
      label: "Sprint",
      value: issue.sprintName ?? "Backlog",
      icon: CalendarDays,
    },
    {
      label: "Release",
      value: issue.releaseName ?? "None",
      icon: PackageCheck,
    },
  ];
}

function peopleItems(issue: IssueListItem) {
  return [
    {
      label: "Developer",
      value: getIssueAssignmentLabel(issue),
      icon: UserRound,
    },
    {
      label: "Tester",
      value: getIssueTesterAssignmentLabel(issue),
      icon: TestTube2,
    },
    {
      label: "Reporter",
      value: issue.reporterName ?? "Unknown",
      icon: UserRound,
    },
  ];
}

function deliveryItems(issue: IssueListItem) {
  return [
    {
      label: "Fixed date",
      value: issue.fixedDate?.slice(0, 10) ?? "Not fixed",
      icon: CalendarDays,
    },
    {
      label: "Development",
      value: issue.developmentStatus.replaceAll("_", " "),
      icon: ClipboardList,
    },
    {
      label: "Deployment",
      value: issue.deploymentStatus.replaceAll("_", " "),
      icon: PackageCheck,
    },
    {
      label: "Comment count",
      value: `${issue.commentCount} comments`,
      icon: ListChecks,
    },
  ];
}
