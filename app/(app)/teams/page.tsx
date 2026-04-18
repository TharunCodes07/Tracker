"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import type { FormEvent } from "react";

import type { SortingState } from "@tanstack/react-table";
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
import { Skeleton } from "@/components/ui/skeleton";
import type {
  CreateTeamInput,
  JoinTeamInput,
  TeamDeleteResponse,
  TeamListItem,
  TeamMutationResponse,
  TeamsListResponse,
  UpdateTeamInput,
} from "@/routes/teams/types";

type ViewMode = "grid" | "table";

const DEFAULT_SORTING: SortingState = [{ id: "createdAt", desc: true }];
const DEFAULT_PAGE_SIZE = 10;
const TEAMS_VIEW_STORAGE_KEY = "teams:view-mode";
const teamsViewModeListeners = new Set<() => void>();

function getStoredTeamsViewMode(): ViewMode {
  if (typeof window === "undefined") {
    return "grid";
  }

  try {
    const storedViewMode = window.localStorage.getItem(TEAMS_VIEW_STORAGE_KEY);

    return storedViewMode === "table" ? "table" : "grid";
  } catch {
    return "grid";
  }
}

function subscribeToTeamsViewMode(onStoreChange: () => void) {
  teamsViewModeListeners.add(onStoreChange);

  if (typeof window === "undefined") {
    return () => {
      teamsViewModeListeners.delete(onStoreChange);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === TEAMS_VIEW_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    teamsViewModeListeners.delete(onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function setStoredTeamsViewMode(nextViewMode: ViewMode) {
  try {
    window.localStorage.setItem(TEAMS_VIEW_STORAGE_KEY, nextViewMode);
  } catch {
    // Ignore storage access errors to avoid blocking the UI.
  }

  for (const listener of teamsViewModeListeners) {
    listener();
  }
}

function filterTeams(teams: TeamListItem[], searchValue: string) {
  const normalizedQuery = searchValue.trim().toLowerCase();

  if (!normalizedQuery) {
    return teams;
  }

  return teams.filter((team) =>
    [team.name, team.description ?? "", team.createdByName, team.joinCode].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    )
  );
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function sortTeams(teams: TeamListItem[], sorting: SortingState) {
  const [activeSort] = sorting;

  if (!activeSort) {
    return [...teams];
  }

  const sortedTeams = [...teams].sort((left, right) => {
    switch (activeSort.id) {
      case "name":
        return compareText(left.name, right.name);
      case "createdByName":
        return compareText(left.createdByName, right.createdByName);
      case "memberCount":
        return left.memberCount - right.memberCount;
      case "joinCode":
        return compareText(left.joinCode, right.joinCode);
      case "createdAt":
      default:
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    }
  });

  return activeSort.desc ? sortedTeams.reverse() : sortedTeams;
}

function upsertTeam(teams: TeamListItem[], nextTeam: TeamListItem) {
  return [nextTeam, ...teams.filter((team) => team.id !== nextTeam.id)];
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

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const viewMode = useSyncExternalStore(
    subscribeToTeamsViewMode,
    getStoredTeamsViewMode,
    () => "grid"
  );
  const [searchValue, setSearchValue] = useState("");
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");

  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const [editingTeam, setEditingTeam] = useState<TeamListItem | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [teamToDelete, setTeamToDelete] = useState<TeamListItem | null>(null);

  const [isCreating, startCreateTransition] = useTransition();
  const [isJoining, startJoinTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    let isActive = true;

    async function loadTeams() {
      try {
        const data = await requestJson<TeamsListResponse>("/api/teams");

        if (!isActive) {
          return;
        }

        setTeams(data.teams);
      } catch (error) {
        if (!isActive) {
          return;
        }

        toast.error(error instanceof Error ? error.message : "Could not load teams.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTeams();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredTeams = filterTeams(teams, searchValue);
  const sortedTeams = sortTeams(filteredTeams, sorting);
  const teamTableColumns = getTeamTableColumns({
    onEdit: openEditDialog,
    onDelete: openDeleteDialog,
    onCopyCode: copyJoinCode,
    actionPending: isUpdating || isDeleting,
  });
  const pageCount = Math.max(1, Math.ceil(sortedTeams.length / pageSize));
  const currentPageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const paginatedTeams = sortedTeams.slice(
    currentPageIndex * pageSize,
    (currentPageIndex + 1) * pageSize
  );
  const ownedTeamCount = teams.filter((team) => team.isOwner).length;
  const isGridView = viewMode === "grid";

  function handleSearchChange(value: string) {
    setSearchValue(value);
    setPageIndex(0);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPageIndex(0);
  }

  function openEditDialog(team: TeamListItem) {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamDescription(team.description ?? "");
  }

  function closeEditDialog(open: boolean) {
    if (!open) {
      setEditingTeam(null);
      setEditTeamName("");
      setEditTeamDescription("");
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
    };

    startCreateTransition(async () => {
      try {
        const data = await requestJson<TeamMutationResponse>("/api/teams", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setTeams((currentTeams) => upsertTeam(currentTeams, data.team));
        setPageIndex(0);
        setIsCreateOpen(false);
        setTeamName("");
        setTeamDescription("");
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
        const data = await requestJson<TeamMutationResponse>("/api/teams/join", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setTeams((currentTeams) => upsertTeam(currentTeams, data.team));
        setPageIndex(0);
        setIsJoinOpen(false);
        setJoinCode("");
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not join the team.");
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
    };

    startUpdateTransition(async () => {
      try {
        const data = await requestJson<TeamMutationResponse>(`/api/teams/${editingTeam.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        setTeams((currentTeams) => upsertTeam(currentTeams, data.team));
        closeEditDialog(false);
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

        setTeams((currentTeams) =>
          currentTeams.filter((team) => team.id !== data.deletedTeamId)
        );
        if (editingTeam?.id === data.deletedTeamId) {
          setEditingTeam(null);
          setEditTeamName("");
          setEditTeamDescription("");
        }
        setTeamToDelete(null);
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete the team.");
      }
    });
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
                Manage the workspaces you belong to, share join codes, and switch between a fast
                grid overview and the full table.
              </p>
            </div>

            <div className="inline-flex flex-wrap overflow-hidden rounded-2xl border border-border/60 bg-background/65 shadow-sm backdrop-blur">
              <div className="min-w-[9.5rem] px-4 py-3">
                <div className="text-sm text-muted-foreground">Total teams</div>
                {isLoading ? (
                  <Skeleton className="mt-2 h-8 w-14" />
                ) : (
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                    {teams.length}
                  </div>
                )}
              </div>

              <div className="h-auto w-px bg-border/60" />

              <div className="min-w-[11rem] px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Teams you created
                </div>
                {isLoading ? (
                  <Skeleton className="mt-2 h-8 w-14" />
                ) : (
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                    {ownedTeamCount}
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
              <div className="inline-flex w-full items-center rounded-2xl border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur sm:w-auto">
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  className="flex-1 rounded-xl sm:flex-none"
                  onClick={() => setStoredTeamsViewMode("grid")}
                >
                  <Grid2x2 className="h-4 w-4" />
                  Grid
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  className="flex-1 rounded-xl sm:flex-none"
                  onClick={() => setStoredTeamsViewMode("table")}
                >
                  <List className="h-4 w-4" />
                  Table
                </Button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setIsJoinOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Join team
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
          </div>
        </div>
      </section>

      {isGridView ? (
        isLoading ? (
          <TeamsGridSkeleton />
        ) : (
          <GridView
            items={sortedTeams}
            getKey={(team) => team.id}
            itemClassName="to-emerald-400/[0.03]"
            renderItem={(team) => (
              <TeamCard
                team={team}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onCopyCode={copyJoinCode}
                actionPending={isUpdating || isDeleting}
              />
            )}
            emptyState={
              <div className="rounded-[28px] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-500">
                  <UsersRound className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground">
                  {teams.length === 0 ? "No teams yet" : "No matching teams"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {teams.length === 0
                    ? "Create a new team or join an existing one to start collaborating from this workspace."
                    : "Adjust the current search or switch to table view if you want a denser scan."}
                </p>
                {teams.length === 0 ? (
                  <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                    <Button variant="outline" onClick={() => setIsJoinOpen(true)}>
                      Join team
                    </Button>
                    <Button
                      onClick={() => setIsCreateOpen(true)}
                      className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90"
                    >
                      Create your first team
                    </Button>
                  </div>
                ) : null}
              </div>
            }
          />
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
              {sortedTeams.length} {sortedTeams.length === 1 ? "team" : "teams"}
            </Badge>
          </div>

          <DataTable
            columns={teamTableColumns}
            data={paginatedTeams}
            sorting={sorting}
            onSortingChange={setSorting}
            pageIndex={currentPageIndex}
            pageSize={pageSize}
            pageCount={pageCount}
            onPageIndexChange={setPageIndex}
            onPageSizeChange={handlePageSizeChange}
          />
        </section>
      )}

      <TeamDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        name={teamName}
        description={teamDescription}
        pending={isCreating}
        onNameChange={setTeamName}
        onDescriptionChange={setTeamDescription}
        onSubmit={handleCreateTeam}
      />

      <TeamDialog
        open={Boolean(editingTeam)}
        onOpenChange={closeEditDialog}
        title="Edit Team"
        descriptionText="Update the team name or description without changing the join code."
        submitLabel="Save changes"
        name={editTeamName}
        description={editTeamDescription}
        pending={isUpdating}
        onNameChange={setEditTeamName}
        onDescriptionChange={setEditTeamDescription}
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
