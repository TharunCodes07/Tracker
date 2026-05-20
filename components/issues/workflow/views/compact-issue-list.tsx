import { IssueStatusBadge } from "@/components/issues/shared/issue-display";
import type { IssueListItem } from "@/routes/issues/types";

export function CompactIssueList({
  issues,
  onOpenIssue,
}: {
  issues: IssueListItem[];
  onOpenIssue: (issue: IssueListItem) => void;
}) {
  if (issues.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
        No matching issues in this slice.
      </div>
    );
  }

  return (
    <div className="mt-3 divide-y divide-border/70">
      {issues.map((issue) => (
        <button
          key={issue.id}
          type="button"
          onClick={() => onOpenIssue(issue)}
          className="flex w-full items-center gap-3 py-3 text-left hover:bg-muted/30"
        >
          <span className="w-20 shrink-0 font-mono text-xs font-medium text-muted-foreground">
            {issue.key}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{issue.title}</span>
          <IssueStatusBadge status={issue.status} />
        </button>
      ))}
    </div>
  );
}
