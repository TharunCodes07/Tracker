import { useEffect, useMemo, useState } from "react";

import {
  Boxes,
  CalendarDays,
  CheckSquare,
  File,
  Folder,
  Loader2,
  Search,
  Square,
} from "lucide-react";
import { toast } from "sonner";

import { IssueStatusBadge } from "@/components/issues/shared/issue-display";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  IssueListItem,
  IssueStatus,
  ProjectIssuesListResponse,
  ProjectIssuesWorkspaceResponse,
} from "@/routes/issues/types";
import { ISSUE_STATUS_OPTIONS } from "@/routes/issues/types";

import { requestJson } from "../http";
import { MultiFilterSelect } from "../ui";

type AssignmentMode = "sprint" | "module";

const DEFAULT_ASSIGNMENT_STATUS_FILTERS = ISSUE_STATUS_OPTIONS.filter(
  (option) => option.value !== "fixed",
).map((option) => option.value);

export interface PlanningAssignmentTarget {
  kind: "release" | "sprint" | "epic";
  id: string;
  name: string;
}

function isIssueAlreadyInTarget(
  issue: IssueListItem,
  target: PlanningAssignmentTarget,
) {
  if (target.kind === "release") return issue.releaseId === target.id;
  if (target.kind === "sprint") return issue.sprintId === target.id;
  return issue.epicId === target.id;
}

