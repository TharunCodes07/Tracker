"use client";

import { AlertTriangle, LayoutGrid, Search, Shapes, Table2, UserRound } from "lucide-react";

import { MultiSelectFilterMenu } from "@/components/issues/multi-select-filter-menu";
import { ActiveFilterChip } from "@/components/issues/issue-workspace-parts";
import type {
  IssueWorkspaceFilterChip,
  IssueWorkspaceFilterOption,
} from "@/components/issues/helpers/project-issues-workspace-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  IssueAssigneeFilterValue,
  IssuePriority,
  IssueResolutionFilter,
} from "@/routes/issues/types";
import { cn } from "@/lib/utils";

interface IssueFiltersProps {
  variant?: "panel" | "toolbar";
  className?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  issueTypeFilterOptions: IssueWorkspaceFilterOption[];
  selectedIssueTypeFilters: string[];
  onIssueTypeFilterToggle: (value: string) => void;
  onClearIssueTypeFilters: () => void;
  priorityFilterOptions: IssueWorkspaceFilterOption[];
  selectedPriorityFilters: IssuePriority[];
  onPriorityFilterToggle: (value: string) => void;
  onClearPriorityFilters: () => void;
  assigneeFilterOptions: IssueWorkspaceFilterOption[];
  selectedAssigneeFilters: IssueAssigneeFilterValue[];
  onAssigneeFilterToggle: (value: string) => void;
  onClearAssigneeFilters: () => void;
  showIssueCount?: boolean;
  showResolutionFilter?: boolean;
  resolutionFilter: IssueResolutionFilter;
  onResolutionFilterChange: (value: IssueResolutionFilter) => void;
  totalIssues: number;
  openIssueCount: number;
  resolvedIssueCount: number;
  pendingTestIssueCount: number;
  reopenedIssueCount: number;
  activeFilterChips: IssueWorkspaceFilterChip[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  visibleIssueCount: number;
  isUpdating: boolean;
  isSearchPending: boolean;
}

interface IssueResolutionFilterControlProps {
  className?: string;
  showCounts?: boolean;
  resolutionFilter: IssueResolutionFilter;
  onResolutionFilterChange: (value: IssueResolutionFilter) => void;
  totalIssues: number;
  openIssueCount: number;
  resolvedIssueCount: number;
  pendingTestIssueCount: number;
  reopenedIssueCount: number;
  showViewModeToggle?: boolean;
  viewMode?: "grid" | "table";
  onViewModeChange?: (value: "grid" | "table") => void;
}

export function IssueResolutionFilterControl({
  className,
  showCounts = true,
  resolutionFilter,
  onResolutionFilterChange,
  totalIssues,
  openIssueCount,
  resolvedIssueCount,
  pendingTestIssueCount,
  reopenedIssueCount,
  showViewModeToggle = false,
  viewMode,
  onViewModeChange,
}: IssueResolutionFilterControlProps) {
  const options: Array<{
    value: IssueResolutionFilter;
    label: string;
    count: number;
  }> = [
    { value: "all", label: "All", count: totalIssues },
    { value: "open", label: "Open", count: openIssueCount },
    { value: "resolved_pending_test", label: "Review", count: pendingTestIssueCount },
    { value: "reopened", label: "Reopened", count: reopenedIssueCount },
    { value: "resolved", label: "Resolved", count: resolvedIssueCount },
  ];

  return (
    <div
      className={cn(
        "flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur",
        className
      )}
    >
      <div className="inline-flex max-w-full items-center overflow-x-auto rounded-lg bg-muted/40 p-0.5">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={resolutionFilter === option.value ? "secondary" : "ghost"}
            size="sm"
            className="h-7 rounded-md px-2.5"
            onClick={() => onResolutionFilterChange(option.value)}
          >
            {option.label}
            {showCounts ? (
              <span className="text-xs text-muted-foreground">{option.count}</span>
            ) : null}
          </Button>
        ))}
      </div>

      {showViewModeToggle && onViewModeChange ? (
        <div className="ml-auto inline-flex items-center rounded-lg border border-border/60 bg-background p-0.5">
          <Button
            type="button"
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 rounded-md px-2.5"
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </Button>
          <Button
            type="button"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 rounded-md px-2.5"
            onClick={() => onViewModeChange("table")}
          >
            <Table2 className="h-3.5 w-3.5" />
            Table
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function IssueFilters({
  variant = "panel",
  className,
  searchValue,
  onSearchChange,
  issueTypeFilterOptions,
  selectedIssueTypeFilters,
  onIssueTypeFilterToggle,
  onClearIssueTypeFilters,
  priorityFilterOptions,
  selectedPriorityFilters,
  onPriorityFilterToggle,
  onClearPriorityFilters,
  assigneeFilterOptions,
  selectedAssigneeFilters,
  onAssigneeFilterToggle,
  onClearAssigneeFilters,
  showIssueCount = true,
  showResolutionFilter = true,
  resolutionFilter,
  onResolutionFilterChange,
  totalIssues,
  openIssueCount,
  resolvedIssueCount,
  pendingTestIssueCount,
  reopenedIssueCount,
  activeFilterChips,
  hasActiveFilters,
  onClearFilters,
  visibleIssueCount,
  isUpdating,
  isSearchPending,
}: IssueFiltersProps) {
  const showToolbarStatusRow =
    activeFilterChips.length > 0 || hasActiveFilters || showIssueCount || isUpdating || isSearchPending;

  if (variant === "toolbar") {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-2", className)}>
          <div className="relative min-w-48 flex-[1_1_22rem]">
            <div className="pointer-events-none absolute inset-y-1 left-1 z-10 flex w-8 items-center justify-center rounded-xl bg-background/40 backdrop-blur-sm">
              <Search className="h-4 w-4 text-foreground/50" />
            </div>
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search issues"
              className="h-9 rounded-2xl border-border/60 bg-background/80 pl-10 shadow-sm backdrop-blur"
            />
          </div>

          <MultiSelectFilterMenu
            label="Issue Types"
            icon={Shapes}
            options={issueTypeFilterOptions}
            selectedValues={selectedIssueTypeFilters}
            onToggle={onIssueTypeFilterToggle}
            onClear={onClearIssueTypeFilters}
            className="flex-1 sm:flex-initial"
          />
          <MultiSelectFilterMenu
            label="Priority"
            icon={AlertTriangle}
            options={priorityFilterOptions}
            selectedValues={selectedPriorityFilters}
            onToggle={onPriorityFilterToggle}
            onClear={onClearPriorityFilters}
            className="flex-1 sm:flex-initial"
          />
          <MultiSelectFilterMenu
            label="Assignee"
            icon={UserRound}
            options={assigneeFilterOptions}
            selectedValues={selectedAssigneeFilters}
            onToggle={onAssigneeFilterToggle}
            onClear={onClearAssigneeFilters}
            className="flex-1 sm:flex-initial"
          />

          {showResolutionFilter ? (
            <IssueResolutionFilterControl
              showCounts={false}
              resolutionFilter={resolutionFilter}
              onResolutionFilterChange={onResolutionFilterChange}
              totalIssues={totalIssues}
              openIssueCount={openIssueCount}
              resolvedIssueCount={resolvedIssueCount}
              pendingTestIssueCount={pendingTestIssueCount}
              reopenedIssueCount={reopenedIssueCount}
            />
          ) : null}
        </div>

        {showToolbarStatusRow ? (
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {activeFilterChips.map((filterChip) => (
              <ActiveFilterChip
                key={filterChip.key}
                label={filterChip.label}
                onRemove={filterChip.onRemove}
              />
            ))}

            {showIssueCount ? (
              <Badge variant="outline" className="w-fit">
                {visibleIssueCount} of {totalIssues} issues
              </Badge>
            ) : null}

            {isUpdating || isSearchPending ? (
              <span className="text-xs text-muted-foreground">
                {isSearchPending ? "Waiting for search..." : "Updating issues..."}
              </span>
            ) : null}

            {hasActiveFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className={cn("rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-sm", className)}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="relative 2xl:max-w-xl 2xl:flex-1">
            <div className="pointer-events-none absolute inset-y-1 left-1 z-10 flex w-8 items-center justify-center rounded-xl bg-background/40 backdrop-blur-sm">
              <Search className="h-4 w-4 text-foreground/50" />
            </div>
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by issue, number, navigation, assignee, or comments"
              className="h-10 rounded-2xl border-border/60 bg-background/80 pl-10 shadow-sm backdrop-blur"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <MultiSelectFilterMenu
              label="Types"
              icon={Shapes}
              options={issueTypeFilterOptions}
              selectedValues={selectedIssueTypeFilters}
              onToggle={onIssueTypeFilterToggle}
              onClear={onClearIssueTypeFilters}
            />
            <MultiSelectFilterMenu
              label="Priority"
              icon={AlertTriangle}
              options={priorityFilterOptions}
              selectedValues={selectedPriorityFilters}
              onToggle={onPriorityFilterToggle}
              onClear={onClearPriorityFilters}
            />
            <MultiSelectFilterMenu
              label="Assignee"
              icon={UserRound}
              options={assigneeFilterOptions}
              selectedValues={selectedAssigneeFilters}
              onToggle={onAssigneeFilterToggle}
              onClear={onClearAssigneeFilters}
            />

          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {showResolutionFilter ? (
            <IssueResolutionFilterControl
              className="w-full sm:w-auto"
              resolutionFilter={resolutionFilter}
              onResolutionFilterChange={onResolutionFilterChange}
              totalIssues={totalIssues}
              openIssueCount={openIssueCount}
              resolvedIssueCount={resolvedIssueCount}
              pendingTestIssueCount={pendingTestIssueCount}
              reopenedIssueCount={reopenedIssueCount}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {activeFilterChips.map((filterChip) => (
              <ActiveFilterChip
                key={filterChip.key}
                label={filterChip.label}
                onRemove={filterChip.onRemove}
              />
            ))}

            {hasActiveFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : null}

            {showIssueCount ? (
              <Badge variant="outline" className="w-fit">
                {visibleIssueCount} of {totalIssues} issues
              </Badge>
            ) : null}
          </div>
        </div>

        {isUpdating || isSearchPending ? (
          <div className="text-xs text-muted-foreground">
            {isSearchPending ? "Waiting for search..." : "Updating issues..."}
          </div>
        ) : null}
      </div>
    </section>
  );
}
