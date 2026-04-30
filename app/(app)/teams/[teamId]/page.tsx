"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Grid2x2,
  List,
  Plus,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { ProjectCard } from "@/components/projects/project-card";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { getProjectTableColumns } from "@/components/projects/project-table-columns";
import {
  ProjectsGridSkeleton,
  ProjectsTableSkeleton,
} from "@/components/projects/projects-view-skeleton";
import { TeamMembersDialog } from "@/components/teams/team-members-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { GridView } from "@/components/ui/grid-view";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePersistedViewMode } from "@/hooks/use-persisted-view-mode";
import type {
  CreateProjectInput,
  ProjectDeleteResponse,
  ProjectListItem,
  ProjectListPagination,
  ProjectListSortDirection,
  ProjectListSortField,
  ProjectMutationResponse,
  TeamProjectsResponse,
  TeamProjectsSummary,
  UpdateProjectInput,
} from "@/routes/projects/types";
import type {
  TeamListItem,
  TeamAccessLevel,
  TeamInviteCandidate,
  TeamInviteMemberResponse,
  TeamInviteSearchResponse,
  TeamMemberListItem,
  TeamJoinRequestMutationResponse,
  TeamMemberMutationResponse,
  TeamMembersResponse,
  UpdateTeamMemberInput,
} from "@/routes/teams/types";

const DEFAULT_SORTING: SortingState = [{ id: "createdAt", desc: true }];
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100];
const SEARCH_DEBOUNCE_MS = 300;
const TEAM_PROJECTS_VIEW_STORAGE_KEY = "team-projects:view-mode";
const EMPTY_PAGINATION: ProjectListPagination = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};
const EMPTY_SUMMARY: TeamProjectsSummary = {
  totalProjects: 0,
};
const PROJECT_GRID_SORT_OPTIONS: Array<{
  value: string;
  label: string;
  sorting: SortingState;
}> = [
  { value: "createdAt-desc", label: "Newest first", sorting: [{ id: "createdAt", desc: true }] },
  { value: "createdAt-asc", label: "Oldest first", sorting: [{ id: "createdAt", desc: false }] },
  { value: "name-asc", label: "Name A-Z", sorting: [{ id: "name", desc: false }] },
  { value: "name-desc", label: "Name Z-A", sorting: [{ id: "name", desc: true }] },
  { value: "issueCount-desc", label: "Most issues", sorting: [{ id: "issueCount", desc: true }] },
  { value: "issueCount-asc", label: "Least issues", sorting: [{ id: "issueCount", desc: false }] },
];

function sortingEquals(left: SortingState, right: SortingState) {
  const normalizedLeft = normalizeSorting(left);
  const normalizedRight = normalizeSorting(right);
  const [leftSort] = normalizedLeft;
  const [rightSort] = normalizedRight;

  return leftSort?.id === rightSort?.id && leftSort?.desc === rightSort?.desc;
}

function findGridSortOptionValue(sorting: SortingState) {
  return (
    PROJECT_GRID_SORT_OPTIONS.find((option) => sortingEquals(option.sorting, sorting))?.value ??
    PROJECT_GRID_SORT_OPTIONS[0].value
  );
}

function getGridSortingFromValue(value: string) {
  return (
    PROJECT_GRID_SORT_OPTIONS.find((option) => option.value === value)?.sorting ?? DEFAULT_SORTING
  );
}

function normalizeSorting(sorting: SortingState) {
  const [activeSort] = sorting;

  if (!activeSort) {
    return DEFAULT_SORTING;
  }

  return [
    {
      id: activeSort.id,
      desc: activeSort.desc ?? false,
    },
  ] satisfies SortingState;
}

function getSortValues(sorting: SortingState): {
  sortBy: ProjectListSortField;
  sortDirection: ProjectListSortDirection;
} {
  const [activeSort] = normalizeSorting(sorting);

  return {
    sortBy: activeSort.id as ProjectListSortField,
    sortDirection: activeSort.desc ? "desc" : "asc",
  };
}

function buildProjectsRequestUrl(options: {
  teamId: string;
  pageIndex: number;
  pageSize: number;
  search: string;
  sorting: SortingState;
}) {
  const { sortBy, sortDirection } = getSortValues(options.sorting);
  const searchParams = new URLSearchParams({
    page: String(options.pageIndex + 1),
    pageSize: String(options.pageSize),
    sortBy,
    sortDirection,
  });

  if (options.search) {
    searchParams.set("search", options.search);
  }

  return `/api/teams/${options.teamId}/projects?${searchParams.toString()}`;
}

