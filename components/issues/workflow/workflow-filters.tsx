import { useMemo, useState } from "react";

import {
  ChevronDown,
  Search,
  SlidersHorizontal,
  UserCheck,
  X,
} from "lucide-react";

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

type ActiveFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

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
    const filters: ActiveFilter[] = [];
    const normalizedSearch = search.trim();

    if (normalizedSearch) {
      filters.push({
        key: "search",
        label: `Search: ${normalizedSearch}`,
        onRemove: () => onSearchChange(""),
      });
    }
    pushOptionFilters(filters, "type", "Type", ISSUE_TYPE_OPTIONS, typeFilters, onTypeFiltersChange);
    pushOptionFilters(
      filters,
      "status",
      "Status",
      ACTIVE_ISSUE_STATUS_OPTIONS,
      statusFilters,
      onStatusFiltersChange
    );
    pushEntityFilters(filters, "module", "Module", modules, moduleFilters, onModuleFiltersChange);
    pushEntityFilters(
      filters,
      "component",
      "Component",
      components,
      componentFilters,
      onComponentFiltersChange
    );
    pushEntityFilters(filters, "epic", "Epic", epics, epicFilters, onEpicFiltersChange);
    pushEntityFilters(filters, "sprint", "Sprint", sprints, sprintFilters, onSprintFiltersChange);
    pushEntityFilters(filters, "release", "Release", releases, releaseFilters, onReleaseFiltersChange);
    pushOptionFilters(
      filters,
      "priority",
      "Priority",
      ISSUE_PRIORITY_OPTIONS,
      priorityFilters,
      onPriorityFiltersChange
    );
    if (assignedToMe) {
      filters.push({
        key: "assigned-to-me",
        label: "Assigned to me",
        onRemove: () => onAssignedToMeChange(false),
      });
    }

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
    onAssignedToMeChange,
    onComponentFiltersChange,
    onEpicFiltersChange,
    onModuleFiltersChange,
    onPriorityFiltersChange,
    onReleaseFiltersChange,
    onSearchChange,
    onSprintFiltersChange,
    onStatusFiltersChange,
    onTypeFiltersChange,
  ]);
  const showActiveFilterRow = filtersOpen || activeFilters.length > 0;

  function renderFilterControls(triggerClassName?: string, contentClassName?: string) {
    return [
      <MultiFilterSelect
        key="type"
        values={typeFilters}
        onValuesChange={onTypeFiltersChange}
        label="Type"
        options={ISSUE_TYPE_OPTIONS}
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
      />,
      <MultiFilterSelect
        key="status"
        values={statusFilters}
        onValuesChange={onStatusFiltersChange}
        label="Status"
        options={ACTIVE_ISSUE_STATUS_OPTIONS}
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
      />,
      <EntityMultiFilterSelect
        key="module"
        values={moduleFilters}
        onValuesChange={onModuleFiltersChange}
        label="Module"
        items={modules}
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
      />,
      <EntityMultiFilterSelect
        key="component"
        values={componentFilters}
        onValuesChange={onComponentFiltersChange}
        label="Component"
        items={components}
        disabled={components.length === 0}
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
      />,
      <EntityMultiFilterSelect
        key="epic"
        values={epicFilters}
        onValuesChange={onEpicFiltersChange}
        label="Epic"
        items={epics}
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
      />,
      <EntityMultiFilterSelect
        key="sprint"
        values={sprintFilters}
        onValuesChange={onSprintFiltersChange}
        label="Sprint"
        items={sprints}
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
      />,
      <EntityMultiFilterSelect
        key="release"
        values={releaseFilters}
        onValuesChange={onReleaseFiltersChange}
        label="Release"
        items={releases}
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
      />,
      <MultiFilterSelect
        key="priority"
        values={priorityFilters}
        onValuesChange={onPriorityFiltersChange}
        label="Priority"
        options={ISSUE_PRIORITY_OPTIONS}
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
      />,
    ];
  }

  return (
    <section className="space-y-2">
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
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 text-muted-foreground transition-transform sm:ml-1",
                filtersOpen && "rotate-180"
              )}
            />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          showActiveFilterRow ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex min-h-8 items-start gap-2">
            <div className="tracker-thin-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
              {activeFilters.length > 0 ? (
                activeFilters.map((filter) => (
                  <span
                    key={filter.key}
                    className="inline-flex max-w-[16rem] shrink-0 items-center gap-1 rounded-full border border-border/70 bg-muted/40 py-1 pl-2 pr-1 text-xs text-muted-foreground"
                  >
                    <span className="truncate">{filter.label}</span>
                    <button
                      type="button"
                      onClick={filter.onRemove}
                      className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      aria-label={`Remove ${filter.label} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              ) : (
                <span className="inline-flex h-7 items-center text-xs text-muted-foreground">
                  No active filters
                </span>
              )}
            </div>
            {activeFilters.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onClearFilters}
                className="h-7 shrink-0 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
                aria-label="Clear filters"
              >
                <X className="h-3.5 w-3.5" />
                Clear filter
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          filtersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "rounded-xl border border-border/70 bg-muted/20 p-3 shadow-sm transition-transform duration-300 ease-out",
              filtersOpen ? "translate-y-0" : "-translate-y-1"
            )}
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2">
              {renderFilterControls(
                "h-9 w-full rounded-full border-border/70 bg-background px-3 shadow-none transition-colors",
                "rounded-xl p-1.5"
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function pushOptionFilters<T extends string>(
  filters: ActiveFilter[],
  keyPrefix: string,
  label: string,
  options: readonly { value: T; label: string }[],
  values: T[],
  onValuesChange: (values: T[]) => void
) {
  if (values.length === 0) return;

  for (const value of values) {
    filters.push({
      key: `${keyPrefix}:${value}`,
      label: `${label}: ${options.find((option) => option.value === value)?.label ?? value}`,
      onRemove: () => onValuesChange(values.filter((currentValue) => currentValue !== value)),
    });
  }
}

function pushEntityFilters(
  filters: ActiveFilter[],
  keyPrefix: string,
  label: string,
  items: { id: string; name: string }[],
  values: string[],
  onValuesChange: (values: string[]) => void
) {
  if (values.length === 0) return;

  for (const value of values) {
    filters.push({
      key: `${keyPrefix}:${value}`,
      label: `${label}: ${items.find((item) => item.id === value)?.name ?? value}`,
      onRemove: () => onValuesChange(values.filter((currentValue) => currentValue !== value)),
    });
  }
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
