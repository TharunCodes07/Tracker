export type TeamAccessLevel = "edit" | "read";

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

export interface TeamMemberMutationResponse {
  member: TeamMemberListItem;
  message: string;
}

export interface TeamsListResponse {
  teams: TeamListItem[];
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