async function requestJson<TResponse>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(data?.message ?? "Request failed.");
  }

  return data as TResponse;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

interface ProjectsPaginationControlsProps {
  pageIndex: number;
  pageSize: number;
  pagination: ProjectListPagination;
  disabled?: boolean;
  onPageIndexChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
}

function ProjectsPaginationControls({
  pageIndex,
  pageSize,
  pagination,
  disabled = false,
  onPageIndexChange,
  onPageSizeChange,
}: ProjectsPaginationControlsProps) {
  const firstItem = pagination.totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const lastItem =
    pagination.totalItems === 0
      ? 0
      : Math.min((pageIndex + 1) * pageSize, pagination.totalItems);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {pagination.totalItems === 0
          ? "No projects to display"
          : `Showing ${firstItem}-${lastItem} of ${pagination.totalItems} projects`}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-[120px]">
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

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageIndexChange(0)}
            disabled={disabled || !pagination.hasPreviousPage}
            aria-label="First page"
          >
            {"<<"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageIndexChange(Math.max(0, pageIndex - 1))}
            disabled={disabled || !pagination.hasPreviousPage}
            aria-label="Previous page"
          >
            {"<"}
          </Button>

          <span className="min-w-[7.5rem] text-center text-sm tabular-nums text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageIndexChange(pageIndex + 1)}
            disabled={disabled || !pagination.hasNextPage}
            aria-label="Next page"
          >
            {">"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageIndexChange(Math.max(0, pagination.totalPages - 1))}
            disabled={disabled || !pagination.hasNextPage}
            aria-label="Last page"
          >
            {">>"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TeamProjectsRoute() {
  const router = useRouter();
  const params = useParams<{ teamId?: string | string[] }>();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
  const hasTeamId = Boolean(teamId);
  const hasAttemptedLoadRef = useRef(false);
  const { viewMode, setViewMode } = usePersistedViewMode(TEAM_PROJECTS_VIEW_STORAGE_KEY);

  const [team, setTeam] = useState<TeamListItem | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [pagination, setPagination] = useState<ProjectListPagination>(EMPTY_PAGINATION);
  const [summary, setSummary] = useState<TeamProjectsSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(hasTeamId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebouncedValue(searchValue.trim(), SEARCH_DEBOUNCE_MS);
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [reloadKey, setReloadKey] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [editingProject, setEditingProject] = useState<ProjectListItem | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<ProjectListItem | null>(null);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [members, setMembers] = useState<TeamMemberListItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TeamMembersResponse["pendingRequests"]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [pendingJoinRequestUserId, setPendingJoinRequestUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const debouncedInviteEmail = useDebouncedValue(inviteEmail.trim(), SEARCH_DEBOUNCE_MS);
  const [inviteCandidates, setInviteCandidates] = useState<TeamInviteCandidate[]>([]);
  const [isInviteSearchLoading, setIsInviteSearchLoading] = useState(false);
  const [inviteSearchError, setInviteSearchError] = useState<string | null>(null);
  const [inviteAccessLevel, setInviteAccessLevel] = useState<Exclude<TeamAccessLevel, "owner">>(
    "edit"
  );

  const [isCreating, startCreateTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isUpdatingMemberSettings, startMemberSettingsTransition] = useTransition();

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();
    const activeTeamId = teamId;

    if (!activeTeamId) {
      return () => {
        isActive = false;
      };
    }

    const resolvedTeamId = activeTeamId;

    if (hasAttemptedLoadRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    async function loadTeamProjects() {
      try {
        const data = await requestJson<TeamProjectsResponse>(
          buildProjectsRequestUrl({
            teamId: resolvedTeamId,
            pageIndex,
            pageSize,
            search: debouncedSearchValue,
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

        setTeam(data.team);
        setProjects(data.projects);
        setPagination(data.pagination);
        setSummary(data.summary);
        setLoadError(null);
      } catch (error) {
        if (!isActive || isAbortError(error)) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Could not load the team projects.";

        setLoadError(message);

        if (!hasAttemptedLoadRef.current) {
          setTeam(null);
          setProjects([]);
          setPagination({ ...EMPTY_PAGINATION, pageSize });
          setSummary(EMPTY_SUMMARY);
        }

        toast.error(message);
      } finally {
        if (isActive) {
          hasAttemptedLoadRef.current = true;
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    void loadTeamProjects();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [debouncedSearchValue, pageIndex, pageSize, sorting, reloadKey, teamId]);

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();
    const query = debouncedInviteEmail;

    if (!isMembersOpen || !team?.id || !team.isOwner || query.length < 2) {
      return () => {
        isActive = false;
      };
    }

    const activeTeamId = team.id;

    async function searchInviteCandidates() {
      try {
        await Promise.resolve();

        if (!isActive) {
          return;
        }

        setInviteCandidates([]);
        setIsInviteSearchLoading(true);
        setInviteSearchError(null);

        const data = await requestJson<TeamInviteSearchResponse>(
          `/api/teams/${activeTeamId}/members/invite?query=${encodeURIComponent(query)}`,
          {
            cache: "no-store",
            signal: abortController.signal,
          }
        );

        if (!isActive) {
          return;
        }

        setInviteCandidates(data.candidates);
      } catch (error) {
        if (!isActive || isAbortError(error)) {
          return;
        }

        setInviteCandidates([]);
        setInviteSearchError(
          error instanceof Error ? error.message : "Could not search users."
        );
      } finally {
        if (isActive) {
          setIsInviteSearchLoading(false);
        }
      }
    }

    void searchInviteCandidates();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [debouncedInviteEmail, isMembersOpen, team?.id, team?.isOwner]);

  if (!hasTeamId) {
    return (
      <div className="rounded-[28px] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-500">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Team not found</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          The route is missing a valid team id.
        </p>
      </div>
    );
  }

  const currentPageIndex = Math.max(0, pagination.page - 1);
  const isGridView = viewMode === "grid";
  const hasAnyProjects = summary.totalProjects > 0;
  const hasVisibleProjects = projects.length > 0;
  const canEditProjects = team?.canEdit ?? false;
  const canManageMemberAccess = team?.isOwner ?? false;
  const canManageMemberRoles = team?.canEdit ?? false;
  const isActionPending = isUpdating || isDeleting;
  const isSearchPending = searchValue.trim() !== debouncedSearchValue;
  const currentGridSortValue = findGridSortOptionValue(sorting);

  function refreshProjects(nextPageIndex?: number) {
    if (typeof nextPageIndex === "number" && nextPageIndex !== pageIndex) {
      setPageIndex(nextPageIndex);
      return;
    }

    setReloadKey((currentValue) => currentValue + 1);
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
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

  function handleGridSortChange(value: string) {
    setSorting(getGridSortingFromValue(value));
    setPageIndex(0);
  }

  function openProject(project: ProjectListItem) {
    if (!team) {
      return;
    }

    router.push(`/teams/${team.id}/projects/${project.id}`);
  }

  function openEditDialog(project: ProjectListItem) {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description ?? "");
  }

  function closeEditDialog(open: boolean) {
    if (!open) {
      setEditingProject(null);
      setEditProjectName("");
      setEditProjectDescription("");
    }
  }

  function openDeleteDialog(project: ProjectListItem) {
    setProjectToDelete(project);
  }

  async function loadMembers() {
    if (!team) {
      return;
    }

    setIsMembersLoading(true);

    try {
      const data = await requestJson<TeamMembersResponse>(`/api/teams/${team.id}/members`);
      setMembers(data.members);
      setPendingRequests(data.pendingRequests);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load team members.");
    } finally {
      setIsMembersLoading(false);
    }
  }

  function handleMembersOpenChange(open: boolean) {
    setIsMembersOpen(open);

    if (open) {
      void loadMembers();
    } else {
      setInviteEmail("");
      setInviteCandidates([]);
      setInviteSearchError(null);
      setIsInviteSearchLoading(false);
      setInviteAccessLevel("edit");
    }
  }

  function handleInviteMember() {
    if (!team) {
      return;
    }

    const email = inviteEmail.trim();

    if (!email) {
      toast.error("Enter an email address to invite.");
      return;
    }

    setPendingJoinRequestUserId("invite");

    startMemberSettingsTransition(async () => {
      try {
        const data = await requestJson<TeamInviteMemberResponse>(
          `/api/teams/${team.id}/members/invite`,
          {
            method: "POST",
            body: JSON.stringify({
              email,
              accessLevel: inviteAccessLevel,
            }),
          }
        );

        await loadMembers();
        refreshProjects();
        setInviteEmail("");
        setInviteCandidates([]);
        setInviteSearchError(null);
        toast.success(data.message);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not send the team invitation."
        );
      } finally {
        setPendingJoinRequestUserId(null);
      }
    });
  }

  function handleMemberChange(memberUserId: string, input: UpdateTeamMemberInput) {
    if (!team) {
      return;
    }

    setPendingMemberId(memberUserId);

    startMemberSettingsTransition(async () => {
      try {
        const data = await requestJson<TeamMemberMutationResponse>(
          `/api/teams/${team.id}/members/${memberUserId}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          }
        );

        setMembers((currentMembers) =>
          currentMembers.map((member) =>
            member.userId === data.member.userId ? data.member : member
          )
        );
        toast.success(data.message);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not update the team member."
        );
      } finally {
        setPendingMemberId(null);
      }
    });
  }

  function handleApproveJoinRequest(memberUserId: string) {
    if (!team) {
      return;
    }

    setPendingJoinRequestUserId(memberUserId);

    startMemberSettingsTransition(async () => {
      try {
        const data = await requestJson<TeamJoinRequestMutationResponse>(
          `/api/teams/${team.id}/join-requests/${memberUserId}`,
          {
            method: "PATCH",
          }
        );

        await loadMembers();
        refreshProjects();
        toast.success(data.message);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not approve the join request."
        );
      } finally {
        setPendingJoinRequestUserId(null);
      }
    });
  }

  function handleRejectJoinRequest(memberUserId: string) {
    if (!team) {
      return;
    }

    setPendingJoinRequestUserId(memberUserId);

    startMemberSettingsTransition(async () => {
      try {
        const data = await requestJson<TeamJoinRequestMutationResponse>(
          `/api/teams/${team.id}/join-requests/${memberUserId}`,
          {
            method: "DELETE",
          }
        );

        await loadMembers();
        refreshProjects();
        toast.success(data.message);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not decline the join request."
        );
      } finally {
        setPendingJoinRequestUserId(null);
      }
    });
  }

  function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!team) {
      return;
    }

    const payload: CreateProjectInput = {
      name: projectName,
      description: projectDescription,
    };

    startCreateTransition(async () => {
      try {
        const data = await requestJson<ProjectMutationResponse>(`/api/teams/${team.id}/projects`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setIsCreateOpen(false);
        setProjectName("");
        setProjectDescription("");
        refreshProjects(0);
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the project.");
      }
    });
  }

  function handleUpdateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!team || !editingProject) {
      return;
    }

    const payload: UpdateProjectInput = {
      name: editProjectName,
      description: editProjectDescription,
    };

    startUpdateTransition(async () => {
      try {
        const data = await requestJson<ProjectMutationResponse>(
          `/api/teams/${team.id}/projects/${editingProject.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        closeEditDialog(false);
        refreshProjects();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update the project.");
      }
    });
  }

  function handleDeleteProject() {
    if (!team || !projectToDelete) {
      return;
    }

    startDeleteTransition(async () => {
      try {
        const data = await requestJson<ProjectDeleteResponse>(
          `/api/teams/${team.id}/projects/${projectToDelete.id}`,
          {
            method: "DELETE",
          }
        );

        if (editingProject?.id === data.deletedProjectId) {
          setEditingProject(null);
          setEditProjectName("");
          setEditProjectDescription("");
        }

        setProjectToDelete(null);
        refreshProjects();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete the project.");
      }
    });
  }

  if (!isLoading && !team) {
    return (
      <div className="rounded-[28px] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-500">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Could not load team</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {loadError ?? "The requested team could not be loaded from this workspace."}
        </p>
      </div>
    );
  }

  const projectTableColumns = team
    ? getProjectTableColumns({
        team,
        onEdit: openEditDialog,
        onDelete: openDeleteDialog,
        actionPending: isActionPending,
      })
    : [];

  function renderEmptyState() {
    const title = loadError && !hasAnyProjects
      ? "Could not load projects"
      : hasAnyProjects
        ? "No matching projects"
        : "No projects yet";
    const description = loadError && !hasAnyProjects
      ? loadError
      : hasAnyProjects
        ? "Adjust the current search or switch views if you want a different scan of this team."
        : "Start a project under this team so work stays grouped with the right members.";

    return (
      <div className="rounded-[28px] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-500">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        {loadError && !hasAnyProjects ? (
          <div className="mt-5 flex justify-center">
            <Button type="button" variant="outline" onClick={() => refreshProjects()}>
              Retry
            </Button>
          </div>
        ) : hasAnyProjects ? (
          searchValue.trim() ? (
            <div className="mt-5 flex justify-center">
              <Button type="button" variant="outline" onClick={() => handleSearchChange("")}>
                Clear search
              </Button>
            </div>
          ) : null
        ) : canEditProjects ? (
          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90"
            >
              Create your first project
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-linear-to-br from-card via-card to-emerald-400/5 px-5 py-6 shadow-[0_24px_60px_-36px_rgba(16,185,129,0.35)] sm:px-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_52%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className="border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Team projects
              </Badge>
              {isLoading ? (
                <Skeleton className="h-6 w-20 rounded-full" />
              ) : team ? (
                <>
                  <Badge variant={team.isOwner ? "default" : "secondary"}>
                    {team.isOwner ? "Owner" : "Member"}
                  </Badge>
                  {!team.isOwner ? (
                    <Badge variant={team.canEdit ? "outline" : "secondary"}>
                      {team.canEdit ? "Edit access" : "Read access"}
                    </Badge>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="space-y-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-64 max-w-full" />
                  <Skeleton className="h-4 w-[32rem] max-w-full" />
                  <Skeleton className="h-4 w-[24rem] max-w-full" />
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {team?.name}
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {team?.description ??
                      "Manage the projects inside this team with the same grid and table workflow used on the teams screen."}
                  </p>
                </>
              )}
            </div>

            <div className="inline-flex flex-wrap overflow-hidden rounded-2xl border border-border/60 bg-background/65 shadow-sm backdrop-blur">
              <div className="min-w-[9.5rem] px-4 py-3">
                <div className="text-sm text-muted-foreground">Total projects</div>
                {isLoading ? (
                  <Skeleton className="mt-2 h-8 w-14" />
                ) : (
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                    {summary.totalProjects}
                  </div>
                )}
              </div>

              <div className="h-auto w-px bg-border/60" />

              <div className="min-w-[11rem] px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UsersRound className="h-4 w-4 text-cyan-400" />
                  Team members
                </div>
                {isLoading ? (
                  <Skeleton className="mt-2 h-8 w-14" />
                ) : (
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                    {team?.memberCount ?? 0}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 xl:max-w-2xl">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-1 left-1 z-10 flex w-8 items-center justify-center rounded-xl bg-background/40 backdrop-blur-sm">
                <Search className="h-4 w-4 text-foreground/50" />
              </div>
              <Input
                value={searchValue}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by project name or description"
                className="h-10 rounded-2xl border-border/60 bg-background/80 pl-10 shadow-sm backdrop-blur"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex w-full items-center rounded-2xl border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur sm:w-auto">
                  <Button
                    type="button"
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    className="flex-1 rounded-xl sm:flex-none"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid2x2 className="h-4 w-4" />
                    Grid
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    className="flex-1 rounded-xl sm:flex-none"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="h-4 w-4" />
                    Table
                  </Button>
                </div>

                {isGridView ? (
                  <Select value={currentGridSortValue} onValueChange={handleGridSortChange}>
                    <SelectTrigger className="h-10 w-full rounded-2xl border-border/60 bg-background/80 shadow-sm sm:w-[180px]">
                      <SelectValue placeholder="Sort projects" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {PROJECT_GRID_SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Skeleton className="h-8 w-32 rounded-xl" />
                  <Skeleton className="h-8 w-28 rounded-xl" />
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleMembersOpenChange(true)}
                  >
                    <UsersRound className="h-4 w-4" />
                    View members
                  </Button>
                  {canEditProjects ? (
                    <Button
                      type="button"
                      onClick={() => setIsCreateOpen(true)}
                      className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.24)] hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      New project
                    </Button>
                  ) : (
                    <Badge variant="outline" className="w-fit">
                      Read-only as team member
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {!isLoading && (isRefreshing || isSearchPending) ? (
              <div className="text-xs text-muted-foreground">
                {isSearchPending ? "Waiting for search..." : "Updating projects..."}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isGridView ? (
        isLoading ? (
          <ProjectsGridSkeleton />
        ) : (
          <div className="space-y-4">
            <GridView
              items={projects}
              getKey={(project) => project.id}
              onItemClick={openProject}
              getItemAriaLabel={(project) => `Open ${project.name}`}
              itemClassName="to-emerald-400/[0.03]"
              renderItem={(project) => (
                <ProjectCard
                  project={project}
                  team={team as TeamListItem}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  actionPending={isActionPending}
                />
              )}
              emptyState={renderEmptyState()}
            />

            {pagination.totalItems > 0 ? (
              <section className="rounded-[24px] border border-border/60 bg-card/80 px-4 py-3 shadow-sm">
                <ProjectsPaginationControls
                  pageIndex={currentPageIndex}
                  pageSize={pageSize}
                  pagination={pagination}
                  disabled={isRefreshing}
                  onPageIndexChange={setPageIndex}
                  onPageSizeChange={handlePageSizeChange}
                />
              </section>
            ) : null}
          </div>
        )
      ) : isLoading ? (
        <ProjectsTableSkeleton rows={Math.min(pageSize, 8)} />
      ) : (
        <section className="rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Project table</h2>
              <p className="text-sm text-muted-foreground">
                Dense view for sorting by issue count, name, or creation date.
              </p>
            </div>

            <Badge variant="outline" className="w-fit">
              {pagination.totalItems} {pagination.totalItems === 1 ? "project" : "projects"}
            </Badge>
          </div>

          {hasVisibleProjects ? (
            <DataTable
              columns={projectTableColumns}
              data={projects}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              pageIndex={currentPageIndex}
              pageSize={pageSize}
              pageCount={pagination.totalPages}
              onPageIndexChange={setPageIndex}
              onPageSizeChange={handlePageSizeChange}
              onRowClick={openProject}
            />
          ) : (
            renderEmptyState()
          )}
        </section>
      )}

      <ProjectDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        name={projectName}
        description={projectDescription}
        pending={isCreating}
        onNameChange={setProjectName}
        onDescriptionChange={setProjectDescription}
        onSubmit={handleCreateProject}
      />

      <ProjectDialog
        open={Boolean(editingProject)}
        onOpenChange={closeEditDialog}
        title="Edit Project"
        descriptionText="Update the project name or description for everyone in this team."
        submitLabel="Save changes"
        name={editProjectName}
        description={editProjectDescription}
        pending={isUpdating}
        onNameChange={setEditProjectName}
        onDescriptionChange={setEditProjectDescription}
        onSubmit={handleUpdateProject}
      />

      <TeamMembersDialog
        open={isMembersOpen}
        onOpenChange={handleMembersOpenChange}
        teamName={team?.name ?? "this team"}
        members={members}
        pendingRequests={pendingRequests}
        isLoading={isMembersLoading}
        canManageMemberAccess={canManageMemberAccess}
        canManageMemberRoles={canManageMemberRoles}
        pendingMemberId={isUpdatingMemberSettings ? pendingMemberId : null}
        pendingJoinRequestUserId={isUpdatingMemberSettings ? pendingJoinRequestUserId : null}
        inviteEmail={inviteEmail}
        inviteCandidates={inviteCandidates}
        inviteSearchPending={isInviteSearchLoading}
        inviteSearchError={inviteSearchError}
        inviteAccessLevel={inviteAccessLevel}
        invitePending={isUpdatingMemberSettings && pendingJoinRequestUserId === "invite"}
        onMemberChange={handleMemberChange}
        onApproveRequest={handleApproveJoinRequest}
        onRejectRequest={handleRejectJoinRequest}
        onInviteEmailChange={setInviteEmail}
        onInviteCandidateSelect={(candidate) => setInviteEmail(candidate.email)}
        onInviteAccessLevelChange={(value) =>
          setInviteAccessLevel((value ?? "edit") as Exclude<TeamAccessLevel, "owner">)
        }
        onInviteSubmit={handleInviteMember}
      />

      <AlertDialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete project</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete
                ? `Delete ${projectToDelete.name}? If this team is the only mapping, the project record will be deleted too.`
                : "Delete this project?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteProject}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
