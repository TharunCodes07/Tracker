import { PencilLine, Trash2 } from "lucide-react";

import {
  getIssuePriorityCardAccentClassName,
  IssuePriorityBadge,
  IssueStatusBadge,
} from "@/components/issues/shared/issue-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ISSUE_TYPE_OPTIONS, type IssueListItem } from "@/routes/issues/types";

import { labelFor } from "../forms";
import { IssueDetailContent } from "../views/issue-detail-content";

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "w-[94vw] overflow-y-auto border-l border-border/70 bg-background p-0 sm:max-w-3xl",
          selectedIssue && getIssuePriorityCardAccentClassName(selectedIssue.priority)
        )}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{selectedIssue ? selectedIssue.key : "Issue detail"}</SheetTitle>
        </SheetHeader>
        <div className="sticky top-0 z-10 border-b border-border/70 bg-background/95 px-5 py-4 backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/80 to-cyan-400/80" />
          {selectedIssue ? (
            <div className="pr-2 sm:pr-4">
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
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <h2 className="min-w-0 break-words text-lg font-semibold leading-tight tracking-tight [overflow-wrap:anywhere]">
                  {selectedIssue.title}
                </h2>
                {canEdit ? (
                  <div className="flex shrink-0 items-center gap-1.5">
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
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        {selectedIssue ? (
          <div className="px-5 pb-8">
            <IssueDetailContent
              issue={selectedIssue}
              variant="sheet"
              mediaActionPending={mediaActionPending}
              onRemoveMedia={
                canEdit ? (mediaId) => onRemoveMedia(selectedIssue, mediaId) : undefined
              }
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
