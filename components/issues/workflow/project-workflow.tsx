"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { useParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { usePersistedViewMode } from "@/hooks/use-persisted-view-mode";
import type { IssueClaimRole } from "@/components/issues/shared/issue-claim";
import { saveRecentProject } from "@/components/nav/hooks/use-recent-projects";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACTIVE_ISSUE_STATUS_OPTIONS,
  type EpicStatus,
  type IssueAssigneeFilterValue,
  type IssueListItem,
  type IssueExcelImportResponse,
  type IssueMediaType,
  type IssueMediaUploadResponse,
  type IssueMutationResponse,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
  type ProjectEpicMutationResponse,
  type ProjectIssuesListResponse,
  type ProjectIssuesWorkspaceResponse,
  type ProjectReleaseMutationResponse,
  type ProjectReleaseStatus,
  type UploadedIssueMediaInput,
} from "@/routes/issues/types";

import { DEFAULT_SORTING, NONE_VALUE } from "./constants";
import { WorkflowDialogStack } from "./dialogs/workflow-dialog-stack";
import {
  PlanningAssignmentDialog,
  type PlanningAssignmentTarget as DialogPlanningAssignmentTarget,
} from "./dialogs/planning-assignment-dialog";
import {
  buildIssuePayload,
  createEmptyIssueForm,
  createIssueFormFromIssue,
} from "./forms";
import { requestJson } from "./http";
import {
  IssueBulkActionBar,
  type IssueBulkPatch,
} from "./issue-bulk-action-bar";
import { ProjectError } from "./project-error";
import { buildIssueListSearchParams } from "./query";
import type { IssueFormState, ProjectWorkflowView } from "./types";
import { EmptyState } from "./ui";
import { useWorkflowEntityDialogs } from "./use-workflow-entity-dialogs";
import { WorkflowFilters } from "./workflow-filters";
import { BoardView } from "./views/board-view";
import { IssueCollectionView } from "./views/issue-collection-view";
import { IssueDetailContent } from "./views/issue-detail-content";
import { ModulesView } from "./views/modules-view";
import {
  EpicsView,
  PlanningDetailView,
  ReleasesView,
  SprintsView,
} from "./views/planning-views";
import { SettingsView } from "./views/settings-view";
import { SummaryView } from "./views/summary-view";

export type { ProjectWorkflowView } from "./types";

type PlanningAssignmentTarget = DialogPlanningAssignmentTarget;

function getIssueMediaTypeFromFile(file: File): IssueMediaType {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  throw new Error(`${file.name} is not an image or video.`);
}

async function uploadIssueMediaFile(
  teamId: string,
  projectId: string,
  file: File,
) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("mediaType", getIssueMediaTypeFromFile(file));

  const response = await fetch(
    `/api/teams/${teamId}/projects/${projectId}/issue-media`,
    {
      method: "POST",
      body: formData,
    },
  );
  const data = (await response.json().catch(() => null)) as
    | IssueMediaUploadResponse
    | {
        message?: string;
      }
    | null;

  if (!response.ok) {
    const message = data && "message" in data ? data.message : undefined;
    throw new Error(message || `Could not upload ${file.name}.`);
  }

  return (data as IssueMediaUploadResponse).media;
}

