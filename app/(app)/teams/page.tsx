"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Grid2x2,
  List,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { JoinTeamDialog } from "@/components/teams/join-team-dialog";
import { TeamCard } from "@/components/teams/team-card";
import { TeamDialog } from "@/components/teams/team-dialog";
import { getTeamTableColumns } from "@/components/teams/team-table-columns";
import {
  TeamsGridSkeleton,
  TeamsTableSkeleton,
} from "@/components/teams/teams-view-skeleton";
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
  CreateTeamInput,
  JoinTeamInput,
  JoinTeamMutationResponse,
  TeamDeleteResponse,
  TeamInviteAcceptanceResponse,
  TeamListItem,
  TeamListPagination,
  TeamListSortDirection,
  TeamListSortField,
  TeamVisibility,
  TeamsListResponse,
  TeamsListSummary,
  TeamMutationResponse,
  UpdateTeamInput,
} from "@/routes/teams/types";

const DEFAULT_SORTING: SortingState = [{ id: "createdAt", desc: true }];
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100];
const SEARCH_DEBOUNCE_MS = 300;
const TEAMS_VIEW_STORAGE_KEY = "teams:view-mode";
const EMPTY_PAGINATION: TeamListPagination = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};
const EMPTY_SUMMARY: TeamsListSummary = {
  totalTeams: 0,
  ownedTeams: 0,
};
const TEAM_GRID_SORT_OPTIONS: Array<{
  value: string;
  label: string;
  sorting: SortingState;
}> = [
  { value: "createdAt-desc", label: "Newest first", sorting: [{ id: "createdAt", desc: true }] },
  { value: "createdAt-asc", label: "Oldest first", sorting: [{ id: "createdAt", desc: false }] },
  { value: "name-asc", label: "Name A-Z", sorting: [{ id: "name", desc: false }] },
  { value: "name-desc", label: "Name Z-A", sorting: [{ id: "name", desc: true }] },
  {
    value: "createdByName-asc",
    label: "Owner A-Z",
    sorting: [{ id: "createdByName", desc: false }],
  },
  {
    value: "createdByName-desc",
    label: "Owner Z-A",
    sorting: [{ id: "createdByName", desc: true }],
  },
  {
    value: "memberCount-desc",
    label: "Most members",
    sorting: [{ id: "memberCount", desc: true }],
  },
  {
    value: "memberCount-asc",
    label: "Least members",
    sorting: [{ id: "memberCount", desc: false }],
  },
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
    TEAM_GRID_SORT_OPTIONS.find((option) => sortingEquals(option.sorting, sorting))?.value ??
    TEAM_GRID_SORT_OPTIONS[0].value
  );
}

