"use client";

import { Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IssueListPagination } from "@/routes/issues/types";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

export function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-foreground shadow-sm transition-colors hover:bg-accent"
    >
      {label}
      <X className="h-3 w-3" />
    </button>
  );
}

export function IssuesPaginationControls({
  pageIndex,
  pageSize,
  pagination,
  disabled = false,
  onPageIndexChange,
  onPageSizeChange,
}: {
  pageIndex: number;
  pageSize: number;
  pagination: IssueListPagination;
  disabled?: boolean;
  onPageIndexChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const start = pagination.totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const end =
    pagination.totalItems === 0 ? 0 : Math.min(pagination.totalItems, (pageIndex + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3 rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {pagination.totalItems === 0 ? (
          "No issues to display"
        ) : (
          <>
            Showing <span className="font-medium text-foreground">{start}-{end}</span> of{" "}
            <span className="font-medium text-foreground">{pagination.totalItems}</span> issues
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageIndexChange(0)}
          disabled={disabled || !pagination.hasPreviousPage}
        >
          First
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageIndexChange(Math.max(0, pageIndex - 1))}
          disabled={disabled || !pagination.hasPreviousPage}
        >
          Previous
        </Button>
        <div className="min-w-[6rem] text-center text-sm tabular-nums text-muted-foreground">
          {pagination.page} / {pagination.totalPages}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageIndexChange(pageIndex + 1)}
          disabled={disabled || !pagination.hasNextPage}
        >
          Next
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageIndexChange(Math.max(0, pagination.totalPages - 1))}
          disabled={disabled || !pagination.hasNextPage}
        >
          Last
        </Button>

        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[110px]">
            <SelectValue>{pageSize} / page</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function IssuesEmptyState({
  hasAnyIssues,
  canEditProject,
  onCreateIssue,
  loadError,
  onRetry,
}: {
  hasAnyIssues: boolean;
  canEditProject: boolean;
  onCreateIssue: () => void;
  loadError?: string | null;
  onRetry?: () => void;
}) {
  const title =
    loadError && !hasAnyIssues
      ? "Could not load issues"
      : hasAnyIssues
        ? "No matching issues"
        : "No issues yet";
  const description = loadError && !hasAnyIssues
    ? loadError
    : hasAnyIssues
      ? "Adjust the current filters to broaden the list, or switch views if you want to scan the workspace differently."
      : "Create the first issue for this project once the modules and issue types are ready.";

  return (
    <div className="rounded-[28px] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-500">
        <Tag className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {loadError && !hasAnyIssues && onRetry ? (
        <div className="mt-5 flex justify-center">
          <Button type="button" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : !hasAnyIssues && canEditProject ? (
        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            onClick={onCreateIssue}
            className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90"
          >
            Create your first issue
          </Button>
        </div>
      ) : null}
    </div>
  );
}