export function ProjectWorkflow({ view }: { view: ProjectWorkflowView }) {
  const params = useParams<{
    teamId?: string | string[];
    projectId?: string | string[];
    issueKey?: string | string[];
    releaseId?: string | string[];
    sprintId?: string | string[];
    epicId?: string | string[];
  }>();
  const router = useRouter();
  const teamId = Array.isArray(params.teamId)
    ? params.teamId[0]
    : params.teamId;
  const projectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : params.projectId;
  const routeIssueKey = Array.isArray(params.issueKey)
    ? params.issueKey[0]
    : params.issueKey;
  const routeReleaseId = Array.isArray(params.releaseId)
    ? params.releaseId[0]
    : params.releaseId;
  const routeSprintId = Array.isArray(params.sprintId)
    ? params.sprintId[0]
    : params.sprintId;
  const routeEpicId = Array.isArray(params.epicId)
    ? params.epicId[0]
    : params.epicId;
  const basePath =
    teamId && projectId ? `/teams/${teamId}/projects/${projectId}` : "";
  const hasRequiredParams = Boolean(teamId && projectId);
  const activeView =
    view === "components" || view === "reports"
      ? "modules"
      : view === "release-detail"
        ? "releases"
        : view === "sprint-detail"
          ? "sprints"
          : view === "epic-detail"
            ? "epics"
            : view;
  const isPlanningDetailView =
    view === "release-detail" ||
    view === "sprint-detail" ||
    view === "epic-detail";
  const { viewMode, setViewMode } = usePersistedViewMode(
    `project-issue-workflow-view:${activeView}`,
    activeView === "issues" ? "table" : "grid",
  );

  const [workspace, setWorkspace] =
    useState<ProjectIssuesWorkspaceResponse | null>(null);
  const [issues, setIssues] = useState<IssueListItem[]>([]);
  const [pagination, setPagination] = useState<
    ProjectIssuesListResponse["pagination"] | null
  >(null);
  const [summary, setSummary] = useState<
    ProjectIssuesListResponse["summary"] | null
  >(null);
  const [moduleCounts, setModuleCounts] = useState<
    ProjectIssuesListResponse["moduleCounts"]
  >([]);
  const [componentCounts, setComponentCounts] = useState<
    ProjectIssuesListResponse["componentCounts"]
  >([]);
  const [releaseCounts, setReleaseCounts] = useState<
    ProjectIssuesListResponse["releaseCounts"]
  >([]);
  const [epicCounts, setEpicCounts] = useState<
    ProjectIssuesListResponse["epicCounts"]
  >([]);
  const [sprintCounts, setSprintCounts] = useState<
    ProjectIssuesListResponse["sprintCounts"]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setIsLoadingWorkspace] = useState(hasRequiredParams);
  const [isLoadingIssues, setIsLoadingIssues] = useState(hasRequiredParams);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [typeFilters, setTypeFilters] = useState<IssueType[]>([]);
  const [statusFilters, setStatusFilters] = useState<IssueStatus[]>([]);
  const [moduleFilters, setModuleFilters] = useState<string[]>([]);
  const [componentFilters, setComponentFilters] = useState<string[]>([]);
  const [epicFilters, setEpicFilters] = useState<string[]>([]);
  const [releaseFilters, setReleaseFilters] = useState<string[]>([]);
  const [sprintFilters, setSprintFilters] = useState<string[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<IssuePriority[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<
    IssueAssigneeFilterValue | "all"
  >("all");
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [selectedIssue, setSelectedIssue] = useState<IssueListItem | null>(
    null,
  );
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [isIssueSheetOpen, setIsIssueSheetOpen] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [assignmentTarget, setAssignmentTarget] =
    useState<PlanningAssignmentTarget | null>(null);
  const [editingIssue, setEditingIssue] = useState<IssueListItem | null>(null);
  const [issueToDelete, setIssueToDelete] = useState<IssueListItem | null>(
    null,
  );
  const [issueForm, setIssueForm] =
    useState<IssueFormState>(createEmptyIssueForm);
  const [isSavingIssue, startIssueTransition] = useTransition();
  const [isDeletingIssue, startDeleteTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();
  const [isImportingExcel, startImportTransition] = useTransition();
  const entityDialogs = useWorkflowEntityDialogs({
    teamId,
    projectId,
    onRefresh: refresh,
  });

  useEffect(() => {
    if (!teamId || !projectId) {
      return;
    }

    let isActive = true;

    async function loadWorkspace() {
      setIsLoadingWorkspace(true);
      setLoadError(null);

      try {
        const data = await requestJson<ProjectIssuesWorkspaceResponse>(
          `/api/teams/${teamId}/projects/${projectId}/issues/workspace`,
          { cache: "no-store" },
        );

        if (isActive) {
          setWorkspace(data);
        }
      } catch (error) {
        if (isActive) {
          const message =
            error instanceof Error ? error.message : "Could not load project.";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (isActive) {
          setIsLoadingWorkspace(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      isActive = false;
    };
  }, [projectId, reloadKey, teamId]);

  useEffect(() => {
    if (!teamId || !projectId) {
      return;
    }

    let isActive = true;

    async function loadIssues() {
      setIsLoadingIssues(true);

      try {
        const searchParams = buildIssueListSearchParams({
          activeView,
          pageIndex,
          pageSize,
          sorting,
          search,
          typeFilters,
          statusFilters,
          moduleFilters,
          componentFilters,
          epicFilters:
            view === "epic-detail" && routeEpicId ? [routeEpicId] : epicFilters,
          releaseFilters:
            view === "release-detail" && routeReleaseId
              ? [routeReleaseId]
              : releaseFilters,
          sprintFilters:
            view === "sprint-detail" && routeSprintId
              ? [routeSprintId]
              : sprintFilters,
          priorityFilters,
          assignmentFilter,
        });

        const data = await requestJson<ProjectIssuesListResponse>(
          `/api/teams/${teamId}/projects/${projectId}/issues?${searchParams.toString()}`,
          { cache: "no-store" },
        );

        if (!isActive) return;

        setIssues(data.issues);
        setPagination(data.pagination);
        setSummary(data.summary);
        setModuleCounts(data.moduleCounts);
        setComponentCounts(data.componentCounts);
        setReleaseCounts(data.releaseCounts);
        setEpicCounts(data.epicCounts);
        setSprintCounts(data.sprintCounts);
        setSelectedIssueIds((currentIssueIds) => {
          const visibleIssueIds = new Set(data.issues.map((issue) => issue.id));
          return currentIssueIds.filter((issueId) =>
            visibleIssueIds.has(issueId),
          );
        });
      } catch (error) {
        if (isActive) {
          const message =
            error instanceof Error ? error.message : "Could not load issues.";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (isActive) {
          setIsLoadingIssues(false);
        }
      }
    }

    void loadIssues();

    return () => {
      isActive = false;
    };
  }, [
    activeView,
    assignmentFilter,
    componentFilters,
    epicFilters,
    moduleFilters,
    pageIndex,
    pageSize,
    projectId,
    priorityFilters,
    releaseFilters,
    reloadKey,
    routeEpicId,
    routeReleaseId,
    routeSprintId,
    search,
    sorting,
    sprintFilters,
    statusFilters,
    teamId,
    typeFilters,
    view,
  ]);

  useEffect(() => {
    if (view !== "issue" || !teamId || !projectId || !routeIssueKey) {
      return;
    }

    let isActive = true;

    async function loadIssue() {
      try {
        const data = await requestJson<IssueMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/issues/${routeIssueKey}`,
          { cache: "no-store" },
        );

        if (isActive) {
          setSelectedIssue(data.issue);
        }
      } catch (error) {
        if (isActive) {
          const message =
            error instanceof Error
              ? error.message
              : "Could not load the issue.";
          setLoadError(message);
          toast.error(message);
        }
      }
    }

    void loadIssue();

    return () => {
      isActive = false;
    };
  }, [projectId, routeIssueKey, teamId, view]);

  const currentUser = useMemo(
    () => workspace?.members.find((member) => member.isCurrentUser) ?? null,
    [workspace?.members],
  );

  useEffect(() => {
    if (!workspace || !teamId || !projectId || !basePath) {
      return;
    }

    saveRecentProject({
      teamId,
      projectId,
      teamName: workspace.team.name,
      projectName: workspace.project.name,
      href: basePath,
    });
  }, [basePath, projectId, teamId, workspace]);

  const filteredComponents = useMemo(
    () =>
      workspace?.components.filter(
        (component) =>
          moduleFilters.length === 0 ||
          moduleFilters.includes(component.moduleId),
      ) ?? [],
    [moduleFilters, workspace?.components],
  );
  const issueByStatus = useMemo(() => {
    const groups = new Map<IssueStatus, IssueListItem[]>();

    for (const status of ACTIVE_ISSUE_STATUS_OPTIONS)
      groups.set(status.value, []);
    for (const issue of issues) groups.get(issue.status)?.push(issue);

    return groups;
  }, [issues]);
  const criticalIssues = useMemo(
    () =>
      issues.filter(
        (issue) => issue.priority === "critical" && issue.status !== "fixed",
      ),
    [issues],
  );
  const canEdit = workspace?.team.canEdit ?? false;
  const isLoading = isLoadingIssues;
  const selectedIssues = useMemo(() => {
    const selectedIssueIdSet = new Set(selectedIssueIds);
    return issues.filter((issue) => selectedIssueIdSet.has(issue.id));
  }, [issues, selectedIssueIds]);

  function resetToFirstPage() {
    setPageIndex(0);
  }

  function refresh() {
    setReloadKey((currentValue) => currentValue + 1);
  }

  function clearFilters() {
    setSearch("");
    setTypeFilters([]);
    setStatusFilters([]);
    setModuleFilters([]);
    setComponentFilters([]);
    setEpicFilters([]);
    setReleaseFilters([]);
    setSprintFilters([]);
    setPriorityFilters([]);
    setAssignmentFilter("all");
    setPageIndex(0);
  }

  function openCreateIssueDialog() {
    const form = createEmptyIssueForm();

    if (moduleFilters.length === 1) form.moduleId = moduleFilters[0];
    if (componentFilters.length === 1) form.componentId = componentFilters[0];
    if (epicFilters.length === 1) form.epicId = epicFilters[0];
    if (releaseFilters.length === 1) form.releaseId = releaseFilters[0];
    if (sprintFilters.length === 1) form.sprintId = sprintFilters[0];
    if (view === "release-detail" && routeReleaseId)
      form.releaseId = routeReleaseId;
    if (view === "sprint-detail" && routeSprintId)
      form.sprintId = routeSprintId;
    if (view === "epic-detail" && routeEpicId) form.epicId = routeEpicId;

    setEditingIssue(null);
    setIssueForm(form);
    setIsIssueDialogOpen(true);
  }

  function openEditIssueDialog(issue: IssueListItem) {
    setEditingIssue(issue);
    setIssueForm(createIssueFormFromIssue(issue));
    setIsIssueDialogOpen(true);
  }

  function openIssue(issue: IssueListItem) {
    setSelectedIssue(issue);
    setIsIssueSheetOpen(true);
  }

  function handleIssueSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!teamId || !projectId) return;

    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLElement | null;
    const shouldReopen = submitter?.dataset.intent === "reopen";
    const submittedIssueForm = shouldReopen
      ? {
          ...issueForm,
          reopen: true,
        }
      : {
          ...issueForm,
          reopen: false,
        };

    startIssueTransition(async () => {
      try {
        const uploadedMedia: UploadedIssueMediaInput[] =
          submittedIssueForm.mediaFiles.length > 0
            ? await Promise.all(
                submittedIssueForm.mediaFiles.map((file) =>
                  uploadIssueMediaFile(teamId, projectId, file),
                ),
              )
            : [];
        const data = await requestJson<IssueMutationResponse>(
          editingIssue
            ? `/api/teams/${teamId}/projects/${projectId}/issues/${editingIssue.id}`
            : `/api/teams/${teamId}/projects/${projectId}/issues`,
          {
            method: editingIssue ? "PATCH" : "POST",
            body: JSON.stringify(
              buildIssuePayload(submittedIssueForm, uploadedMedia),
            ),
          },
        );

        setSelectedIssue(data.issue);
        setIsIssueDialogOpen(false);
        refresh();
        toast.success(data.message);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save the issue.",
        );
      }
    });
  }

  function handleDeleteIssue() {
    if (!teamId || !projectId || !issueToDelete) return;

    const deletingIssue = issueToDelete;

    startDeleteTransition(async () => {
      try {
        const data = await requestJson<{
          deletedIssueId: string;
          message: string;
        }>(
          `/api/teams/${teamId}/projects/${projectId}/issues/${deletingIssue.id}`,
          { method: "DELETE" },
        );

        setIssueToDelete(null);
        setIssues((currentIssues) =>
          currentIssues.filter((issue) => issue.id !== data.deletedIssueId),
        );
        if (selectedIssue?.id === deletingIssue.id) {
          setSelectedIssue(null);
          setIsIssueSheetOpen(false);
        }
        refresh();
        toast.success(data.message);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not delete the issue.",
        );
      }
    });
  }

  function handleRemoveIssueMedia(issue: IssueListItem, mediaId: string) {
    if (!teamId || !projectId) return;

    const form = createIssueFormFromIssue(issue);
    form.removeMediaIds = [mediaId];

    startIssueTransition(async () => {
      try {
        const data = await requestJson<IssueMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/issues/${issue.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(buildIssuePayload(form)),
          },
        );

        setSelectedIssue(data.issue);
        setIssues((currentIssues) =>
          currentIssues.map((currentIssue) =>
            currentIssue.id === data.issue.id ? data.issue : currentIssue,
          ),
        );
        refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not remove the media.",
        );
      }
    });
  }

  function handleStatusDrop(status: IssueStatus, issueId: string) {
    if (!teamId || !projectId || !issueId) return;

    const issue = issues.find((item) => item.id === issueId);

    if (!issue || issue.status === status) return;

    setIssues((currentIssues) =>
      currentIssues.map((item) =>
        item.id === issueId ? { ...item, status } : item,
      ),
    );

    startIssueTransition(async () => {
      try {
        const data = await requestJson<IssueMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/issues/${issueId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        );

        setIssues((currentIssues) =>
          currentIssues.map((item) =>
            item.id === issueId ? data.issue : item,
          ),
        );
        refresh();
      } catch (error) {
        setIssues((currentIssues) =>
          currentIssues.map((item) => (item.id === issueId ? issue : item)),
        );
        toast.error(
          error instanceof Error ? error.message : "Could not move the issue.",
        );
      }
    });
  }

  function handleEpicStatusDrop(status: EpicStatus, epicId: string) {
    if (!teamId || !projectId || !workspace || !epicId) return;

    const epic = workspace.epics.find((item) => item.id === epicId);

    if (!epic || epic.status === status) return;

    setWorkspace((currentWorkspace) =>
      currentWorkspace
        ? {
            ...currentWorkspace,
            epics: currentWorkspace.epics.map((item) =>
              item.id === epicId ? { ...item, status } : item,
            ),
          }
        : currentWorkspace,
    );

    startIssueTransition(async () => {
      try {
        const data = await requestJson<ProjectEpicMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/epics/${epicId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        );

        setWorkspace((currentWorkspace) =>
          currentWorkspace
            ? {
                ...currentWorkspace,
                epics: currentWorkspace.epics.map((item) =>
                  item.id === epicId ? data.epic : item,
                ),
              }
            : currentWorkspace,
        );
        refresh();
      } catch (error) {
        setWorkspace((currentWorkspace) =>
          currentWorkspace
            ? {
                ...currentWorkspace,
                epics: currentWorkspace.epics.map((item) =>
                  item.id === epicId ? epic : item,
                ),
              }
            : currentWorkspace,
        );
        toast.error(
          error instanceof Error ? error.message : "Could not move the epic.",
        );
      }
    });
  }

  function handleReleaseStatusDrop(
    status: ProjectReleaseStatus,
    releaseId: string,
  ) {
    if (!teamId || !projectId || !workspace || !releaseId) return;

    const release = workspace.releases.find((item) => item.id === releaseId);

    if (!release || release.status === status) return;

    setWorkspace((currentWorkspace) =>
      currentWorkspace
        ? {
            ...currentWorkspace,
            releases: currentWorkspace.releases.map((item) =>
              item.id === releaseId ? { ...item, status } : item,
            ),
          }
        : currentWorkspace,
    );

    startIssueTransition(async () => {
      try {
        const data = await requestJson<ProjectReleaseMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/releases/${releaseId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        );

        setWorkspace((currentWorkspace) =>
          currentWorkspace
            ? {
                ...currentWorkspace,
                releases: currentWorkspace.releases.map((item) =>
                  item.id === releaseId ? data.release : item,
                ),
              }
            : currentWorkspace,
        );
        refresh();
      } catch (error) {
        setWorkspace((currentWorkspace) =>
          currentWorkspace
            ? {
                ...currentWorkspace,
                releases: currentWorkspace.releases.map((item) =>
                  item.id === releaseId ? release : item,
                ),
              }
            : currentWorkspace,
        );
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not move the release.",
        );
      }
    });
  }

  function handleIssueSelectionChange(issueId: string, selected: boolean) {
    setSelectedIssueIds((currentIssueIds) => {
      const nextIssueIds = new Set(currentIssueIds);

      if (selected) {
        nextIssueIds.add(issueId);
      } else {
        nextIssueIds.delete(issueId);
      }

      return Array.from(nextIssueIds);
    });
  }

  function handleBulkIssueUpdate(patch: IssueBulkPatch) {
    if (!teamId || !projectId || !workspace || selectedIssues.length === 0)
      return;

    const normalizedPatch = { ...patch };

    if (patch.componentId && patch.componentId !== NONE_VALUE) {
      const selectedComponent = workspace.components.find(
        (component) => component.id === patch.componentId,
      );

      if (selectedComponent) {
        normalizedPatch.moduleId = selectedComponent.moduleId;
      }
    }

    startIssueTransition(async () => {
      try {
        const updatedIssues = await Promise.all(
          selectedIssues.map(async (issue) => {
            const form = {
              ...createIssueFormFromIssue(issue),
              ...normalizedPatch,
            };
            const data = await requestJson<IssueMutationResponse>(
              `/api/teams/${teamId}/projects/${projectId}/issues/${issue.id}`,
              {
                method: "PATCH",
                body: JSON.stringify(buildIssuePayload(form)),
              },
            );

            return data.issue;
          }),
        );
        const updatedIssueMap = new Map(
          updatedIssues.map((issue) => [issue.id, issue]),
        );

        setIssues((currentIssues) =>
          currentIssues.map((issue) => updatedIssueMap.get(issue.id) ?? issue),
        );
        setSelectedIssueIds([]);
        refresh();
        toast.success(`${updatedIssues.length} issues updated.`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not update selected issues.",
        );
      }
    });
  }

  function handleClaimIssue(issue: IssueListItem, role: IssueClaimRole) {
    if (!teamId || !projectId || !currentUser) return;

    const form = createIssueFormFromIssue(issue);

    if (role === "developer") {
      form.assigneeGroup = "development";
      form.assigneeId = currentUser.userId;
    } else {
      form.testerAssigneeGroup = "testing";
      form.testerAssigneeId = currentUser.userId;
    }

    startIssueTransition(async () => {
      try {
        const data = await requestJson<IssueMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/issues/${issue.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(buildIssuePayload(form)),
          },
        );

        setIssues((currentIssues) =>
          currentIssues.map((currentIssue) =>
            currentIssue.id === data.issue.id ? data.issue : currentIssue,
          ),
        );
        setSelectedIssue((currentIssue) =>
          currentIssue?.id === data.issue.id ? data.issue : currentIssue,
        );
        refresh();
        toast.success(`${data.issue.key} assigned to you.`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not claim the issue.",
        );
      }
    });
  }

  function handlePlanningIssueAssignment(
    target: PlanningAssignmentTarget,
    issuesToAssign: IssueListItem[],
  ) {
    if (!teamId || !projectId || issuesToAssign.length === 0) return;

    const patch: IssueBulkPatch =
      target.kind === "release"
        ? { releaseId: target.id }
        : target.kind === "sprint"
          ? { sprintId: target.id }
          : { epicId: target.id };

    startIssueTransition(async () => {
      try {
        const updatedIssues = await Promise.all(
          issuesToAssign.map(async (issue) => {
            const form = {
              ...createIssueFormFromIssue(issue),
              ...patch,
            };
            const data = await requestJson<IssueMutationResponse>(
              `/api/teams/${teamId}/projects/${projectId}/issues/${issue.id}`,
              {
                method: "PATCH",
                body: JSON.stringify(buildIssuePayload(form)),
              },
            );

            return data.issue;
          }),
        );
        const updatedIssueMap = new Map(
          updatedIssues.map((issue) => [issue.id, issue]),
        );

        setIssues((currentIssues) =>
          currentIssues.map((issue) => updatedIssueMap.get(issue.id) ?? issue),
        );
        setSelectedIssueIds([]);
        setAssignmentTarget(null);
        refresh();
        toast.success(
          `${updatedIssues.length} issues assigned to ${target.name}.`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not assign the selected issues.",
        );
      }
    });
  }

  async function downloadResponseFile(
    response: Response,
    fallbackFileName: string,
  ) {
    const errorPayload = !response.ok
      ? ((await response.json().catch(() => null)) as {
          message?: string;
        } | null)
      : null;

    if (!response.ok) {
      throw new Error(errorPayload?.message ?? "Could not download the file.");
    }

    const blob = await response.blob();
    const contentDisposition =
      response.headers.get("content-disposition") ?? "";
    const fileNameMatch = /filename="([^"]+)"/i.exec(contentDisposition);
    const fileName = fileNameMatch?.[1] ?? fallbackFileName;
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function handleExportIssuesToExcel() {
    if (!teamId || !projectId || !workspace) return;

    startExportTransition(async () => {
      try {
        const [activeSort] = sorting;
        const searchParams = new URLSearchParams({
          project: workspace.project.name,
          page: "1",
          pageSize: "2147483647",
          sortBy: activeSort?.id ?? "serialNumber",
          sortDirection: activeSort?.desc ? "desc" : "asc",
        });

        const filterParams = buildIssueListSearchParams({
          activeView,
          pageIndex: 0,
          pageSize: 2147483647,
          sorting,
          search,
          typeFilters,
          statusFilters,
          moduleFilters,
          componentFilters,
          epicFilters:
            view === "epic-detail" && routeEpicId ? [routeEpicId] : epicFilters,
          releaseFilters:
            view === "release-detail" && routeReleaseId
              ? [routeReleaseId]
              : releaseFilters,
          sprintFilters:
            view === "sprint-detail" && routeSprintId
              ? [routeSprintId]
              : sprintFilters,
          priorityFilters,
          assignmentFilter,
        });

        filterParams.forEach((value, key) => {
          if (
            key !== "page" &&
            key !== "pageSize" &&
            key !== "sortBy" &&
            key !== "sortDirection"
          ) {
            searchParams.append(key, value);
          }
        });

        const response = await fetch(
          `/api/teams/${teamId}/projects/${projectId}/issues/excel?${searchParams.toString()}`,
          { cache: "no-store" },
        );
        await downloadResponseFile(
          response,
          `${workspace.project.name}-issues.xlsx`,
        );
        toast.success("Issues exported to Excel.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not export the issues.",
        );
      }
    });
  }

  function handleDownloadIssueTemplate() {
    if (!teamId || !projectId || !workspace) return;

    startExportTransition(async () => {
      try {
        const searchParams = new URLSearchParams({
          mode: "template",
          project: workspace.project.name,
        });
        const response = await fetch(
          `/api/teams/${teamId}/projects/${projectId}/issues/excel?${searchParams.toString()}`,
          { cache: "no-store" },
        );

        await downloadResponseFile(
          response,
          `${workspace.project.name}-issues-template.xlsx`,
        );
        toast.success("Issue template downloaded.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not download the issue template.",
        );
      }
    });
  }

  function handleImportIssuesFromExcel(file: File) {
    if (!teamId || !projectId) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Upload an .xlsx Excel file.");
      return;
    }

    startImportTransition(async () => {
      try {
        const formData = new FormData();

        formData.append("file", file);

        const response = await fetch(
          `/api/teams/${teamId}/projects/${projectId}/issues/excel`,
          {
            method: "POST",
            body: formData,
          },
        );
        const result = (await response.json().catch(() => null)) as
          | IssueExcelImportResponse
          | {
              message?: string;
            }
          | null;

        if (!response.ok) {
          const message =
            result && "message" in result ? result.message : undefined;
          throw new Error(message ?? "Could not import the Excel file.");
        }

        const importResult = result as IssueExcelImportResponse;

        setSelectedIssueIds([]);
        setPageIndex(0);
        refresh();
        toast.success(importResult.message);

        if (importResult.warnings.length > 0) {
          toast.warning(`${importResult.warnings.length} import warnings`, {
            description: importResult.warnings.slice(0, 2).join("\n"),
          });
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not import the Excel file.",
        );
      }
    });
  }

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting((currentSorting) => {
      const nextSorting =
        typeof updater === "function" ? updater(currentSorting) : updater;
      return nextSorting.length > 0 ? nextSorting : DEFAULT_SORTING;
    });
    setPageIndex(0);
  };

  if (!hasRequiredParams) {
    return (
      <ProjectError
        title="Project not found"
        message="The route is missing a team id or project id."
      />
    );
  }

  if (loadError && !workspace) {
    return <ProjectError title="Could not load project" message={loadError} />;
  }

  if (!workspace) {
    return <ProjectWorkflowLoading view={activeView} />;
  }

  const project = workspace.project;
  const planningDetail =
    view === "release-detail" && routeReleaseId
      ? {
          target: workspace.releases.find(
            (release) => release.id === routeReleaseId,
          ),
          assignmentKind: "release" as const,
          collectionLabel: "Releases" as const,
          listHref: `${basePath}/releases`,
        }
      : view === "sprint-detail" && routeSprintId
        ? {
            target: workspace.sprints.find(
              (sprint) => sprint.id === routeSprintId,
            ),
            assignmentKind: "sprint" as const,
            collectionLabel: "Sprints" as const,
            listHref: `${basePath}/sprints`,
          }
        : view === "epic-detail" && routeEpicId
          ? {
              target: workspace.epics.find((epic) => epic.id === routeEpicId),
              assignmentKind: "epic" as const,
              collectionLabel: "Epics" as const,
              listHref: `${basePath}/epics`,
            }
          : null;
  const pageCount = pagination?.totalPages ?? 1;
  const currentPageIndex = Math.max(0, (pagination?.page ?? 1) - 1);
  const showIssueFilters =
    !isPlanningDetailView &&
    (activeView === "board" ||
      activeView === "issues" ||
      activeView === "backlog" ||
      activeView === "modules");
  const componentsForForm =
    issueForm.moduleId === NONE_VALUE
      ? workspace.components
      : workspace.components.filter(
          (component) => component.moduleId === issueForm.moduleId,
        );
  const bulkActionBar =
    canEdit && selectedIssueIds.length > 0 ? (
      <IssueBulkActionBar
        selectedCount={selectedIssueIds.length}
        pending={isSavingIssue}
        modules={workspace.modules}
        components={workspace.components}
        epics={workspace.epics}
        sprints={workspace.sprints}
        releases={workspace.releases}
        members={workspace.members}
        onApply={handleBulkIssueUpdate}
        onClearSelection={() => setSelectedIssueIds([])}
      />
    ) : null;
  const sharedIssueViewProps = {
    viewMode,
    setViewMode,
    isLoading,
    sorting,
    onSortingChange: handleSortingChange,
    pageIndex: currentPageIndex,
    pageSize,
    pageCount,
    onPageIndexChange: setPageIndex,
    onPageSizeChange: setPageSize,
    onEditIssue: openEditIssueDialog,
    onDeleteIssue: setIssueToDelete,
    onExport: handleExportIssuesToExcel,
    onDownloadTemplate: handleDownloadIssueTemplate,
    onImportExcel: handleImportIssuesFromExcel,
    isExporting,
    isImportingExcel,
    totalIssueCount: pagination?.totalItems ?? issues.length,
    selectedIssueIds,
    onSelectedIssueIdsChange: setSelectedIssueIds,
    bulkActionBar,
    currentMember: currentUser,
    onClaimIssue: handleClaimIssue,
    claimActionPending: isSavingIssue,
  };

  return (
    <div className="min-w-0 space-y-2">
      {showIssueFilters ? (
        <WorkflowFilters
          search={search}
          typeFilters={typeFilters}
          statusFilters={statusFilters}
          moduleFilters={moduleFilters}
          componentFilters={componentFilters}
          epicFilters={epicFilters}
          sprintFilters={sprintFilters}
          releaseFilters={releaseFilters}
          priorityFilters={priorityFilters}
          assignmentFilter={assignmentFilter}
          modules={workspace.modules}
          components={filteredComponents}
          epics={workspace.epics}
          sprints={workspace.sprints}
          releases={workspace.releases}
          activeView={activeView}
          onSearchChange={(value) => {
            setSearch(value);
            resetToFirstPage();
          }}
          onTypeFiltersChange={(values) => {
            setTypeFilters(values);
            resetToFirstPage();
          }}
          onStatusFiltersChange={(values) => {
            setStatusFilters(values);
            resetToFirstPage();
          }}
          onModuleFiltersChange={(values) => {
            setModuleFilters(values);
            setComponentFilters((currentComponentFilters) => {
              if (values.length === 0 || !workspace)
                return currentComponentFilters;

              const allowedComponentIds = new Set(
                workspace.components
                  .filter((component) => values.includes(component.moduleId))
                  .map((component) => component.id),
              );

              return currentComponentFilters.filter((componentId) =>
                allowedComponentIds.has(componentId),
              );
            });
            resetToFirstPage();
          }}
          onComponentFiltersChange={(values) => {
            setComponentFilters(values);
            resetToFirstPage();
          }}
          onEpicFiltersChange={(values) => {
            setEpicFilters(values);
            resetToFirstPage();
          }}
          onSprintFiltersChange={(values) => {
            setSprintFilters(values);
            resetToFirstPage();
          }}
          onReleaseFiltersChange={(values) => {
            setReleaseFilters(values);
            resetToFirstPage();
          }}
          onPriorityFiltersChange={(values) => {
            setPriorityFilters(values);
            resetToFirstPage();
          }}
          onAssignmentFilterChange={(value) => {
            setAssignmentFilter(value);
            resetToFirstPage();
          }}
          onClearFilters={clearFilters}
        />
      ) : null}

      {activeView === "summary" ? (
        <SummaryView
          summary={summary}
          issues={issues}
          criticalIssues={criticalIssues}
          epics={workspace.epics}
          currentUserId={currentUser?.userId ?? null}
          onOpenIssue={openIssue}
        />
      ) : null}

      {activeView === "board" ? (
        <BoardView
          issues={issues}
          issueByStatus={issueByStatus}
          epics={workspace.epics}
          epicCounts={epicCounts}
          releases={workspace.releases}
          releaseCounts={releaseCounts}
          basePath={basePath}
          {...sharedIssueViewProps}
          canEdit={canEdit}
          onOpenIssue={openIssue}
          onStatusDrop={handleStatusDrop}
          onEpicStatusDrop={handleEpicStatusDrop}
          onReleaseStatusDrop={handleReleaseStatusDrop}
          isUpdating={isSavingIssue}
          onIssueSelectionChange={handleIssueSelectionChange}
          onCreateIssue={openCreateIssueDialog}
        />
      ) : null}

      {activeView === "issues" || activeView === "backlog" ? (
        <IssueCollectionView
          title={activeView === "issues" ? "Issues" : "Backlog"}
          description={
            activeView === "issues"
              ? "All issues in this project, with spreadsheet-friendly columns for tracking and bulk review."
              : "Issues without an active sprint and not marked fixed."
          }
          issues={issues}
          {...sharedIssueViewProps}
          canEdit={canEdit}
          onOpenIssue={openIssue}
          toolbarActions={
            canEdit ? (
              <Button type="button" size="sm" onClick={openCreateIssueDialog}>
                <Plus className="h-3.5 w-3.5" />
                Issue
              </Button>
            ) : null
          }
        />
      ) : null}

      {activeView === "modules" ? (
        <ModulesView
          modules={workspace.modules}
          components={workspace.components}
          moduleCounts={moduleCounts}
          componentCounts={componentCounts}
          issues={issues}
          canEdit={canEdit}
          onOpenIssue={openIssue}
          onCreateModule={() => entityDialogs.setIsModuleDialogOpen(true)}
          onCreateComponent={entityDialogs.openComponentDialog}
          {...sharedIssueViewProps}
        />
      ) : null}

      {activeView === "releases" && !isPlanningDetailView ? (
        <ReleasesView
          releases={workspace.releases}
          counts={releaseCounts}
          issues={issues}
          canEdit={canEdit}
          onOpenIssue={openIssue}
          onCreateRelease={() => entityDialogs.setIsReleaseDialogOpen(true)}
          basePath={basePath}
          {...sharedIssueViewProps}
        />
      ) : null}

      {activeView === "epics" && !isPlanningDetailView ? (
        <EpicsView
          epics={workspace.epics}
          counts={epicCounts}
          issues={issues}
          canEdit={canEdit}
          onOpenIssue={openIssue}
          onCreateEpic={() => entityDialogs.setIsEpicDialogOpen(true)}
          basePath={basePath}
          {...sharedIssueViewProps}
        />
      ) : null}

      {activeView === "sprints" && !isPlanningDetailView ? (
        <SprintsView
          sprints={workspace.sprints}
          counts={sprintCounts}
          issues={issues}
          canEdit={canEdit}
          onOpenIssue={openIssue}
          onCreateSprint={() => entityDialogs.setIsSprintDialogOpen(true)}
          basePath={basePath}
          {...sharedIssueViewProps}
        />
      ) : null}

      {isPlanningDetailView ? (
        planningDetail?.target ? (
          <PlanningDetailView
            collectionLabel={planningDetail.collectionLabel}
            entityName={planningDetail.target.name}
            listHref={planningDetail.listHref}
            issues={issues}
            canEdit={canEdit}
            onOpenIssue={openIssue}
            onAssignIssues={() =>
              setAssignmentTarget({
                kind: planningDetail.assignmentKind,
                id: planningDetail.target!.id,
                name: planningDetail.target!.name,
              })
            }
            {...sharedIssueViewProps}
          />
        ) : (
          <EmptyState
            title="Planning item not found"
            description="This release, sprint, or epic could not be loaded for the current project."
          />
        )
      ) : null}

      {activeView === "settings" ? (
        <SettingsView projectPrefix={project.keyPrefix} />
      ) : null}

      {view === "issue" ? (
        selectedIssue ? (
          <IssueDetailContent
            issue={selectedIssue}
            onEdit={canEdit ? openEditIssueDialog : undefined}
          />
        ) : (
          <EmptyState
            title="Issue not found"
            description="The issue key in the URL could not be loaded."
          />
        )
      ) : null}

      {assignmentTarget ? (
        <PlanningAssignmentDialog
          key={`${assignmentTarget.kind}:${assignmentTarget.id}`}
          open
          pending={isSavingIssue}
          teamId={teamId!}
          projectId={projectId!}
          workspace={workspace}
          target={assignmentTarget}
          onOpenChange={(open) => !open && setAssignmentTarget(null)}
          onAssign={handlePlanningIssueAssignment}
        />
      ) : null}

      <WorkflowDialogStack
        selectedIssue={selectedIssue}
        canEdit={canEdit}
        isIssueSheetOpen={isIssueSheetOpen}
        isIssueDialogOpen={isIssueDialogOpen}
        isSavingIssue={isSavingIssue}
        issueForm={issueForm}
        workspace={workspace}
        issues={issues}
        editingIssue={editingIssue}
        componentsForForm={componentsForForm}
        currentUserId={currentUser?.userId ?? null}
        isModuleDialogOpen={entityDialogs.isModuleDialogOpen}
        isSavingModule={entityDialogs.isSavingModule}
        moduleForm={entityDialogs.moduleForm}
        isComponentDialogOpen={entityDialogs.isComponentDialogOpen}
        isSavingComponent={entityDialogs.isSavingComponent}
        componentForm={entityDialogs.componentForm}
        isEpicDialogOpen={entityDialogs.isEpicDialogOpen}
        isSavingEpic={entityDialogs.isSavingEpic}
        epicForm={entityDialogs.epicForm}
        isReleaseDialogOpen={entityDialogs.isReleaseDialogOpen}
        isSavingRelease={entityDialogs.isSavingRelease}
        releaseForm={entityDialogs.releaseForm}
        isSprintDialogOpen={entityDialogs.isSprintDialogOpen}
        isSavingSprint={entityDialogs.isSavingSprint}
        sprintForm={entityDialogs.sprintForm}
        issueToDelete={issueToDelete}
        isDeletingIssue={isDeletingIssue}
        onIssueSheetOpenChange={(open) => {
          setIsIssueSheetOpen(open);
          if (!open && view === "issue") router.push(`${basePath}/issues`);
        }}
        onEditIssue={openEditIssueDialog}
        onIssueDialogOpenChange={setIsIssueDialogOpen}
        onIssueFormChange={setIssueForm}
        onIssueSubmit={handleIssueSubmit}
        onModuleDialogOpenChange={entityDialogs.setIsModuleDialogOpen}
        onModuleFormChange={entityDialogs.setModuleForm}
        onModuleSubmit={entityDialogs.handleModuleSubmit}
        onComponentDialogOpenChange={entityDialogs.setIsComponentDialogOpen}
        onComponentFormChange={entityDialogs.setComponentForm}
        onComponentSubmit={entityDialogs.handleComponentSubmit}
        onEpicDialogOpenChange={entityDialogs.setIsEpicDialogOpen}
        onEpicFormChange={entityDialogs.setEpicForm}
        onEpicSubmit={entityDialogs.handleEpicSubmit}
        onReleaseDialogOpenChange={entityDialogs.setIsReleaseDialogOpen}
        onReleaseFormChange={entityDialogs.setReleaseForm}
        onReleaseSubmit={entityDialogs.handleReleaseSubmit}
        onSprintDialogOpenChange={entityDialogs.setIsSprintDialogOpen}
        onSprintFormChange={entityDialogs.setSprintForm}
        onSprintSubmit={entityDialogs.handleSprintSubmit}
        onDeleteDialogOpenChange={(open) => !open && setIssueToDelete(null)}
        onDeleteIssue={handleDeleteIssue}
        onDeleteIssueRequest={setIssueToDelete}
        onRemoveIssueMedia={handleRemoveIssueMedia}
      />
    </div>
  );
}

function ProjectWorkflowLoading({ view }: { view: ProjectWorkflowView }) {
  if (view === "board") {
    return (
      <div className="space-y-4">
        <PageHeadingSkeleton />
        <div className="grid min-h-[32rem] gap-3 overflow-hidden xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, columnIndex) => (
            <div
              key={columnIndex}
              className="rounded-lg border border-border/70 bg-muted/20 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-6 rounded-full" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((__, cardIndex) => (
                  <Skeleton key={cardIndex} className="h-28 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "modules" || view === "components" || view === "reports") {
    return (
      <div className="space-y-4">
        <PageHeadingSkeleton />
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-border/70 bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64 max-w-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "summary") {
    return (
      <div className="space-y-5">
        <PageHeadingSkeleton />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeadingSkeleton />
      <Skeleton className="h-9 rounded-full" />
      <Skeleton className="h-[28rem] rounded-xl" />
    </div>
  );
}

function PageHeadingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-[32rem] max-w-full" />
    </div>
  );
}
