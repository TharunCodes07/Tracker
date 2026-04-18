"use client";

import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";

import type { SortingState } from "@tanstack/react-table";
import { useParams } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { usePersistedViewMode } from "@/hooks/use-persisted-view-mode";
import type {
  CreateProjectInput,
  ProjectDeleteResponse,
  ProjectListItem,
  ProjectMutationResponse,
  TeamProjectsResponse,
  UpdateProjectInput,
} from "@/routes/projects/types";
import type {
  TeamAccessLevel,
  TeamListItem,
  TeamMemberListItem,
  TeamMemberMutationResponse,
  TeamMembersResponse,
} from "@/routes/teams/types";

const DEFAULT_SORTING: SortingState = [{ id: "createdAt", desc: true }];
const DEFAULT_PAGE_SIZE = 10;
const TEAM_PROJECTS_VIEW_STORAGE_KEY = "team-projects:view-mode";

function filterProjects(projects: ProjectListItem[], searchValue: string) {
  const normalizedQuery = searchValue.trim().toLowerCase();

  if (!normalizedQuery) {
    return projects;
  }

  return projects.filter((project) =>
    [project.name, project.description ?? ""].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    )
  );
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function sortProjects(projects: ProjectListItem[], sorting: SortingState) {
  const [activeSort] = sorting;

  if (!activeSort) {
    return [...projects];
  }

  const sortedProjects = [...projects].sort((left, right) => {
    switch (activeSort.id) {
      case "issueCount":
        return left.issueCount - right.issueCount;
      case "createdAt":
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      case "name":
      default:
        return compareText(left.name, right.name);
    }
  });

  return activeSort.desc ? sortedProjects.reverse() : sortedProjects;
}

function upsertProject(projects: ProjectListItem[], nextProject: ProjectListItem) {
  return [nextProject, ...projects.filter((project) => project.id !== nextProject.id)];
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

export default function TeamProjectsRoute() {
  const params = useParams<{ teamId?: string | string[] }>();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
  const hasTeamId = Boolean(teamId);

  const [team, setTeam] = useState<TeamListItem | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(hasTeamId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { viewMode, setViewMode } = usePersistedViewMode(TEAM_PROJECTS_VIEW_STORAGE_KEY);
  const [searchValue, setSearchValue] = useState("");
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [editingProject, setEditingProject] = useState<ProjectListItem | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<ProjectListItem | null>(null);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [members, setMembers] = useState<TeamMemberListItem[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);

  const [isCreating, startCreateTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isUpdatingMemberAccess, startMemberAccessTransition] = useTransition();

  useEffect(() => {
    let isActive = true;

    if (!teamId) {
      return () => {
        isActive = false;
      };
    }

    async function loadTeamProjects() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const data = await requestJson<TeamProjectsResponse>(`/api/teams/${teamId}/projects`);

        if (!isActive) {
          return;
        }

        setTeam(data.team);
        setProjects(data.projects);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Could not load the team projects.";

        setTeam(null);
        setProjects([]);
        setLoadError(message);
        toast.error(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTeamProjects();

    return () => {
      isActive = false;
    };
  }, [teamId]);

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

  const filteredProjects = filterProjects(projects, searchValue);
  const sortedProjects = sortProjects(filteredProjects, sorting);
  const projectTableColumns = team
    ? getProjectTableColumns({
        team,
        onEdit: openEditDialog,
        onDelete: openDeleteDialog,
        actionPending: isUpdating || isDeleting,
      })
    : [];
  const pageCount = Math.max(1, Math.ceil(sortedProjects.length / pageSize));
  const currentPageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const paginatedProjects = sortedProjects.slice(
    currentPageIndex * pageSize,
    (currentPageIndex + 1) * pageSize
  );
  const isGridView = viewMode === "grid";
  const canEditProjects = team?.canEdit ?? false;
  const canManageMembers = team?.isOwner ?? false;

  function handleSearchChange(value: string) {
    setSearchValue(value);
    setPageIndex(0);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPageIndex(0);
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
    }
  }

  function handleMemberAccessChange(memberUserId: string, accessLevel: TeamAccessLevel) {
    if (!team) {
      return;
    }

    setPendingMemberId(memberUserId);

    startMemberAccessTransition(async () => {
      try {
        const data = await requestJson<TeamMemberMutationResponse>(
          `/api/teams/${team.id}/members/${memberUserId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ accessLevel }),
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
          error instanceof Error ? error.message : "Could not update member access."
        );
      } finally {
        setPendingMemberId(null);
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

        setProjects((currentProjects) => upsertProject(currentProjects, data.project));
        setPageIndex(0);
        setIsCreateOpen(false);
        setProjectName("");
        setProjectDescription("");
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

        setProjects((currentProjects) => upsertProject(currentProjects, data.project));
        closeEditDialog(false);
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

        setProjects((currentProjects) =>
          currentProjects.filter((project) => project.id !== data.deletedProjectId)
        );
        if (editingProject?.id === data.deletedProjectId) {
          setEditingProject(null);
          setEditProjectName("");
          setEditProjectDescription("");
        }
        setProjectToDelete(null);
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
                <div className="text-sm text-muted-foreground">Projects</div>
                {isLoading ? (
                  <Skeleton className="mt-2 h-8 w-14" />
                ) : (
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                    {projects.length}
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
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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

              {isLoading ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Skeleton className="h-8 w-32 rounded-xl" />
                  <Skeleton className="h-8 w-28 rounded-xl" />
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => handleMembersOpenChange(true)}>
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
          </div>
        </div>
      </section>

      {isGridView ? (
        isLoading ? (
          <ProjectsGridSkeleton />
        ) : team ? (
          <GridView
            items={sortedProjects}
            getKey={(project) => project.id}
            itemClassName="to-emerald-400/[0.03]"
            renderItem={(project) => (
              <ProjectCard
                project={project}
                team={team}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                actionPending={isUpdating || isDeleting}
              />
            )}
            emptyState={
              <div className="rounded-[28px] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-500">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground">
                  {projects.length === 0 ? "No projects yet" : "No matching projects"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {projects.length === 0
                    ? "Start a project under this team so work stays grouped with the right members."
                    : "Adjust the current search or switch to table view if you want a denser scan."}
                </p>
                {projects.length === 0 && canEditProjects ? (
                  <div className="mt-5 flex justify-center">
                    <Button
                      onClick={() => setIsCreateOpen(true)}
                      className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90"
                    >
                      Create your first project
                    </Button>
                  </div>
                ) : null}
              </div>
            }
          />
        ) : null
      ) : isLoading ? (
        <ProjectsTableSkeleton rows={Math.min(pageSize, 8)} />
      ) : team ? (
        <section className="rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Project table</h2>
              <p className="text-sm text-muted-foreground">
                Dense view for scanning project names, ownership, and team members.
              </p>
            </div>

            <Badge variant="outline" className="w-fit">
              {sortedProjects.length} {sortedProjects.length === 1 ? "project" : "projects"}
            </Badge>
          </div>

          <DataTable
            columns={projectTableColumns}
            data={paginatedProjects}
            sorting={sorting}
            onSortingChange={setSorting}
            pageIndex={currentPageIndex}
            pageSize={pageSize}
            pageCount={pageCount}
            onPageIndexChange={setPageIndex}
            onPageSizeChange={handlePageSizeChange}
          />
        </section>
      ) : null}

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
        isLoading={isMembersLoading}
        canManageMembers={canManageMembers}
        pendingMemberId={isUpdatingMemberAccess ? pendingMemberId : null}
        onAccessChange={handleMemberAccessChange}
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
