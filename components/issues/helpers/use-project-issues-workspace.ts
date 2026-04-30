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
  buildIssuesSearchParams,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORTING,
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
  type IssueExcelImportResponse,
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
  pendingTestIssueCount: 0,
  reopenedIssueCount: 0,
  criticalIssueCount: 0,
  hasUnclassifiedIssues: false,
};

interface SubModuleDraft {
  name: string;
  description: string;
}

function createEmptySubModuleDraft(): SubModuleDraft {
  return {
    name: "",
    description: "",
  };
}

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

  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebouncedValue(searchValue.trim(), SEARCH_DEBOUNCE_MS);
  const [resolutionFilter, setResolutionFilter] = useState<IssueResolutionFilter>("open");
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
  const [moduleParentId, setModuleParentId] = useState("");
  const [createSubModulesWithMain, setCreateSubModulesWithMain] = useState(false);
  const [subModuleDrafts, setSubModuleDrafts] = useState<SubModuleDraft[]>([]);

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
  const [isExportingIssues, startExportIssuesTransition] = useTransition();
  const [isImportingIssues, startImportIssuesTransition] = useTransition();
  const [isLoadingFullscreenIssues, startLoadFullscreenIssuesTransition] = useTransition();
  const [fullscreenIssues, setFullscreenIssues] = useState<IssueListItem[]>([]);
  const [fullscreenIssuesError, setFullscreenIssuesError] = useState<string | null>(null);
  const [issueDataVersion, setIssueDataVersion] = useState(0);

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
  const mainModules = useMemo(
    () => modules.filter((projectModule) => projectModule.parentModuleId === null),
    [modules]
  );
  const currentUserId = currentUser?.userId ?? null;
  const currentUserIsTester = currentUser?.roles.includes("tester") ?? false;
  const canEditProject = team?.canEdit ?? false;
  const currentPageIndex = Math.max(0, pagination.page - 1);
  const isLoading = isMetadataLoading || isIssuesLoading;
  const isSearchPending = searchValue.trim() !== debouncedSearchValue;
  const isEditingIssue = Boolean(editingIssue);
  const isIssueMutationPending = isCreatingIssue || isUpdatingIssue;
  const areIssueActionsPending = isUpdatingIssue || isDeletingIssue;
  const hasActiveFilters =
    searchValue.trim().length > 0 ||
    resolutionFilter !== "open" ||
    selectedModuleFilters.length > 0 ||
    selectedIssueTypeFilters.length > 0 ||
    selectedPriorityFilters.length > 0 ||
    selectedAssigneeFilters.length > 0;
  const issueFiltersReloadKey = useMemo(
    () =>
      JSON.stringify({
        search: debouncedSearchValue,
        resolutionFilter,
        selectedModuleFilters,
        selectedIssueTypeFilters,
        selectedPriorityFilters,
        selectedAssigneeFilters,
        issueDataVersion,
      }),
    [
      debouncedSearchValue,
      issueDataVersion,
      resolutionFilter,
      selectedAssigneeFilters,
      selectedIssueTypeFilters,
      selectedModuleFilters,
      selectedPriorityFilters,
    ]
  );
  const fullscreenWorkbookReloadKey = useMemo(
    () =>
      JSON.stringify({
        search: debouncedSearchValue,
        resolutionFilter,
        selectedIssueTypeFilters,
        selectedPriorityFilters,
        selectedAssigneeFilters,
      }),
    [
      debouncedSearchValue,
      resolutionFilter,
      selectedAssigneeFilters,
      selectedIssueTypeFilters,
      selectedPriorityFilters,
    ]
  );

  const moduleFilterOptions = useMemo<IssueWorkspaceFilterOption[]>(
    () => [
      {
        value: GENERAL_MODULE_FILTER_VALUE,
        label: "General issue",
        description: "Issues not tied to any specific module.",
      },
      ...modules.map((projectModule) => ({
        value: projectModule.id,
        label: projectModule.displayName,
        description:
          projectModule.description ??
          (projectModule.parentModuleName
            ? `Sub module under ${projectModule.parentModuleName}.`
            : "Main module."),
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

  function markIssueDataChanged() {
    setIssueDataVersion((currentVersion) => currentVersion + 1);
  }

  function replaceIssueInLoadedRows(updatedIssue: IssueListItem) {
    setIssues((currentIssues) =>
      currentIssues.map((issue) => (issue.id === updatedIssue.id ? updatedIssue : issue))
    );
    setFullscreenIssues((currentIssues) =>
      currentIssues.map((issue) => (issue.id === updatedIssue.id ? updatedIssue : issue))
    );
  }

  function removeIssueFromLoadedRows(issueId: string) {
    setIssues((currentIssues) => currentIssues.filter((issue) => issue.id !== issueId));
    setFullscreenIssues((currentIssues) => currentIssues.filter((issue) => issue.id !== issueId));
  }

  function closeModuleDialog(open: boolean) {
    setIsModuleOpen(open);

    if (!open) {
      setModuleName("");
      setModuleDescription("");
      setModuleParentId("");
      setCreateSubModulesWithMain(false);
      setSubModuleDrafts([]);
    }
  }

  function openModuleDialog(parentModuleId = "") {
    setCreateSubModulesWithMain(false);
    setSubModuleDrafts([]);
    setModuleParentId(parentModuleId);
    setIsModuleOpen(true);
  }

  function addSubModuleDraft() {
    setSubModuleDrafts((currentDrafts) => [...currentDrafts, createEmptySubModuleDraft()]);
  }

  function updateSubModuleDraft(index: number, patch: Partial<SubModuleDraft>) {
    setSubModuleDrafts((currentDrafts) =>
      currentDrafts.map((draft, draftIndex) =>
        draftIndex === index
          ? {
              ...draft,
              ...patch,
            }
          : draft
      )
    );
  }

  function removeSubModuleDraft(index: number) {
    setSubModuleDrafts((currentDrafts) =>
      currentDrafts.filter((_, draftIndex) => draftIndex !== index)
    );
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
    setIssueForm({
      ...createEmptyIssueForm(issueForm.issueClassId || issueClasses[0]?.id || ""),
      testedBy: currentUserIsTester ? currentUserId ?? "" : "",
    });
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
    setResolutionFilter("open");
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

    const shouldCreateSubModules = !moduleParentId && createSubModulesWithMain;
    const normalizedSubModules = subModuleDrafts
      .map((draft) => ({
        name: draft.name.trim(),
        description: draft.description.trim(),
      }))
      .filter((draft) => draft.name.length > 0);

    if (shouldCreateSubModules && normalizedSubModules.length === 0) {
      toast.error("Add at least one sub module name or turn off optional sub module creation.");
      return;
    }

    const payload: CreateProjectModuleInput = {
      name: moduleName,
      description: moduleDescription,
      parentModuleId: moduleParentId || null,
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

        const createdModules: ProjectModuleListItem[] = [data.module];
        let moduleSuccessMessage = data.message;
        let subModuleErrorMessage: string | null = null;

        if (shouldCreateSubModules) {
          const createdSubModuleNames: string[] = [];
          const failedSubModuleNames: string[] = [];

          for (const subModule of normalizedSubModules) {
            try {
            const subModulePayload: CreateProjectModuleInput = {
                name: subModule.name,
                description: subModule.description,
              parentModuleId: data.module.id,
            };
            const subModuleData = await requestJson<ProjectModuleMutationResponse>(
              `/api/teams/${team.id}/projects/${project.id}/modules`,
              {
                method: "POST",
                body: JSON.stringify(subModulePayload),
              }
            );

            createdModules.push(subModuleData.module);
              createdSubModuleNames.push(subModuleData.module.name);
            } catch {
              failedSubModuleNames.push(subModule.name);
            }
          }

          if (createdSubModuleNames.length > 0) {
            moduleSuccessMessage = `${data.module.name} with ${createdSubModuleNames.length} sub module${
              createdSubModuleNames.length === 1 ? "" : "s"
            } is ready.`;
          }

          if (failedSubModuleNames.length > 0) {
            const preview = failedSubModuleNames.slice(0, 2).join(", ");

            subModuleErrorMessage =
              failedSubModuleNames.length === 1
                ? `Main module was created, but sub module ${preview} could not be created.`
                : `Main module was created, but ${failedSubModuleNames.length} sub modules could not be created (${preview}${
                    failedSubModuleNames.length > 2 ? ", ..." : ""
                  }).`;
          }
        }

        setModules((currentModules) => sortModules([...currentModules, ...createdModules]));
        closeModuleDialog(false);
        toast.success(moduleSuccessMessage);

        if (subModuleErrorMessage) {
          toast.warning(subModuleErrorMessage);
        }
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

        markIssueDataChanged();
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

        replaceIssueInLoadedRows(data.issue);
        markIssueDataChanged();
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
        removeIssueFromLoadedRows(data.deletedIssueId);
        markIssueDataChanged();
        refreshIssues();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete the issue.");
      }
    });
  }

  function buildIssueFiltersSearchParams() {
    return buildIssuesSearchParams({
      teamId: team?.id ?? "",
      projectId: project?.id ?? "",
      pageIndex,
      pageSize,
      search: debouncedSearchValue,
      resolutionFilter,
      moduleFilters: selectedModuleFilters,
      issueTypeFilters: selectedIssueTypeFilters,
      priorityFilters: selectedPriorityFilters,
      assigneeFilters: selectedAssigneeFilters,
      sorting,
    });
  }

  function handleExportIssuesToExcel(mode: "current" | "bundle" = "current") {
    if (!team || !project) {
      return;
    }

    startExportIssuesTransition(async () => {
      try {
        const searchParams = buildIssueFiltersSearchParams();
        searchParams.set("project", project.name);
        searchParams.set("mode", mode);
        const response = await fetch(
          `/api/teams/${team.id}/projects/${project.id}/issues/excel?${searchParams.toString()}`,
          {
            cache: "no-store",
          }
        );
        const errorPayload = !response.ok
          ? ((await response.json().catch(() => null)) as { message?: string } | null)
          : null;

        if (!response.ok) {
          throw new Error(errorPayload?.message ?? "Could not export the issues.");
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition") ?? "";
        const fileNameMatch = /filename=\"([^\"]+)\"/i.exec(contentDisposition);
        const fileName = fileNameMatch?.[1] ?? `${project.name}-issues.xlsx`;
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = objectUrl;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
        toast.success(
          mode === "bundle"
            ? "Module workbooks exported."
            : "Issues exported to Excel."
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not export the issues.");
      }
    });
  }

  function handleDownloadIssuesExcelTemplate() {
    if (!team || !project) {
      return;
    }

    startExportIssuesTransition(async () => {
      try {
        const searchParams = new URLSearchParams({
          mode: "template",
          project: project.name,
        });
        const response = await fetch(
          `/api/teams/${team.id}/projects/${project.id}/issues/excel?${searchParams.toString()}`,
          {
            cache: "no-store",
          }
        );
        const errorPayload = !response.ok
          ? ((await response.json().catch(() => null)) as { message?: string } | null)
          : null;

        if (!response.ok) {
          throw new Error(errorPayload?.message ?? "Could not download the Excel template.");
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition") ?? "";
        const fileNameMatch = /filename=\"([^\"]+)\"/i.exec(contentDisposition);
        const fileName = fileNameMatch?.[1] ?? `${project.name}-issues-template.xlsx`;
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = objectUrl;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
        toast.success("Excel template downloaded.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not download the Excel template."
        );
      }
    });
  }

  function handleImportIssuesFromFile(file: File, mainModuleId: string) {
    if (!team || !project) {
      return;
    }

    startImportIssuesTransition(async () => {
      try {
        const formData = new FormData();

        formData.set("file", file);
        formData.set("mainModuleId", mainModuleId);

        const response = await fetch(`/api/teams/${team.id}/projects/${project.id}/issues/excel`, {
          method: "POST",
          body: formData,
        });
        const data = (await response.json().catch(() => null)) as
          | IssueExcelImportResponse
          | { message?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.message ?? "Could not import the Excel file.");
        }

        const importResult = data as IssueExcelImportResponse;

        try {
          const workspaceData = await requestJson<ProjectIssuesWorkspaceResponse>(
            `/api/teams/${team.id}/projects/${project.id}/issues/workspace`,
            {
              cache: "no-store",
            }
          );

          setModules(sortModules(workspaceData.modules));
          setIssueClasses(sortIssueClasses(workspaceData.issueClasses));
        } catch {
          toast.warning("Issues were imported, but module metadata could not be refreshed.");
        }

        markIssueDataChanged();
        refreshIssues(0);
        toast.success(importResult.message);

        if (importResult.warnings.length > 0) {
          const preview = importResult.warnings.slice(0, 2).join(" ");
          const remainingCount =
            importResult.warnings.length - Math.min(importResult.warnings.length, 2);

          toast.warning(
            remainingCount > 0
              ? `${preview} ${remainingCount} more import warning${
                  remainingCount === 1 ? "" : "s"
                }.`
              : preview
          );
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not import the issues.");
      }
    });
  }

  async function handleCreateInlineIssue(values: IssueFormValues) {
    if (!team || !project) {
      return false;
    }

    if (!values.issueClassId) {
      toast.error("Choose an issue type first.");
      return false;
    }

    try {
      const data = await requestJson<IssueMutationResponse>(
        `/api/teams/${team.id}/projects/${project.id}/issues`,
        {
          method: "POST",
          body: JSON.stringify(createIssuePayload(values)),
        }
      );

      setFullscreenIssues((currentIssues) => [data.issue, ...currentIssues]);
      markIssueDataChanged();
      refreshIssues(0);
      toast.success(data.message);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the issue.");
      return false;
    }
  }

  async function handleUpdateInlineIssue(issue: IssueListItem, values: IssueFormValues) {
    if (!team || !project) {
      return false;
    }

    if (!values.issueClassId) {
      toast.error("Choose an issue type first.");
      return false;
    }

    try {
      const data = await requestJson<IssueMutationResponse>(
        `/api/teams/${team.id}/projects/${project.id}/issues/${issue.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(createIssuePayload(values)),
        }
      );

      replaceIssueInLoadedRows(data.issue);
      markIssueDataChanged();
      refreshIssues();
      toast.success(data.message);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the issue.");
      return false;
    }
  }

  function handleLoadFullscreenIssues(sortingOverride?: SortingState) {
    if (!team || !project) {
      return;
    }

    const activeTeamId = team.id;
    const activeProjectId = project.id;
    const requestSorting = sortingOverride ? normalizeSorting(sortingOverride) : sorting;

    startLoadFullscreenIssuesTransition(async () => {
      try {
        const fullscreenPageSize = 100;

        setFullscreenIssuesError(null);
        setFullscreenIssues([]);

        const firstPage = await requestJson<ProjectIssuesListResponse>(
          buildIssuesRequestUrl({
            teamId: activeTeamId,
            projectId: activeProjectId,
            pageIndex: 0,
            pageSize: fullscreenPageSize,
            search: debouncedSearchValue,
            resolutionFilter,
            moduleFilters: [],
            issueTypeFilters: selectedIssueTypeFilters,
            priorityFilters: selectedPriorityFilters,
            assigneeFilters: selectedAssigneeFilters,
            sorting: requestSorting,
          }),
          {
            cache: "no-store",
          }
        );

        const remainingPageIndexes = Array.from(
          { length: Math.max(0, firstPage.pagination.totalPages - 1) },
          (_, index) => index + 1
        );
        const remainingPages = await Promise.all(
          remainingPageIndexes.map((nextPageIndex) =>
            requestJson<ProjectIssuesListResponse>(
              buildIssuesRequestUrl({
                teamId: activeTeamId,
                projectId: activeProjectId,
                pageIndex: nextPageIndex,
                pageSize: fullscreenPageSize,
                search: debouncedSearchValue,
                resolutionFilter,
                moduleFilters: [],
                issueTypeFilters: selectedIssueTypeFilters,
                priorityFilters: selectedPriorityFilters,
                assigneeFilters: selectedAssigneeFilters,
                sorting: requestSorting,
              }),
              {
                cache: "no-store",
              }
            )
          )
        );

        setFullscreenIssues([
          ...firstPage.issues,
          ...remainingPages.flatMap((page) => page.issues),
        ]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not load the fullscreen workbook.";

        setFullscreenIssuesError(message);
        toast.error(message);
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
    mainModules,
    issueClasses,
    issues,
    pagination,
    summary,
    moduleIssueCountById,
    canEditProject,
    totalIssues: summary.totalIssues,
    openIssueCount: summary.openIssueCount,
    resolvedIssueCount: summary.resolvedIssueCount,
    pendingTestIssueCount: summary.pendingTestIssueCount,
    reopenedIssueCount: summary.reopenedIssueCount,
    criticalIssueCount: summary.criticalIssueCount,
    sorting,
    handleSortingChange,
    pageSize,
    setPageIndex,
    currentPageIndex,
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
    issueFiltersReloadKey,
    fullscreenWorkbookReloadKey,
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
    moduleParentId,
    setModuleParentId,
    createSubModulesWithMain,
    setCreateSubModulesWithMain,
    subModuleDrafts,
    addSubModuleDraft,
    updateSubModuleDraft,
    removeSubModuleDraft,
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
    handleCreateInlineIssue,
    handleUpdateInlineIssue,
    issueToDelete,
    setIssueToDelete,
    isDeletingIssue,
    areIssueActionsPending,
    handleDeleteIssue,
    isExportingIssues,
    isImportingIssues,
    isLoadingFullscreenIssues,
    fullscreenIssues,
    fullscreenIssuesError,
    handleExportIssuesToExcel,
    handleDownloadIssuesExcelTemplate,
    handleImportIssuesFromFile,
    handleLoadFullscreenIssues,
    handlePageSizeChange,
    refreshIssues,
  };
}
