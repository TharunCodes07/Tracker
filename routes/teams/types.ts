export interface TeamListItem {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  createdAt: string;
  createdByName: string;
  memberCount: number;
  isOwner: boolean;
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
