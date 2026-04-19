"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import {
  getIssuePriorityFilterAccentClassName,
  getIssuePriorityTextClassName,
} from "@/components/issues/issue-display";
import type { IssueFormValues } from "@/components/issues/issue-dialog";
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORTING,
  PROJECT_ISSUES_VIEW_STORAGE_KEY,
  SEARCH_DEBOUNCE_MS,
  buildIssuesRequestUrl,
  createEmptyIssueForm,
  createIssueFormFromIssue,
  createIssuePayload,
  normalizeSorting,
  requestJson,
  sortIssueClasses,
  sortModules,
  togglePrioritySelection,
  toggleStringSelection,
  type IssueWorkspaceFilterChip,
  type IssueWorkspaceFilterOption,
} from "@/components/issues/helpers/project-issues-workspace-utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePersistedViewMode } from "@/hooks/use-persisted-view-mode";
import type { ProjectListItem } from "@/routes/projects/types";
import {
  GENERAL_MODULE_FILTER_VALUE,
  ISSUE_PRIORITY_OPTIONS,
  UNCLASSIFIED_ISSUE_TYPE_FILTER_VALUE,
  type CreateIssueClassInput,
  type CreateProjectModuleInput,
  type IssueAssigneeFilterValue,
  type IssueClassListItem,
  type IssueClassMutationResponse,
  type IssueDeleteResponse,
  type IssueListItem,
  type IssueListPagination,
  type IssueListSummary,
  type IssueMutationResponse,
  type IssuePriority,
  type IssueResolutionFilter,
  type IssueModuleCount,
  type ProjectIssuesListResponse,
  type ProjectIssuesWorkspaceResponse,
  type ProjectModuleListItem,
  type ProjectModuleMutationResponse,
} from "@/routes/issues/types";
import type { TeamMemberListItem, TeamListItem } from "@/routes/teams/types";

