export const TEAM_ACCESS_LEVEL_OPTIONS = [
  { value: "owner", label: "Owner access" },
  { value: "edit", label: "Edit access" },
  { value: "read", label: "Read access" },
] as const;
export type TeamAccessLevel = (typeof TEAM_ACCESS_LEVEL_OPTIONS)[number]["value"];

export const TEAM_VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
] as const;
export type TeamVisibility = (typeof TEAM_VISIBILITY_OPTIONS)[number]["value"];

export type TeamMembershipStatus = "active" | "pending" | "invited" | "none";

export const TEAM_MEMBER_ROLE_OPTIONS = [
  { value: "developer", label: "Developer" },
  { value: "tester", label: "Tester" },
] as const;
export type TeamMemberRole = (typeof TEAM_MEMBER_ROLE_OPTIONS)[number]["value"];

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
  visibility: TeamVisibility;
  joinCode: string | null;
  createdAt: string;
  createdByName: string;
  memberCount: number;
  pendingRequestCount: number;
  isMember: boolean;
  isOwner: boolean;
  accessLevel: TeamAccessLevel | null;
  membershipStatus: TeamMembershipStatus;
  canEdit: boolean;
  canRequestAccess: boolean;
  canAcceptInvite: boolean;
}

export interface TeamMemberListItem {
  userId: string;
  name: string;
  email: string;
  isOwner: boolean;
  isCurrentUser: boolean;
  accessLevel: TeamAccessLevel;
  roles: TeamMemberRole[];
}

export interface TeamPendingJoinRequestListItem {
  userId: string;
  name: string;
  email: string;
  requestedAccessLevel: Exclude<TeamAccessLevel, "owner">;
}

export interface TeamPendingInviteListItem {
  userId: string;
  name: string;
  email: string;
  invitedAccessLevel: Exclude<TeamAccessLevel, "owner">;
}

export interface TeamInviteCandidate {
  userId: string;
  name: string;
  email: string;
  membershipStatus: TeamMembershipStatus;
}

export interface TeamMembersResponse {
  team: TeamListItem;
  members: TeamMemberListItem[];
  pendingRequests: TeamPendingJoinRequestListItem[];
  pendingInvites: TeamPendingInviteListItem[];
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

export interface JoinTeamMutationResponse {
  teamId: string;
  message: string;
}

export interface TeamInviteAcceptanceResponse {
  teamId: string;
  message: string;
}

export interface TeamDeleteResponse {
  deletedTeamId: string;
  message: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string | null;
  visibility: TeamVisibility;
}

export interface UpdateTeamInput {
  name: string;
  description?: string | null;
  visibility: TeamVisibility;
}

export interface JoinTeamInput {
  code?: string;
  teamId?: string;
}

export interface UpdateTeamMemberInput {
  accessLevel?: TeamAccessLevel;
  roles?: TeamMemberRole[];
}

export interface TeamJoinRequestMutationResponse {
  memberUserId: string;
  message: string;
}

export interface TeamInviteMemberInput {
  email: string;
  accessLevel?: Exclude<TeamAccessLevel, "owner">;
}

export interface TeamInviteMemberResponse {
  memberUserId: string;
  message: string;
}

export interface TeamInviteSearchResponse {
  candidates: TeamInviteCandidate[];
  query: string;
}
