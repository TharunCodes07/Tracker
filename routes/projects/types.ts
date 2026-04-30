import type { TeamListItem } from "@/routes/teams/types";
import type { TeamAccessLevel } from "@/routes/teams/types";

export const PROJECT_LIST_SORT_FIELDS = ["createdAt", "name", "issueCount"] as const;
export const USER_PROJECT_LIST_SORT_FIELDS = [
  "createdAt",
  "name",
  "issueCount",
  "teamName",
] as const;

export type ProjectListSortField = (typeof PROJECT_LIST_SORT_FIELDS)[number];
export type ProjectListSortDirection = "asc" | "desc";
export type UserProjectListSortField = (typeof USER_PROJECT_LIST_SORT_FIELDS)[number];
export type UserProjectListSortDirection = "asc" | "desc";

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  issueCount: number;
  createdAt: string;
}

export interface UserProjectListItem extends ProjectListItem {
  teamId: string;
  teamName: string;
  teamAccessLevel: TeamAccessLevel;
  teamCanEdit: boolean;
}

export interface ListTeamProjectsInput {
  page: number;
  pageSize: number;
  search: string;
  sortBy: ProjectListSortField;
  sortDirection: ProjectListSortDirection;
}

export interface ListUserProjectsInput {
  page: number;
  pageSize: number;
  search: string;
  sortBy: UserProjectListSortField;
  sortDirection: UserProjectListSortDirection;
}

export interface TeamProjectsSummary {
  totalProjects: number;
}

export interface UserProjectsSummary {
  totalProjects: number;
  editableProjects: number;
}

export interface ProjectListPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface TeamProjectsResponse {
  team: TeamListItem;
  projects: ProjectListItem[];
  summary: TeamProjectsSummary;
  pagination: ProjectListPagination;
}

export interface UserProjectsResponse {
  projects: UserProjectListItem[];
  summary: UserProjectsSummary;
  pagination: ProjectListPagination;
}

export interface ProjectMutationResponse {
  project: ProjectListItem;
  message: string;
}

export interface ProjectDeleteResponse {
  deletedProjectId: string;
  message: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
}

export interface UpdateProjectInput {
  name: string;
  description?: string | null;
}