const EMPTY_PAGINATION: IssueListPagination = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};
const EMPTY_SUMMARY: IssueListSummary = {
  totalIssues: 0,
  openIssueCount: 0,
  resolvedIssueCount: 0,
  criticalIssueCount: 0,
  hasUnclassifiedIssues: false,
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useProjectIssuesWorkspace() {
  const params = useParams<{ teamId?: string | string[]; projectId?: string | string[] }>();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const hasRequiredParams = Boolean(teamId && projectId);
  const hasAttemptedIssuesLoadRef = useRef(false);

  const [team, setTeam] = useState<TeamListItem | null>(null);
  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [members, setMembers] = useState<TeamMemberListItem[]>([]);
  const [modules, setModules] = useState<ProjectModuleListItem[]>([]);
  const [issueClasses, setIssueClasses] = useState<IssueClassListItem[]>([]);
  const [issues, setIssues] = useState<IssueListItem[]>([]);
  const [pagination, setPagination] = useState<IssueListPagination>(EMPTY_PAGINATION);
  const [summary, setSummary] = useState<IssueListSummary>(EMPTY_SUMMARY);
  const [moduleCounts, setModuleCounts] = useState<IssueModuleCount[]>([]);
  const [isMetadataLoading, setIsMetadataLoading] = useState(hasRequiredParams);
  const [isIssuesLoading, setIsIssuesLoading] = useState(hasRequiredParams);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { viewMode, setViewMode } = usePersistedViewMode(
    PROJECT_ISSUES_VIEW_STORAGE_KEY,
    "table"
  );
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebouncedValue(searchValue.trim(), SEARCH_DEBOUNCE_MS);
  const [resolutionFilter, setResolutionFilter] = useState<IssueResolutionFilter>("all");
  const [selectedModuleFilters, setSelectedModuleFilters] = useState<string[]>([]);
  const [selectedIssueTypeFilters, setSelectedIssueTypeFilters] = useState<string[]>([]);
  const [selectedPriorityFilters, setSelectedPriorityFilters] = useState<IssuePriority[]>([]);
  const [selectedAssigneeFilters, setSelectedAssigneeFilters] = useState<
    IssueAssigneeFilterValue[]
  >([]);
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [reloadIssuesKey, setReloadIssuesKey] = useState(0);
  const [isModuleSidebarCollapsed, setIsModuleSidebarCollapsed] = useState(false);

  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");

  const [isIssueClassOpen, setIsIssueClassOpen] = useState(false);
  const [issueClassName, setIssueClassName] = useState("");
  const [issueClassDescription, setIssueClassDescription] = useState("");

  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState<IssueFormValues>(createEmptyIssueForm());
  const [editingIssue, setEditingIssue] = useState<IssueListItem | null>(null);
  const [issueToDelete, setIssueToDelete] = useState<IssueListItem | null>(null);

  const [isCreatingModule, startCreateModuleTransition] = useTransition();
  const [isCreatingIssueClass, startCreateIssueClassTransition] = useTransition();
  const [isCreatingIssue, startCreateIssueTransition] = useTransition();
  const [isUpdatingIssue, startUpdateIssueTransition] = useTransition();
  const [isDeletingIssue, startDeleteIssueTransition] = useTransition();

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();
    const activeTeamId = teamId;
    const activeProjectId = projectId;
    let workspaceLoaded = false;

    if (!activeTeamId || !activeProjectId) {
      return () => {
        isActive = false;
      };
    }

    async function loadWorkspace() {
      hasAttemptedIssuesLoadRef.current = false;
      setIsMetadataLoading(true);
      setIsIssuesLoading(true);
      setLoadError(null);

      try {
        const data = await requestJson<ProjectIssuesWorkspaceResponse>(
          `/api/teams/${activeTeamId}/projects/${activeProjectId}/issues/workspace`,
          {
            cache: "no-store",
            signal: abortController.signal,
          }
        );

        if (!isActive) {
          return;
        }

        setTeam(data.team);
        setProject(data.project);
        setMembers(data.members);
        setModules(sortModules(data.modules));
        setIssueClasses(sortIssueClasses(data.issueClasses));
        workspaceLoaded = true;
        setIssueForm((currentIssueForm) => {
          if (
            data.issueClasses.some(
              (issueClass) => issueClass.id === currentIssueForm.issueClassId
            )
          ) {
            return currentIssueForm;
          }

          return createEmptyIssueForm(data.issueClasses[0]?.id ?? "");
        });
      } catch (error) {
        if (!isActive || isAbortError(error)) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Could not load the project issue workspace.";

        setTeam(null);
        setProject(null);
        setMembers([]);
        setModules([]);
        setIssueClasses([]);
        setIssues([]);
        setPagination((currentPagination) => ({
          ...EMPTY_PAGINATION,
          pageSize: currentPagination.pageSize,
        }));
        setSummary(EMPTY_SUMMARY);
        setModuleCounts([]);
        setLoadError(message);
        toast.error(message);
      } finally {
        if (isActive) {
          setIsMetadataLoading(false);

          if (!workspaceLoaded) {
            setIsIssuesLoading(false);
          }
        }
      }
    }

    void loadWorkspace();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [projectId, teamId]);

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();
    const activeTeamId = teamId;
    const activeProjectId = projectId;

    if (!activeTeamId || !activeProjectId || isMetadataLoading || !team || !project) {
      return () => {
        isActive = false;
      };
    }

    const resolvedTeamId = activeTeamId;
    const resolvedProjectId = activeProjectId;

    async function loadIssues() {
      if (hasAttemptedIssuesLoadRef.current) {
        setIsRefreshing(true);
      } else {
        setIsIssuesLoading(true);
      }

      try {
        const data = await requestJson<ProjectIssuesListResponse>(
          buildIssuesRequestUrl({
            teamId: resolvedTeamId,
            projectId: resolvedProjectId,
            pageIndex,
            pageSize,
            search: debouncedSearchValue,
            resolutionFilter,
            moduleFilters: selectedModuleFilters,
            issueTypeFilters: selectedIssueTypeFilters,
            priorityFilters: selectedPriorityFilters,
            assigneeFilters: selectedAssigneeFilters,
            sorting,
          }),
          {
            cache: "no-store",
            signal: abortController.signal,
          }
        );

        if (!isActive) {
          return;
        }

        setIssues(data.issues);
        setPagination(data.pagination);
        setSummary(data.summary);
        setModuleCounts(data.moduleCounts);
        setLoadError(null);
      } catch (error) {
        if (!isActive || isAbortError(error)) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Could not load the project issues.";

        setLoadError(message);

        if (!hasAttemptedIssuesLoadRef.current) {
          setIssues([]);
          setPagination({ ...EMPTY_PAGINATION, pageSize });
          setSummary(EMPTY_SUMMARY);
          setModuleCounts([]);
        }

        toast.error(message);
      } finally {
        if (isActive) {
          hasAttemptedIssuesLoadRef.current = true;
          setIsIssuesLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    void loadIssues();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [
    debouncedSearchValue,
    isMetadataLoading,
    pageIndex,
    pageSize,
    project,
    projectId,
    reloadIssuesKey,
    resolutionFilter,
    selectedAssigneeFilters,
    selectedIssueTypeFilters,
    selectedModuleFilters,
    selectedPriorityFilters,
    sorting,
    team,
    teamId,
  ]);

  const currentUser = useMemo(
    () => members.find((member) => member.isCurrentUser) ?? null,
    [members]
  );
  const currentUserId = currentUser?.userId ?? null;
  const canEditProject = team?.canEdit ?? false;
  const currentPageIndex = Math.max(0, pagination.page - 1);
  const isGridView = viewMode === "grid";
  const hasAnyIssues = summary.totalIssues > 0;
  const hasVisibleIssues = issues.length > 0;
  const isLoading = isMetadataLoading || isIssuesLoading;
  const isSearchPending = searchValue.trim() !== debouncedSearchValue;
  const isEditingIssue = Boolean(editingIssue);
  const isIssueMutationPending = isCreatingIssue || isUpdatingIssue;
  const areIssueActionsPending = isUpdatingIssue || isDeletingIssue;
  const hasActiveFilters =
    searchValue.trim().length > 0 ||
    resolutionFilter !== "all" ||
    selectedModuleFilters.length > 0 ||
    selectedIssueTypeFilters.length > 0 ||
    selectedPriorityFilters.length > 0 ||
    selectedAssigneeFilters.length > 0;

  const moduleFilterOptions = useMemo<IssueWorkspaceFilterOption[]>(
    () => [
      {
        value: GENERAL_MODULE_FILTER_VALUE,
        label: "General issue",
        description: "Issues not tied to any specific module.",
      },
      ...modules.map((module) => ({
        value: module.id,
        label: module.name,
        description: module.description,
      })),
    ],
    [modules]
  );

  const issueTypeFilterOptions = useMemo<IssueWorkspaceFilterOption[]>(
    () => [
      ...issueClasses.map((issueClass) => ({
        value: issueClass.id,
        label: issueClass.name,
        description: issueClass.description,
      })),
      ...(summary.hasUnclassifiedIssues
        ? [
            {
              value: UNCLASSIFIED_ISSUE_TYPE_FILTER_VALUE,
              label: "Unclassified",
              description: "Issues without a type.",
            },
          ]
        : []),
    ],
    [issueClasses, summary.hasUnclassifiedIssues]
  );

  const priorityFilterOptions = useMemo<IssueWorkspaceFilterOption[]>(
    () =>
      ISSUE_PRIORITY_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        accentClassName: getIssuePriorityFilterAccentClassName(option.value),
        labelClassName: `font-medium ${getIssuePriorityTextClassName(option.value)}`,
      })),
    []
  );

  const assigneeFilterOptions: IssueWorkspaceFilterOption[] = [
    ...(currentUserId
      ? [
          {
            value: "current-user",
            label: "Assigned to me",
            description: currentUser?.name
              ? `Only issues assigned to ${currentUser.name}.`
              : "Only issues assigned to you.",
          },
        ]
      : []),
    {
      value: "unassigned",
      label: "Unassigned",
      description: "Only issues without an assignee.",
    },
  ];

  const moduleIssueCountById = useMemo(() => {
    const counts = new Map<string, number>();

    for (const moduleCount of moduleCounts) {
      counts.set(moduleCount.moduleId ?? GENERAL_MODULE_FILTER_VALUE, moduleCount.issueCount);
    }

    return counts;
  }, [moduleCounts]);

  const activeFilterChips = useMemo<IssueWorkspaceFilterChip[]>(
    () => [
      ...selectedModuleFilters.map((value) => {
        const option = moduleFilterOptions.find((item) => item.value === value);

        return {
          key: `module-${value}`,
          label: option?.label ?? value,
          onRemove: () => {
            setSelectedModuleFilters((currentValues) =>
              currentValues.filter((item) => item !== value)
            );
            setPageIndex(0);
          },
        };
      }),
      ...selectedIssueTypeFilters.map((value) => {
        const option = issueTypeFilterOptions.find((item) => item.value === value);

        return {
          key: `issue-type-${value}`,
          label: option?.label ?? value,
          onRemove: () => {
            setSelectedIssueTypeFilters((currentValues) =>
              currentValues.filter((item) => item !== value)
            );
            setPageIndex(0);
          },
        };
      }),
      ...selectedPriorityFilters.map((value) => {
        const option = priorityFilterOptions.find((item) => item.value === value);

        return {
          key: `priority-${value}`,
          label: option?.label ?? value,
          onRemove: () => {
            setSelectedPriorityFilters((currentValues) =>
              currentValues.filter((item) => item !== value)
            );
            setPageIndex(0);
          },
        };
      }),
      ...selectedAssigneeFilters.map((value) => ({
        key: `assignee-${value}`,
        label: value === "current-user" ? "Assigned to me" : "Unassigned",
        onRemove: () => {
          setSelectedAssigneeFilters((currentValues) =>
            currentValues.filter((item) => item !== value)
          );
          setPageIndex(0);
        },
      })),
    ],
    [
      issueTypeFilterOptions,
      moduleFilterOptions,
      priorityFilterOptions,
      selectedAssigneeFilters,
      selectedIssueTypeFilters,
      selectedModuleFilters,
      selectedPriorityFilters,
    ]
  );

  function refreshIssues(nextPageIndex?: number) {
    if (typeof nextPageIndex === "number" && nextPageIndex !== pageIndex) {
      setPageIndex(nextPageIndex);
      return;
    }

    setReloadIssuesKey((currentValue) => currentValue + 1);
  }

  function closeModuleDialog(open: boolean) {
    setIsModuleOpen(open);

    if (!open) {
      setModuleName("");
      setModuleDescription("");
    }
  }

  function openModuleDialog() {
    setIsModuleOpen(true);
  }

  function closeIssueClassDialog(open: boolean) {
    setIsIssueClassOpen(open);

    if (!open) {
      setIssueClassName("");
      setIssueClassDescription("");
    }
  }

  function openIssueClassDialog() {
    setIsIssueClassOpen(true);
  }

  function closeIssueDialog(open: boolean) {
    setIsIssueOpen(open);

    if (!open) {
      setEditingIssue(null);
      setIssueForm(createEmptyIssueForm(issueClasses[0]?.id ?? ""));
    }
  }

  function openCreateIssueDialog() {
    setEditingIssue(null);
    setIssueForm(createEmptyIssueForm(issueForm.issueClassId || issueClasses[0]?.id || ""));
    setIsIssueOpen(true);
  }

  function openEditIssueDialog(issue: IssueListItem) {
    setEditingIssue(issue);
    setIssueForm(createIssueFormFromIssue(issue, issueClasses[0]?.id ?? ""));
    setIsIssueOpen(true);
  }

  function handleIssueFormChange(patch: Partial<IssueFormValues>) {
    setIssueForm((currentIssueForm) => ({
      ...currentIssueForm,
      ...patch,
    }));
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
    setPageIndex(0);
  }

  function handleResolutionFilterChange(nextValue: IssueResolutionFilter) {
    setResolutionFilter(nextValue);
    setPageIndex(0);
  }

  function handleModuleFilterToggle(value: string) {
    setSelectedModuleFilters((currentValues) => toggleStringSelection(currentValues, value));
    setPageIndex(0);
  }

  function handleIssueTypeFilterToggle(value: string) {
    setSelectedIssueTypeFilters((currentValues) => toggleStringSelection(currentValues, value));
    setPageIndex(0);
  }

  function handlePriorityFilterToggle(value: string) {
    setSelectedPriorityFilters((currentValues) =>
      togglePrioritySelection(currentValues, value as IssuePriority)
    );
    setPageIndex(0);
  }

  function handleAssigneeFilterToggle(value: string) {
    setSelectedAssigneeFilters((currentValues) =>
      toggleStringSelection(currentValues, value) as IssueAssigneeFilterValue[]
    );
    setPageIndex(0);
  }

  function handleClearModuleFilters() {
    setSelectedModuleFilters([]);
    setPageIndex(0);
  }

  function handleClearIssueTypeFilters() {
    setSelectedIssueTypeFilters([]);
    setPageIndex(0);
  }

  function handleClearPriorityFilters() {
    setSelectedPriorityFilters([]);
    setPageIndex(0);
  }

  function handleClearAssigneeFilters() {
    setSelectedAssigneeFilters([]);
    setPageIndex(0);
  }

  function handleClearFilters() {
    setSearchValue("");
    setResolutionFilter("all");
    setSelectedModuleFilters([]);
    setSelectedIssueTypeFilters([]);
    setSelectedPriorityFilters([]);
    setSelectedAssigneeFilters([]);
    setPageIndex(0);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPageIndex(0);
  }

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextSorting = normalizeSorting(
      typeof updater === "function" ? updater(sorting) : updater
    );

    setSorting(nextSorting);
    setPageIndex(0);
  };

  function handleCreateModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!team || !project) {
      return;
    }

    const payload: CreateProjectModuleInput = {
      name: moduleName,
      description: moduleDescription,
    };

    startCreateModuleTransition(async () => {
      try {
        const data = await requestJson<ProjectModuleMutationResponse>(
          `/api/teams/${team.id}/projects/${project.id}/modules`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

        setModules((currentModules) => sortModules([...currentModules, data.module]));
        closeModuleDialog(false);
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the module.");
      }
    });
  }

  function handleCreateIssueClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!team || !project) {
      return;
    }

    const payload: CreateIssueClassInput = {
      name: issueClassName,
      description: issueClassDescription,
    };

    startCreateIssueClassTransition(async () => {
      try {
        const data = await requestJson<IssueClassMutationResponse>(
          `/api/teams/${team.id}/projects/${project.id}/issue-classes`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

        setIssueClasses((currentIssueClasses) =>
          sortIssueClasses([...currentIssueClasses, data.issueClass])
        );
        setIssueForm((currentIssueForm) =>
          currentIssueForm.issueClassId
            ? currentIssueForm
            : {
                ...currentIssueForm,
                issueClassId: data.issueClass.id,
              }
        );
        closeIssueClassDialog(false);
        toast.success(data.message);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not create the issue type."
        );
      }
    });
  }

  function handleCreateIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!team || !project) {
      return;
    }

    if (!issueForm.issueClassId) {
      toast.error("Choose an issue type first.");
      return;
    }

    startCreateIssueTransition(async () => {
      try {
        const data = await requestJson<IssueMutationResponse>(
          `/api/teams/${team.id}/projects/${project.id}/issues`,
          {
            method: "POST",
            body: JSON.stringify(createIssuePayload(issueForm)),
          }
        );

        closeIssueDialog(false);
        refreshIssues(0);
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the issue.");
      }
    });
  }

  function handleUpdateIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!team || !project || !editingIssue) {
      return;
    }

    if (!issueForm.issueClassId) {
      toast.error("Choose an issue type first.");
      return;
    }

    startUpdateIssueTransition(async () => {
      try {
        const data = await requestJson<IssueMutationResponse>(
          `/api/teams/${team.id}/projects/${project.id}/issues/${editingIssue.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(createIssuePayload(issueForm)),
          }
        );

        closeIssueDialog(false);
        refreshIssues(0);
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update the issue.");
      }
    });
  }

  function handleDeleteIssue() {
    if (!team || !project || !issueToDelete) {
      return;
    }

    const deletingIssue = issueToDelete;

    startDeleteIssueTransition(async () => {
      try {
        const data = await requestJson<IssueDeleteResponse>(
          `/api/teams/${team.id}/projects/${project.id}/issues/${deletingIssue.id}`,
          {
            method: "DELETE",
          }
        );

        if (editingIssue?.id === deletingIssue.id) {
          closeIssueDialog(false);
        }

        setIssueToDelete(null);
        refreshIssues();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete the issue.");
      }
    });
  }

  return {
    hasRequiredParams,
    isLoading,
    isRefreshing,
    isSearchPending,
    loadError,
    team,
    project,
    members,
    modules,
    issueClasses,
    issues,
    pagination,
    summary,
    moduleIssueCountById,
    canEditProject,
    totalIssues: summary.totalIssues,
    openIssueCount: summary.openIssueCount,
    resolvedIssueCount: summary.resolvedIssueCount,
    criticalIssueCount: summary.criticalIssueCount,
    viewMode,
    setViewMode,
    sorting,
    handleSortingChange,
    pageSize,
    setPageIndex,
    currentPageIndex,
    isGridView,
    hasAnyIssues,
    hasVisibleIssues,
    isModuleSidebarCollapsed,
    setIsModuleSidebarCollapsed,
    searchValue,
    handleSearchChange,
    resolutionFilter,
    handleResolutionFilterChange,
    selectedModuleFilters,
    handleModuleFilterToggle,
    handleClearModuleFilters,
    selectedIssueTypeFilters,
    handleIssueTypeFilterToggle,
    handleClearIssueTypeFilters,
    selectedPriorityFilters,
    handlePriorityFilterToggle,
    handleClearPriorityFilters,
    selectedAssigneeFilters,
    handleAssigneeFilterToggle,
    handleClearAssigneeFilters,
    handleClearFilters,
    hasActiveFilters,
    activeFilterChips,
    moduleFilterOptions,
    issueTypeFilterOptions,
    priorityFilterOptions,
    assigneeFilterOptions,
    isModuleOpen,
    openModuleDialog,
    closeModuleDialog,
    moduleName,
    setModuleName,
    moduleDescription,
    setModuleDescription,
    isCreatingModule,
    handleCreateModule,
    isIssueClassOpen,
    openIssueClassDialog,
    closeIssueClassDialog,
    issueClassName,
    setIssueClassName,
    issueClassDescription,
    setIssueClassDescription,
    isCreatingIssueClass,
    handleCreateIssueClass,
    isIssueOpen,
    closeIssueDialog,
    openCreateIssueDialog,
    openEditIssueDialog,
    issueForm,
    handleIssueFormChange,
    isEditingIssue,
    isIssueMutationPending,
    handleCreateIssue,
    handleUpdateIssue,
    issueToDelete,
    setIssueToDelete,
    isDeletingIssue,
    areIssueActionsPending,
    handleDeleteIssue,
    handlePageSizeChange,
    refreshIssues,
  };
}