function getGridSortingFromValue(value: string) {
  return (
    TEAM_GRID_SORT_OPTIONS.find((option) => option.value === value)?.sorting ?? DEFAULT_SORTING
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
  sortBy: TeamListSortField;
  sortDirection: TeamListSortDirection;
} {
  const [activeSort] = normalizeSorting(sorting);

  return {
    sortBy: activeSort.id as TeamListSortField,
    sortDirection: activeSort.desc ? "desc" : "asc",
  };
}

function buildTeamsRequestUrl(options: {
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

  return `/api/teams?${searchParams.toString()}`;
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

interface TeamsPaginationControlsProps {
  pageIndex: number;
  pageSize: number;
  pagination: TeamListPagination;
  disabled?: boolean;
  onPageIndexChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
}

function TeamsPaginationControls({
  pageIndex,
  pageSize,
  pagination,
  disabled = false,
  onPageIndexChange,
  onPageSizeChange,
}: TeamsPaginationControlsProps) {
  const firstItem = pagination.totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const lastItem =
    pagination.totalItems === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, pagination.totalItems);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {pagination.totalItems === 0
          ? "No teams to display"
          : `Showing ${firstItem}-${lastItem} of ${pagination.totalItems} teams`}
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

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [pagination, setPagination] = useState<TeamListPagination>(EMPTY_PAGINATION);
  const [summary, setSummary] = useState<TeamsListSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasAttemptedLoadRef = useRef(false);
  const { viewMode, setViewMode } = usePersistedViewMode(TEAMS_VIEW_STORAGE_KEY);

  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebouncedValue(searchValue.trim(), SEARCH_DEBOUNCE_MS);
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [reloadKey, setReloadKey] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamVisibility, setTeamVisibility] = useState<TeamVisibility>("private");

  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [pendingRequestTeamId, setPendingRequestTeamId] = useState<string | null>(null);

  const [editingTeam, setEditingTeam] = useState<TeamListItem | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [editTeamVisibility, setEditTeamVisibility] = useState<TeamVisibility>("private");
  const [teamToDelete, setTeamToDelete] = useState<TeamListItem | null>(null);

  const [isCreating, startCreateTransition] = useTransition();
  const [isJoining, startJoinTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();

    if (hasAttemptedLoadRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    async function loadTeams() {
      try {
        const data = await requestJson<TeamsListResponse>(
          buildTeamsRequestUrl({
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

        setTeams(data.teams);
        setPagination(data.pagination);
        setSummary(data.summary);
        setLoadError(null);
      } catch (error) {
        if (!isActive || isAbortError(error)) {
          return;
        }

        const message = error instanceof Error ? error.message : "Could not load teams.";

        setLoadError(message);

        if (!hasAttemptedLoadRef.current) {
          setTeams([]);
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

    void loadTeams();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [debouncedSearchValue, pageIndex, pageSize, sorting, reloadKey]);

  const currentPageIndex = Math.max(0, pagination.page - 1);
  const isGridView = viewMode === "grid";
  const hasAnyTeams = summary.totalTeams > 0;
  const hasVisibleTeams = teams.length > 0;
  const isActionPending = isUpdating || isDeleting;
  const isSearchPending = searchValue.trim() !== debouncedSearchValue;
  const currentGridSortValue = findGridSortOptionValue(sorting);

  function refreshTeams(nextPageIndex?: number) {
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

  function openTeam(team: TeamListItem) {
    if (!team.isMember) {
      return;
    }

    router.push(`/teams/${team.id}`);
  }

  function openEditDialog(team: TeamListItem) {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamDescription(team.description ?? "");
    setEditTeamVisibility(team.visibility);
  }

  function closeEditDialog(open: boolean) {
    if (!open) {
      setEditingTeam(null);
      setEditTeamName("");
      setEditTeamDescription("");
      setEditTeamVisibility("private");
    }
  }

  function openDeleteDialog(team: TeamListItem) {
    setTeamToDelete(team);
  }

  async function copyJoinCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error("Could not copy the join code.");
    }
  }

  function handleCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: CreateTeamInput = {
      name: teamName,
      description: teamDescription,
      visibility: teamVisibility,
    };

    startCreateTransition(async () => {
      try {
        const data = await requestJson<TeamMutationResponse>("/api/teams", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setIsCreateOpen(false);
        setTeamName("");
        setTeamDescription("");
        setTeamVisibility("private");
        refreshTeams(0);
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the team.");
      }
    });
  }

  function handleJoinTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: JoinTeamInput = {
      code: joinCode,
    };

    startJoinTransition(async () => {
      try {
        const data = await requestJson<JoinTeamMutationResponse>("/api/teams/join", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setIsJoinOpen(false);
        setJoinCode("");
        refreshTeams(0);
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not request team access.");
      }
    });
  }

  function handleRequestAccess(team: TeamListItem) {
    setPendingRequestTeamId(team.id);

    startJoinTransition(async () => {
      try {
        const data = await requestJson<JoinTeamMutationResponse>("/api/teams/join", {
          method: "POST",
          body: JSON.stringify({ teamId: team.id } satisfies JoinTeamInput),
        });

        refreshTeams();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not request team access.");
      } finally {
        setPendingRequestTeamId(null);
      }
    });
  }

  function handleAcceptInvite(team: TeamListItem) {
    setPendingRequestTeamId(team.id);

    startJoinTransition(async () => {
      try {
        const data = await requestJson<TeamInviteAcceptanceResponse>(
          `/api/teams/${team.id}/invite`,
          {
            method: "PATCH",
          }
        );

        refreshTeams();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not accept the team invitation.");
      } finally {
        setPendingRequestTeamId(null);
      }
    });
  }

  function handleUpdateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTeam) {
      return;
    }

    const payload: UpdateTeamInput = {
      name: editTeamName,
      description: editTeamDescription,
      visibility: editTeamVisibility,
    };

    startUpdateTransition(async () => {
      try {
        const data = await requestJson<TeamMutationResponse>(`/api/teams/${editingTeam.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        closeEditDialog(false);
        refreshTeams();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update the team.");
      }
    });
  }

  function handleDeleteTeam() {
    if (!teamToDelete) {
      return;
    }

    startDeleteTransition(async () => {
      try {
        const data = await requestJson<TeamDeleteResponse>(`/api/teams/${teamToDelete.id}`, {
          method: "DELETE",
        });

        if (editingTeam?.id === data.deletedTeamId) {
          setEditingTeam(null);
          setEditTeamName("");
          setEditTeamDescription("");
          setEditTeamVisibility("private");
        }

        setTeamToDelete(null);
        refreshTeams();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete the team.");
      }
    });
  }

  const teamTableColumns = getTeamTableColumns({
    onEdit: openEditDialog,
    onDelete: openDeleteDialog,
    onCopyCode: copyJoinCode,
    onRequestAccess: handleRequestAccess,
    onAcceptInvite: handleAcceptInvite,
    actionPending: isActionPending,
    pendingRequestTeamId,
  });

  function renderEmptyState() {
    const title = loadError && !hasAnyTeams
      ? "Could not load teams"
      : hasAnyTeams
        ? "No matching teams"
        : "No teams yet";
    const description = loadError && !hasAnyTeams
      ? loadError
      : hasAnyTeams
        ? "Adjust the current search or switch views if you want a different scan of the same workspace."
        : "Create a team, discover public workspaces, or request access with an invite code.";

    return (
      <div className="rounded-[28px] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-500">
          <UsersRound className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        {loadError && !hasAnyTeams ? (
          <div className="mt-5 flex justify-center">
            <Button type="button" variant="outline" onClick={() => refreshTeams()}>
              Retry
            </Button>
          </div>
        ) : hasAnyTeams ? (
          searchValue.trim() ? (
            <div className="mt-5 flex justify-center">
              <Button type="button" variant="outline" onClick={() => handleSearchChange("")}>
                Clear search
              </Button>
            </div>
          ) : null
        ) : (
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setIsJoinOpen(true)}>
              Request by code
            </Button>
            <Button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90"
            >
              Create your first team
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-linear-to-br from-card via-card to-emerald-400/5 px-5 py-6 shadow-[0_24px_60px_-36px_rgba(16,185,129,0.35)] sm:px-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_52%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <Badge
              variant="outline"
              className="border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Teams workspace
            </Badge>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Teams</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Manage the workspaces you belong to, discover public teams, and request access
                before you join.
              </p>
            </div>

            <div className="inline-flex flex-wrap overflow-hidden rounded-2xl border border-border/60 bg-background/65 shadow-sm backdrop-blur">
              <div className="min-w-[9.5rem] px-4 py-3">
                <div className="text-sm text-muted-foreground">Total teams</div>
                {isLoading ? (
                  <Skeleton className="mt-2 h-8 w-14" />
                ) : (
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                    {summary.totalTeams}
                  </div>
                )}
              </div>

              <div className="h-auto w-px bg-border/60" />

              <div className="min-w-[11rem] px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Teams you own
                </div>
                {isLoading ? (
                  <Skeleton className="mt-2 h-8 w-14" />
                ) : (
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                    {summary.ownedTeams}
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
                placeholder="Search by team, owner, description, or join code"
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
                      <SelectValue placeholder="Sort teams" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {TEAM_GRID_SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setIsJoinOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Request by code
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.24)] hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  New team
                </Button>
              </div>
            </div>

            {!isLoading && (isRefreshing || isSearchPending) ? (
              <div className="text-xs text-muted-foreground">
                {isSearchPending ? "Waiting for search..." : "Updating teams..."}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isGridView ? (
        isLoading ? (
          <TeamsGridSkeleton />
        ) : (
          <div className="space-y-4">
            <GridView
              items={teams}
              getKey={(team) => team.id}
              onItemClick={openTeam}
              getItemAriaLabel={(team) => `Open ${team.name}`}
              itemClassName="to-emerald-400/[0.03]"
              renderItem={(team) => (
                <TeamCard
                  team={team}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  onCopyCode={copyJoinCode}
                  onRequestAccess={handleRequestAccess}
                  onAcceptInvite={handleAcceptInvite}
                  actionPending={isActionPending}
                  pendingRequestTeamId={pendingRequestTeamId}
                />
              )}
              emptyState={renderEmptyState()}
            />

            {pagination.totalItems > 0 ? (
              <section className="rounded-[24px] border border-border/60 bg-card/80 px-4 py-3 shadow-sm">
                <TeamsPaginationControls
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
        <TeamsTableSkeleton rows={Math.min(pageSize, 8)} />
      ) : (
        <section className="rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Team table</h2>
              <p className="text-sm text-muted-foreground">
                Dense view for sorting by owner, join code, or creation date.
              </p>
            </div>

            <Badge variant="outline" className="w-fit">
              {pagination.totalItems} {pagination.totalItems === 1 ? "team" : "teams"}
            </Badge>
          </div>

          {hasVisibleTeams ? (
            <DataTable
              columns={teamTableColumns}
              data={teams}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              pageIndex={currentPageIndex}
              pageSize={pageSize}
              pageCount={pagination.totalPages}
              onPageIndexChange={setPageIndex}
              onPageSizeChange={handlePageSizeChange}
              onRowClick={openTeam}
            />
          ) : (
            renderEmptyState()
          )}
        </section>
      )}

      <TeamDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        name={teamName}
        description={teamDescription}
        visibility={teamVisibility}
        pending={isCreating}
        onNameChange={setTeamName}
        onDescriptionChange={setTeamDescription}
        onVisibilityChange={setTeamVisibility}
        onSubmit={handleCreateTeam}
      />

      <TeamDialog
        open={Boolean(editingTeam)}
        onOpenChange={closeEditDialog}
        title="Edit Team"
        descriptionText="Update the team details, including whether everyone can discover it."
        submitLabel="Save changes"
        name={editTeamName}
        description={editTeamDescription}
        visibility={editTeamVisibility}
        pending={isUpdating}
        onNameChange={setEditTeamName}
        onDescriptionChange={setEditTeamDescription}
        onVisibilityChange={setEditTeamVisibility}
        onSubmit={handleUpdateTeam}
      />

      <JoinTeamDialog
        open={isJoinOpen}
        onOpenChange={setIsJoinOpen}
        code={joinCode}
        pending={isJoining}
        onCodeChange={setJoinCode}
        onSubmit={handleJoinTeam}
      />

      <AlertDialog
        open={Boolean(teamToDelete)}
        onOpenChange={(open) => !open && setTeamToDelete(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete team</AlertDialogTitle>
            <AlertDialogDescription>
              {teamToDelete
                ? `Delete ${teamToDelete.name}? This removes the team and its memberships.`
                : "Delete this team?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteTeam}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
