export type TeamAccessLevel = "edit" | "read";

export const TEAM_LIST_SORT_FIELDS = [
  "createdAt",
  "name",
  "createdByName",
  "memberCount",
  "accessLevel",
  "joinCode",
] as const;

export type TeamListSortField = (typeof TEAM_LIST_SORT_FIELDS)[number];
export type TeamListSortDirection = "asc" | "desc";

export interface TeamListItem {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  createdAt: string;
  createdByName: string;
  memberCount: number;
  isOwner: boolean;
  accessLevel: TeamAccessLevel;
  canEdit: boolean;
}

export interface TeamMemberListItem {
  userId: string;
  name: string;
  email: string;
  isOwner: boolean;
  isCurrentUser: boolean;
  accessLevel: TeamAccessLevel;
}

export interface TeamMembersResponse {
  team: TeamListItem;
  members: TeamMemberListItem[];
}

export interface ListTeamsInput {
  page: number;
  pageSize: number;
  search: string;
  sortBy: TeamListSortField;
  sortDirection: TeamListSortDirection;
}

export interface TeamsListSummary {
  totalTeams: number;
  ownedTeams: number;
}

export interface TeamListPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface TeamMemberMutationResponse {
  member: TeamMemberListItem;
  message: string;
}

export interface TeamsListResponse {
  teams: TeamListItem[];
  summary: TeamsListSummary;
  pagination: TeamListPagination;
}

export interface TeamMutationResponse {
  team: TeamListItem;
  message: string;
}

export interface TeamDeleteResponse {
  deletedTeamId: string;
  message: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string | null;
}

export interface UpdateTeamInput {
  name: string;
  description?: string | null;
}

export interface JoinTeamInput {
  code: string;
}

export interface UpdateTeamMemberAccessInput {
  accessLevel: TeamAccessLevel;
}
