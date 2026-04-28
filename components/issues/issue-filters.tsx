"use client";

import { AlertTriangle, Search, Shapes, UserRound } from "lucide-react";

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
  resolutionFilter: IssueResolutionFilter;
  onResolutionFilterChange: (value: IssueResolutionFilter) => void;
  totalIssues: number;
  openIssueCount: number;
  resolvedIssueCount: number;
  pendingTestIssueCount: number;
  activeFilterChips: IssueWorkspaceFilterChip[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  visibleIssueCount: number;
  isUpdating: boolean;
  isSearchPending: boolean;
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
  resolutionFilter,
  onResolutionFilterChange,
  totalIssues,
  openIssueCount,
  resolvedIssueCount,
  pendingTestIssueCount,
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

          <div className="inline-flex items-center rounded-2xl border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur">
            <Button
              type="button"
              variant={resolutionFilter === "all" ? "secondary" : "ghost"}
              className="h-8 rounded-xl px-2.5"
              onClick={() => onResolutionFilterChange("all")}
            >
              All
            </Button>
            <Button
              type="button"
              variant={resolutionFilter === "open" ? "secondary" : "ghost"}
              className="h-8 rounded-xl px-2.5"
              onClick={() => onResolutionFilterChange("open")}
            >
              Open
            </Button>
            <Button
              type="button"
              variant={resolutionFilter === "resolved" ? "secondary" : "ghost"}
              className="h-8 rounded-xl px-2.5"
              onClick={() => onResolutionFilterChange("resolved")}
            >
              Resolved
            </Button>
            <Button
              type="button"
              variant={resolutionFilter === "resolved_pending_test" ? "secondary" : "ghost"}
              className="h-8 rounded-xl px-2.5"
              onClick={() => onResolutionFilterChange("resolved_pending_test")}
            >
              Awaiting test
            </Button>
          </div>
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
          <div className="inline-flex w-full items-center rounded-2xl border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur sm:w-auto">
            <Button
              type="button"
              variant={resolutionFilter === "all" ? "secondary" : "ghost"}
              className="flex-1 rounded-xl sm:flex-none"
              onClick={() => onResolutionFilterChange("all")}
            >
              All
              <span className="text-xs text-muted-foreground">{totalIssues}</span>
            </Button>
            <Button
              type="button"
              variant={resolutionFilter === "open" ? "secondary" : "ghost"}
              className="flex-1 rounded-xl sm:flex-none"
              onClick={() => onResolutionFilterChange("open")}
            >
              Open
              <span className="text-xs text-muted-foreground">{openIssueCount}</span>
            </Button>
            <Button
              type="button"
              variant={resolutionFilter === "resolved" ? "secondary" : "ghost"}
              className="flex-1 rounded-xl sm:flex-none"
              onClick={() => onResolutionFilterChange("resolved")}
            >
              Resolved
              <span className="text-xs text-muted-foreground">{resolvedIssueCount}</span>
            </Button>
            <Button
              type="button"
              variant={resolutionFilter === "resolved_pending_test" ? "secondary" : "ghost"}
              className="flex-1 rounded-xl sm:flex-none"
              onClick={() => onResolutionFilterChange("resolved_pending_test")}
            >
              Awaiting test
              <span className="text-xs text-muted-foreground">{pendingTestIssueCount}</span>
            </Button>
          </div>

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