export function PlanningAssignmentDialog({
  open,
  pending,
  teamId,
  projectId,
  workspace,
  target,
  onOpenChange,
  onAssign,
}: {
  open: boolean;
  pending: boolean;
  teamId: string;
  projectId: string;
  workspace: ProjectIssuesWorkspaceResponse;
  target: PlanningAssignmentTarget;
  onOpenChange: (open: boolean) => void;
  onAssign: (target: PlanningAssignmentTarget, issues: IssueListItem[]) => void;
}) {
  const canChooseSprintMode = target.kind === "release";
  const [mode, setMode] = useState<AssignmentMode>(
    canChooseSprintMode ? "sprint" : "module",
  );
  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>(
    [],
  );
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<
    IssueStatus[]
  >(DEFAULT_ASSIGNMENT_STATUS_FILTERS);
  const [candidateIssues, setCandidateIssues] = useState<IssueListItem[]>([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [issueSearch, setIssueSearch] = useState("");
  const [loadingIssues, setLoadingIssues] = useState(false);

  const selectedModuleIdSet = useMemo(
    () => new Set(selectedModuleIds),
    [selectedModuleIds],
  );
  const selectedComponentIdSet = useMemo(
    () => new Set(selectedComponentIds),
    [selectedComponentIds],
  );
  const selectedIssueIdSet = useMemo(
    () => new Set(selectedIssueIds),
    [selectedIssueIds],
  );
  const scopeKey = `${mode}:${selectedSprintIds.join(",")}:${selectedModuleIds.join(",")}:${selectedComponentIds.join(",")}:${selectedStatusFilters.join(",")}`;
  const hasScope =
    mode === "sprint"
      ? selectedSprintIds.length > 0
      : selectedModuleIds.length > 0 || selectedComponentIds.length > 0;

  useEffect(() => {
    if (!open || !hasScope || selectedStatusFilters.length === 0) {
      return;
    }

    let isActive = true;

    async function loadIssues() {
      setLoadingIssues(true);

      try {
        const searchParams = new URLSearchParams({
          assignment: "true",
          page: "1",
          pageSize: "2147483647",
          sortBy: "serialNumber",
          sortDirection: "asc",
        });

        selectedStatusFilters.forEach((status) =>
          searchParams.append("statusFilter", status),
        );

        if (mode === "sprint") {
          selectedSprintIds.forEach((sprintId) =>
            searchParams.append("sprintFilter", sprintId),
          );
        }

        const data = await requestJson<ProjectIssuesListResponse>(
          `/api/teams/${teamId}/projects/${projectId}/issues?${searchParams.toString()}`,
          { cache: "no-store" },
        );

        if (!isActive) return;

        const scopedIssues =
          mode === "module"
            ? data.issues.filter(
                (issue) =>
                  (issue.moduleId && selectedModuleIdSet.has(issue.moduleId)) ||
                  (issue.componentId &&
                    selectedComponentIdSet.has(issue.componentId)),
              )
            : data.issues;
        const assignableIssues = scopedIssues.filter(
          (issue) => !isIssueAlreadyInTarget(issue, target),
        );

        setCandidateIssues(assignableIssues);
        setSelectedIssueIds((currentIssueIds) => {
          const currentIssueIdSet = new Set(currentIssueIds);
          const assignableIssueIds = assignableIssues.map((issue) => issue.id);
          const nextIssueIds = assignableIssueIds.filter((issueId) =>
            currentIssueIdSet.has(issueId),
          );

          return currentIssueIds.length === 0
            ? assignableIssueIds
            : nextIssueIds;
        });
      } catch (error) {
        if (isActive) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load assignable issues.",
          );
        }
      } finally {
        if (isActive) {
          setLoadingIssues(false);
        }
      }
    }

    void loadIssues();

    return () => {
      isActive = false;
    };
  }, [
    hasScope,
    mode,
    open,
    projectId,
    selectedStatusFilters,
    scopeKey,
    selectedComponentIds.length,
    selectedComponentIdSet,
    selectedModuleIds.length,
    selectedModuleIdSet,
    selectedSprintIds,
    target,
    teamId,
  ]);

  const scopedCandidateIssues = useMemo(
    () => (hasScope && selectedStatusFilters.length > 0 ? candidateIssues : []),
    [candidateIssues, hasScope, selectedStatusFilters.length],
  );
  const showIssueLoading =
    loadingIssues && hasScope && selectedStatusFilters.length > 0;
  const filteredCandidateIssues = useMemo(() => {
    const normalizedSearch = issueSearch.trim().toLowerCase();

    if (!normalizedSearch) return scopedCandidateIssues;

    return scopedCandidateIssues.filter((issue) =>
      [
        issue.key,
        issue.title,
        issue.moduleName,
        issue.componentName,
        issue.assigneeName,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch)),
    );
  }, [issueSearch, scopedCandidateIssues]);
  const selectedIssues = useMemo(
    () =>
      scopedCandidateIssues.filter((issue) => selectedIssueIdSet.has(issue.id)),
    [scopedCandidateIssues, selectedIssueIdSet],
  );

  function toggleValue(values: string[], value: string) {
    return values.includes(value)
      ? values.filter((currentValue) => currentValue !== value)
      : [...values, value];
  }

  function handleModuleToggle(moduleId: string) {
    setSelectedModuleIds((currentValues) =>
      toggleValue(currentValues, moduleId),
    );
  }

  function handleComponentToggle(componentId: string) {
    setSelectedComponentIds((currentValues) =>
      toggleValue(currentValues, componentId),
    );
  }

  function handleIssueToggle(issueId: string) {
    setSelectedIssueIds((currentValues) => toggleValue(currentValues, issueId));
  }

  function selectAllVisibleIssues() {
    const visibleIssueIds = new Set(
      filteredCandidateIssues.map((issue) => issue.id),
    );

    setSelectedIssueIds((currentValues) =>
      Array.from(new Set([...currentValues, ...visibleIssueIds])),
    );
  }

  function clearVisibleIssues() {
    const visibleIssueIds = new Set(
      filteredCandidateIssues.map((issue) => issue.id),
    );

    setSelectedIssueIds((currentValues) =>
      currentValues.filter((issueId) => !visibleIssueIds.has(issueId)),
    );
  }

  const emptyIssueMessage = !hasScope
    ? `Choose a ${mode === "sprint" ? "sprint" : "module or component"} to show issues.`
    : selectedStatusFilters.length === 0
      ? "Choose at least one status to show assignable issues."
      : "No issues match this scope and status filter, or they are already assigned here.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden p-0 sm:max-w-[1180px]">
        <DialogHeader className="border-b border-border/70 p-5 pr-12">
          <DialogTitle>Assign issues to {target.name}</DialogTitle>
          <DialogDescription>
            Issues already assigned here are hidden. Done is excluded by
            default.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[560px] overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-border/70 p-4 lg:border-b-0 lg:border-r">
            {canChooseSprintMode ? (
              <div className="mb-4 inline-flex rounded-lg border border-border/70 bg-background p-1">
                <Button
                  type="button"
                  variant={mode === "sprint" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMode("sprint")}
                >
                  <CalendarDays className="h-4 w-4" />
                  Sprint
                </Button>
                <Button
                  type="button"
                  variant={mode === "module" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMode("module")}
                >
                  <Boxes className="h-4 w-4" />
                  Module
                </Button>
              </div>
            ) : null}

            {mode === "sprint" ? (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Sprints
                </div>
                {workspace.sprints.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                    No sprints are available in this project.
                  </p>
                ) : (
                  workspace.sprints.map((sprint) => (
                    <label
                      key={sprint.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedSprintIds.includes(sprint.id)}
                        onCheckedChange={() =>
                          setSelectedSprintIds((currentValues) =>
                            toggleValue(currentValues, sprint.id),
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {sprint.name}
                        </span>
                        <span className="block text-xs capitalize text-muted-foreground">
                          {sprint.status}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Modules and components
                </div>
                {workspace.modules.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                    No modules are available in this project.
                  </p>
                ) : (
                  workspace.modules.map((moduleItem) => {
                    const childComponents = workspace.components.filter(
                      (component) => component.moduleId === moduleItem.id,
                    );

                    return (
                      <div
                        key={moduleItem.id}
                        className="rounded-lg border border-border/70 p-2"
                      >
                        <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                          <Checkbox
                            checked={selectedModuleIds.includes(moduleItem.id)}
                            onCheckedChange={() =>
                              handleModuleToggle(moduleItem.id)
                            }
                          />
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {moduleItem.name}
                          </span>
                        </label>
                        <div className="ml-9 mt-1 space-y-1 border-l border-border/70 pl-3">
                          {childComponents.length === 0 ? (
                            <div className="py-1 text-xs text-muted-foreground">
                              No components
                            </div>
                          ) : (
                            childComponents.map((component) => (
                              <label
                                key={component.id}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={
                                    selectedModuleIds.includes(moduleItem.id) ||
                                    selectedComponentIds.includes(component.id)
                                  }
                                  onCheckedChange={() =>
                                    handleComponentToggle(component.id)
                                  }
                                  disabled={selectedModuleIds.includes(
                                    moduleItem.id,
                                  )}
                                />
                                <File className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="min-w-0 flex-1 truncate text-sm">
                                  {component.name}
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="flex flex-col gap-3 border-b border-border/70 p-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={issueSearch}
                  onChange={(event) => setIssueSearch(event.target.value)}
                  className="pl-8"
                  placeholder="Search assignable issues"
                />
              </div>
              <div className="w-full xl:w-56">
                <MultiFilterSelect
                  values={selectedStatusFilters}
                  onValuesChange={setSelectedStatusFilters}
                  label="Status"
                  options={ISSUE_STATUS_OPTIONS}
                  emptyLabel="None"
                  showAllOption={false}
                />
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllVisibleIssues}
                  disabled={filteredCandidateIssues.length === 0}
                >
                  <CheckSquare className="h-4 w-4" />
                  Select visible
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearVisibleIssues}
                  disabled={filteredCandidateIssues.length === 0}
                >
                  <Square className="h-4 w-4" />
                  Clear visible
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {showIssueLoading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading issues
                </div>
              ) : filteredCandidateIssues.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                  {emptyIssueMessage}
                </div>
              ) : (
                <div className="divide-y divide-border/70 rounded-lg border border-border/70">
                  {filteredCandidateIssues.map((issue) => (
                    <label
                      key={issue.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/40",
                        selectedIssueIdSet.has(issue.id) && "bg-muted/30",
                      )}
                    >
                      <Checkbox
                        checked={selectedIssueIdSet.has(issue.id)}
                        onCheckedChange={() => handleIssueToggle(issue.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-medium text-muted-foreground">
                            {issue.key}
                          </span>
                          <span className="min-w-0 truncate text-sm font-medium">
                            {issue.title}
                          </span>
                          <IssueStatusBadge status={issue.status} />
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {issue.moduleName ?? "No module"}
                          {issue.componentName
                            ? ` / ${issue.componentName}`
                            : ""}
                          {issue.assigneeName ? ` - ${issue.assigneeName}` : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="mx-0 mb-0 items-center justify-between px-5 py-4 sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedIssues.length} of {scopedCandidateIssues.length} issues
            selected
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => onAssign(target, selectedIssues)}
              disabled={pending || selectedIssues.length === 0}
            >
              {pending ? "Assigning..." : "Assign selected"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
