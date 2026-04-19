import type { TeamListItem } from "@/routes/teams/types";

export const PROJECT_LIST_SORT_FIELDS = ["createdAt", "name", "issueCount"] as const;

export type ProjectListSortField = (typeof PROJECT_LIST_SORT_FIELDS)[number];
export type ProjectListSortDirection = "asc" | "desc";

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  issueCount: number;
  createdAt: string;
}

export interface ListTeamProjectsInput {
  page: number;
  pageSize: number;
  search: string;
  sortBy: ProjectListSortField;
  sortDirection: ProjectListSortDirection;
}

export interface TeamProjectsSummary {
  totalProjects: number;
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
