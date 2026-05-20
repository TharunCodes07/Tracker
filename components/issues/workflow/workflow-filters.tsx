import { useMemo, useState } from "react";

import { ChevronDown, Search, SlidersHorizontal, UserCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ACTIVE_ISSUE_STATUS_OPTIONS,
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
  type ProjectComponentListItem,
  type ProjectEpicListItem,
  type ProjectModuleListItem,
  type ProjectReleaseListItem,
  type ProjectSprintListItem,
} from "@/routes/issues/types";

import type { ProjectWorkflowView } from "./types";
import { EntityMultiFilterSelect, MultiFilterSelect } from "./ui";

export function WorkflowFilters({
  search,
  typeFilters,
  statusFilters,
  moduleFilters,
  componentFilters,
  epicFilters,
  sprintFilters,
  releaseFilters,
  priorityFilters,
  assignedToMe,
  modules,
  components,
  epics,
  sprints,
  releases,
  activeView,
  onSearchChange,
  onTypeFiltersChange,
  onStatusFiltersChange,
  onModuleFiltersChange,
  onComponentFiltersChange,
  onEpicFiltersChange,
  onSprintFiltersChange,
  onReleaseFiltersChange,
  onPriorityFiltersChange,
  onAssignedToMeChange,
  onClearFilters,
}: {
  search: string;
  typeFilters: IssueType[];
  statusFilters: IssueStatus[];
  moduleFilters: string[];
  componentFilters: string[];
  epicFilters: string[];
  sprintFilters: string[];
  releaseFilters: string[];
  priorityFilters: IssuePriority[];
  assignedToMe: boolean;
  modules: ProjectModuleListItem[];
  components: ProjectComponentListItem[];
  epics: ProjectEpicListItem[];
  sprints: ProjectSprintListItem[];
  releases: ProjectReleaseListItem[];
  activeView: ProjectWorkflowView;
  onSearchChange: (value: string) => void;
  onTypeFiltersChange: (values: IssueType[]) => void;
  onStatusFiltersChange: (values: IssueStatus[]) => void;
  onModuleFiltersChange: (values: string[]) => void;
  onComponentFiltersChange: (values: string[]) => void;
  onEpicFiltersChange: (values: string[]) => void;
  onSprintFiltersChange: (values: string[]) => void;
  onReleaseFiltersChange: (values: string[]) => void;
  onPriorityFiltersChange: (values: IssuePriority[]) => void;
  onAssignedToMeChange: (value: boolean) => void;
  onClearFilters: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    const normalizedSearch = search.trim();

    if (normalizedSearch) filters.push(`Search: ${normalizedSearch}`);
    pushOptionFilter(filters, "Type", ISSUE_TYPE_OPTIONS, typeFilters);
    pushOptionFilter(filters, "Status", ACTIVE_ISSUE_STATUS_OPTIONS, statusFilters);
    pushEntityFilter(filters, "Module", modules, moduleFilters);
    pushEntityFilter(filters, "Component", components, componentFilters);
    pushEntityFilter(filters, "Epic", epics, epicFilters);
    pushEntityFilter(filters, "Sprint", sprints, sprintFilters);
    pushEntityFilter(filters, "Release", releases, releaseFilters);
    pushOptionFilter(filters, "Priority", ISSUE_PRIORITY_OPTIONS, priorityFilters);
    if (assignedToMe) filters.push("Assigned to me");

    return filters;
  }, [
    assignedToMe,
    componentFilters,
    components,
    epicFilters,
    epics,
    moduleFilters,
    modules,
    priorityFilters,
    releaseFilters,
    releases,
    search,
    sprintFilters,
    sprints,
    statusFilters,
    typeFilters,
  ]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-9 rounded-full border-border/60 bg-background/80 pl-9 shadow-sm"
            placeholder={`Search ${getFilterScope(activeView).toLowerCase()}`}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:shrink-0">
          <Button
            type="button"
            variant={assignedToMe ? "secondary" : "outline"}
            onClick={() => onAssignedToMeChange(!assignedToMe)}
            className="rounded-full border-border/60 px-3 shadow-sm"
          >
            <UserCheck className="h-4 w-4" />
            Assigned to me
          </Button>
          <Button
            type="button"
            variant={filtersOpen ? "secondary" : "outline"}
            onClick={() => setFiltersOpen((open) => !open)}
            className="rounded-full border-border/60 px-3 shadow-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilters.length > 0 ? (
              <span className="ml-auto rounded-full bg-muted px-1.5 text-xs tabular-nums sm:ml-1">
                {activeFilters.length}
              </span>
            ) : null}
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 text-muted-foreground transition-transform sm:ml-1",
                filtersOpen && "rotate-180"
              )}
            />
          </Button>
          {activeFilters.length > 0 ? (
            <Button type="button" variant="ghost" onClick={onClearFilters} className="rounded-full">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="tracker-thin-scrollbar flex gap-2 overflow-x-auto pb-1">
          {activeFilters.map((filter) => (
            <span
              key={filter}
              className="inline-flex max-w-[16rem] shrink-0 items-center rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
            >
              <span className="truncate">{filter}</span>
            </span>
          ))}
        </div>
      ) : null}

      {filtersOpen ? (
        <div className="grid gap-2 border-t border-border/70 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <MultiFilterSelect
            values={typeFilters}
            onValuesChange={onTypeFiltersChange}
            label="Type"
            options={ISSUE_TYPE_OPTIONS}
          />
          <MultiFilterSelect
            values={statusFilters}
            onValuesChange={onStatusFiltersChange}
            label="Status"
            options={ACTIVE_ISSUE_STATUS_OPTIONS}
          />
          <EntityMultiFilterSelect
            values={moduleFilters}
            onValuesChange={onModuleFiltersChange}
            label="Module"
            items={modules}
          />
          <EntityMultiFilterSelect
            values={componentFilters}
            onValuesChange={onComponentFiltersChange}
            label="Component"
            items={components}
            disabled={components.length === 0}
          />
          <EntityMultiFilterSelect
            values={epicFilters}
            onValuesChange={onEpicFiltersChange}
            label="Epic"
            items={epics}
          />
          <EntityMultiFilterSelect
            values={sprintFilters}
            onValuesChange={onSprintFiltersChange}
            label="Sprint"
            items={sprints}
          />
          <EntityMultiFilterSelect
            values={releaseFilters}
            onValuesChange={onReleaseFiltersChange}
            label="Release"
            items={releases}
          />
          <MultiFilterSelect
            values={priorityFilters}
            onValuesChange={onPriorityFiltersChange}
            label="Priority"
            options={ISSUE_PRIORITY_OPTIONS}
          />
        </div>
      ) : null}
    </section>
  );
}

function pushOptionFilter<T extends string>(
  filters: string[],
  label: string,
  options: readonly { value: T; label: string }[],
  values: T[]
) {
  if (values.length === 0) return;

  if (values.length === 1) {
    filters.push(`${label}: ${options.find((option) => option.value === values[0])?.label ?? values[0]}`);
    return;
  }

  filters.push(`${label}: ${values.length} selected`);
}

function pushEntityFilter(
  filters: string[],
  label: string,
  items: { id: string; name: string }[],
  values: string[]
) {
  if (values.length === 0) return;

  if (values.length === 1) {
    filters.push(`${label}: ${items.find((item) => item.id === values[0])?.name ?? values[0]}`);
    return;
  }

  filters.push(`${label}: ${values.length} selected`);
}

function getFilterScope(view: ProjectWorkflowView) {
  switch (view) {
    case "board":
      return "Workflow, assignment, and grouping";
    case "backlog":
      return "Planning and unscheduled work";
    case "modules":
      return "Module and component slices";
    case "releases":
      return "Release membership";
    case "epics":
      return "Epic membership";
    case "sprints":
      return "Sprint planning";
    default:
      return "Issue search and metadata";
  }
}
