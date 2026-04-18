import type { TeamListItem } from "@/routes/teams/types";

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  issueCount: number;
  createdAt: string;
}

export interface TeamProjectsResponse {
  team: TeamListItem;
  projects: ProjectListItem[];
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
