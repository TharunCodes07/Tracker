import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { teamMemberRoles, teams, user, usersToTeams } from "@/db/schema";
import { RouteError } from "@/routes/errors";

import type {
  ListTeamsInput,
  TeamInviteCandidate,
  TeamAccessLevel,
  TeamListItem,
  TeamMemberListItem,
  TeamMemberRole,
  TeamMembersResponse,
  TeamMembershipStatus,
  TeamPendingInviteListItem,
  TeamPendingJoinRequestListItem,
  TeamsListResponse,
  TeamVisibility,
} from "./types";

const teamCreator = alias(user, "team_creator");
const actorMembership = alias(usersToTeams, "actor_membership");

const activeMembershipCounts = db
  .select({
    teamId: usersToTeams.teamId,
    memberCount: count(usersToTeams.userId).as("member_count"),
  })
  .from(usersToTeams)
  .where(eq(usersToTeams.membershipStatus, "active"))
  .groupBy(usersToTeams.teamId)
  .as("active_membership_counts");

const pendingMembershipCounts = db
  .select({
    teamId: usersToTeams.teamId,
    pendingRequestCount: count(usersToTeams.userId).as("pending_request_count"),
  })
  .from(usersToTeams)
  .where(eq(usersToTeams.membershipStatus, "pending"))
  .groupBy(usersToTeams.teamId)
  .as("pending_membership_counts");

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeTeamAccessLevel(value: string | null | undefined): TeamAccessLevel {
  switch (value) {
    case "owner":
    case "edit":
      return value;
    case "read":
    default:
      return "read";
  }
}

function normalizeTeamVisibility(value: string | null | undefined): TeamVisibility {
  return value === "public" ? "public" : "private";
}

function normalizeTeamMembershipStatus(value: string | null | undefined): TeamMembershipStatus {
  switch (value) {
    case "active":
    case "pending":
    case "invited":
      return value;
    default:
      return "none";
  }
}

function normalizeTeamMemberRole(value: string | null | undefined): TeamMemberRole | null {
  switch (value) {
    case "developer":
    case "tester":
      return value;
    default:
      return null;
  }
}

function sortTeamMemberRoles(roles: TeamMemberRole[]) {
  const order = new Map<TeamMemberRole, number>([
    ["developer", 0],
    ["tester", 1],
  ]);

  return [...roles].sort((left, right) => (order.get(left) ?? 999) - (order.get(right) ?? 999));
}

function toTeamMemberListItem(
  row: {
    userId: string;
    name: string | null;
    email: string | null;
    accessLevel: string | null;
  },
  roles: string[],
  currentUserId: string
): TeamMemberListItem {
  const accessLevel = normalizeTeamAccessLevel(row.accessLevel);
  const normalizedRoles = sortTeamMemberRoles(
    Array.from(
      new Set(
        roles
          .map((role) => normalizeTeamMemberRole(role))
          .filter((role): role is TeamMemberRole => role !== null)
      )
    )
  );

  return {
    userId: row.userId,
    name: row.name ?? "Unknown member",
    email: row.email ?? "No email",
    isOwner: accessLevel === "owner",
    isCurrentUser: row.userId === currentUserId,
    accessLevel,
    roles: normalizedRoles,
  };
}

function toPendingJoinRequestListItem(row: {
  userId: string;
  name: string | null;
  email: string | null;
  accessLevel: string | null;
}): TeamPendingJoinRequestListItem {
  const normalizedAccessLevel = normalizeTeamAccessLevel(row.accessLevel);

  return {
    userId: row.userId,
    name: row.name ?? "Unknown requester",
    email: row.email ?? "No email",
    requestedAccessLevel: normalizedAccessLevel === "owner" ? "edit" : normalizedAccessLevel,
  };
}

function toPendingInviteListItem(row: {
  userId: string;
  name: string | null;
  email: string | null;
  accessLevel: string | null;
}): TeamPendingInviteListItem {
  const normalizedAccessLevel = normalizeTeamAccessLevel(row.accessLevel);

  return {
    userId: row.userId,
    name: row.name ?? "Unknown invitee",
    email: row.email ?? "No email",
    invitedAccessLevel: normalizedAccessLevel === "owner" ? "edit" : normalizedAccessLevel,
  };
}

function matchesKeyword(search: string, keyword: string) {
  return keyword.includes(search) || search.includes(keyword);
}

function buildVisibleTeamsClause(userId: string) {
  return or(eq(actorMembership.userId, userId), eq(teams.visibility, "public")) ?? sql`false`;
}

function buildTeamSearchCondition(userId: string, search: string) {
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    return undefined;
  }

  const pattern = `%${normalizedSearch}%`;
  const loweredSearch = normalizedSearch.toLowerCase();
  const searchConditions: SQL[] = [
    ilike(teams.name, pattern),
    ilike(teams.description, pattern),
    ilike(teams.joinCode, pattern),
    ilike(teamCreator.name, pattern),
  ];

  if (matchesKeyword(loweredSearch, "owner")) {
    searchConditions.push(
      and(
        eq(actorMembership.membershipStatus, "active"),
        eq(actorMembership.accessLevel, "owner")
      ) ?? sql`false`
    );
  }

  if (matchesKeyword(loweredSearch, "member")) {
    searchConditions.push(eq(actorMembership.membershipStatus, "active"));
  }

  if (matchesKeyword(loweredSearch, "edit")) {
    searchConditions.push(
      and(
        eq(actorMembership.membershipStatus, "active"),
        eq(actorMembership.accessLevel, "edit")
      ) ?? sql`false`
    );
  }

  if (matchesKeyword(loweredSearch, "read")) {
    searchConditions.push(
      and(
        eq(actorMembership.membershipStatus, "active"),
        eq(actorMembership.accessLevel, "read")
      ) ?? sql`false`
    );
  }

  if (matchesKeyword(loweredSearch, "pending")) {
    searchConditions.push(eq(actorMembership.membershipStatus, "pending"));
  }

  if (matchesKeyword(loweredSearch, "invited") || matchesKeyword(loweredSearch, "invite")) {
    searchConditions.push(eq(actorMembership.membershipStatus, "invited"));
  }

  if (matchesKeyword(loweredSearch, "public")) {
    searchConditions.push(eq(teams.visibility, "public"));
  }

  if (matchesKeyword(loweredSearch, "private")) {
    searchConditions.push(eq(teams.visibility, "private"));
  }

  return or(...searchConditions) ?? undefined;
}

function buildTeamWhereClause(userId: string, search = "") {
  const visibilityCondition = buildVisibleTeamsClause(userId);
  const searchCondition = buildTeamSearchCondition(userId, search);

  return searchCondition
    ? and(visibilityCondition, searchCondition) ?? visibilityCondition
    : visibilityCondition;
}

function buildTeamOrderBy(
  input: Pick<ListTeamsInput, "sortBy" | "sortDirection">,
  memberCountExpression: SQL,
  pendingRequestCountExpression: SQL
) {
  const accessLevelExpression = sql<string>`case
    when ${actorMembership.membershipStatus} = 'pending' then 'pending'
    when ${actorMembership.membershipStatus} = 'invited' then 'invited'
    else coalesce(${actorMembership.accessLevel}, '')
  end`;
  const direction = input.sortDirection;

  switch (input.sortBy) {
    case "name":
      return direction === "asc"
        ? [asc(teams.name), desc(teams.createdAt), asc(teams.id)]
        : [desc(teams.name), desc(teams.createdAt), asc(teams.id)];
    case "createdByName":
      return direction === "asc"
        ? [asc(teamCreator.name), asc(teams.name), asc(teams.id)]
        : [desc(teamCreator.name), asc(teams.name), asc(teams.id)];
    case "memberCount":
      return direction === "asc"
        ? [asc(memberCountExpression), asc(teams.name), asc(teams.id)]
        : [desc(memberCountExpression), asc(teams.name), asc(teams.id)];
    case "accessLevel":
      return direction === "asc"
        ? [asc(accessLevelExpression), desc(pendingRequestCountExpression), asc(teams.name), asc(teams.id)]
        : [desc(accessLevelExpression), desc(pendingRequestCountExpression), asc(teams.name), asc(teams.id)];
    case "joinCode":
      return direction === "asc"
        ? [asc(teams.joinCode), asc(teams.name), asc(teams.id)]
        : [desc(teams.joinCode), asc(teams.name), asc(teams.id)];
    case "createdAt":
    default:
      return direction === "asc"
        ? [asc(teams.createdAt), asc(teams.name), asc(teams.id)]
        : [desc(teams.createdAt), asc(teams.name), asc(teams.id)];
  }
}

async function getTeamsSummaryForUser(userId: string) {
  const [summaryRow] = await db
    .select({
      totalTeams: count(teams.id),
      ownedTeams: sql<number>`cast(
        coalesce(
          sum(
            case
              when ${actorMembership.membershipStatus} = 'active' and ${actorMembership.accessLevel} = 'owner'
                then 1
              else 0
            end
          ),
          0
        ) as integer
      )`,
    })
    .from(teams)
    .leftJoin(
      actorMembership,
      and(eq(actorMembership.teamId, teams.id), eq(actorMembership.userId, userId))
    )
    .where(buildVisibleTeamsClause(userId));

  return {
    totalTeams: Number(summaryRow?.totalTeams ?? 0),
    ownedTeams: Number(summaryRow?.ownedTeams ?? 0),
  };
}

async function getFilteredTeamsCountForUser(userId: string, search: string) {
  const [countRow] = await db
    .select({
      totalItems: count(teams.id),
    })
    .from(teams)
    .leftJoin(
      actorMembership,
      and(eq(actorMembership.teamId, teams.id), eq(actorMembership.userId, userId))
    )
    .leftJoin(teamCreator, eq(teams.createdBy, teamCreator.id))
    .where(buildTeamWhereClause(userId, search));

  return Number(countRow?.totalItems ?? 0);
}

async function getTeamRowsForUser(userId: string, input: ListTeamsInput) {
  const memberCountExpression = sql<number>`cast(coalesce(${activeMembershipCounts.memberCount}, 0) as integer)`;
  const pendingRequestCountExpression = sql<number>`cast(coalesce(${pendingMembershipCounts.pendingRequestCount}, 0) as integer)`;

  return db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      visibility: teams.visibility,
      joinCode: teams.joinCode,
      createdAt: teams.createdAt,
      createdByName: teamCreator.name,
      memberCount: memberCountExpression.as("member_count"),
      pendingRequestCount: pendingRequestCountExpression.as("pending_request_count"),
      accessLevel: actorMembership.accessLevel,
      membershipStatus: actorMembership.membershipStatus,
    })
    .from(teams)
    .leftJoin(
      actorMembership,
      and(eq(actorMembership.teamId, teams.id), eq(actorMembership.userId, userId))
    )
    .leftJoin(teamCreator, eq(teams.createdBy, teamCreator.id))
    .leftJoin(activeMembershipCounts, eq(activeMembershipCounts.teamId, teams.id))
    .leftJoin(pendingMembershipCounts, eq(pendingMembershipCounts.teamId, teams.id))
    .where(buildTeamWhereClause(userId, input.search))
    .orderBy(...buildTeamOrderBy(input, memberCountExpression, pendingRequestCountExpression))
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);
}

function toTeamListItem(row: {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  joinCode: string;
  createdAt: Date | string;
  createdByName: string | null;
  memberCount: number | string | null;
  pendingRequestCount: number | string | null;
  accessLevel: string | null;
  membershipStatus: string | null;
}): TeamListItem {
  const membershipStatus = normalizeTeamMembershipStatus(row.membershipStatus);
  const isMember = membershipStatus === "active";
  const accessLevel = isMember ? normalizeTeamAccessLevel(row.accessLevel) : null;
  const isOwner = accessLevel === "owner";
  const canEdit = accessLevel === "owner" || accessLevel === "edit";

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: normalizeTeamVisibility(row.visibility),
    joinCode: isMember ? row.joinCode : null,
    createdAt: toIsoString(row.createdAt),
    createdByName: row.createdByName ?? "Unknown creator",
    memberCount: Number(row.memberCount ?? 0),
    pendingRequestCount: Number(row.pendingRequestCount ?? 0),
    isMember,
    isOwner,
    accessLevel,
    membershipStatus,
    canEdit: isMember && canEdit,
    canRequestAccess: membershipStatus === "none",
    canAcceptInvite: membershipStatus === "invited",
  };
}

export async function listTeamsForUser(
  userId: string,
  input: ListTeamsInput
): Promise<TeamsListResponse> {
  const [summary, totalItems] = await Promise.all([
    getTeamsSummaryForUser(userId),
    getFilteredTeamsCountForUser(userId, input.search),
  ]);

  const totalPages = totalItems > 0 ? Math.ceil(totalItems / input.pageSize) : 1;
  const page = Math.max(1, Math.min(input.page, totalPages));
  const rows = await getTeamRowsForUser(userId, {
    ...input,
    page,
  });

  return {
    teams: rows.map(toTeamListItem),
    summary,
    pagination: {
      page,
      pageSize: input.pageSize,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
}

export async function getTeamForUser(userId: string, teamId: string) {
  const memberCountExpression = sql<number>`cast(coalesce(${activeMembershipCounts.memberCount}, 0) as integer)`;
  const pendingRequestCountExpression = sql<number>`cast(coalesce(${pendingMembershipCounts.pendingRequestCount}, 0) as integer)`;

  const [row] = await db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      visibility: teams.visibility,
      joinCode: teams.joinCode,
      createdAt: teams.createdAt,
      createdByName: teamCreator.name,
      memberCount: memberCountExpression.as("member_count"),
      pendingRequestCount: pendingRequestCountExpression.as("pending_request_count"),
      accessLevel: usersToTeams.accessLevel,
      membershipStatus: usersToTeams.membershipStatus,
    })
    .from(usersToTeams)
    .innerJoin(teams, eq(usersToTeams.teamId, teams.id))
    .leftJoin(teamCreator, eq(teams.createdBy, teamCreator.id))
    .leftJoin(activeMembershipCounts, eq(activeMembershipCounts.teamId, teams.id))
    .leftJoin(pendingMembershipCounts, eq(pendingMembershipCounts.teamId, teams.id))
    .where(
      and(
        eq(usersToTeams.userId, userId),
        eq(usersToTeams.teamId, teamId),
        eq(usersToTeams.membershipStatus, "active")
      )
    )
    .limit(1);

  return row ? toTeamListItem(row) : null;
}

export async function listTeamMembersForUser(
  userId: string,
  teamId: string
): Promise<TeamMembersResponse | null> {
  const team = await getTeamForUser(userId, teamId);

  if (!team) {
    return null;
  }

  const membershipStatuses = team.isOwner ? ["active", "pending", "invited"] : ["active"];

  const [membershipRows, roleRows] = await Promise.all([
    db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        accessLevel: usersToTeams.accessLevel,
        membershipStatus: usersToTeams.membershipStatus,
      })
      .from(usersToTeams)
      .innerJoin(user, eq(usersToTeams.userId, user.id))
      .where(
        and(
          eq(usersToTeams.teamId, teamId),
          or(
            ...membershipStatuses.map((membershipStatus) =>
              eq(usersToTeams.membershipStatus, membershipStatus)
            )
          )
        )
      ),
    db
      .select({
        userId: teamMemberRoles.userId,
        role: teamMemberRoles.role,
      })
      .from(teamMemberRoles)
      .where(eq(teamMemberRoles.teamId, teamId)),
  ]);

  const rolesByUserId = new Map<string, string[]>();

  for (const roleRow of roleRows) {
    const existingRoles = rolesByUserId.get(roleRow.userId);

    if (existingRoles) {
      existingRoles.push(roleRow.role);
    } else {
      rolesByUserId.set(roleRow.userId, [roleRow.role]);
    }
  }

  const members = membershipRows
    .filter((row) => row.membershipStatus === "active")
    .map((row) => toTeamMemberListItem(row, rolesByUserId.get(row.userId) ?? [], userId))
    .sort((left, right) => {
      if (left.isOwner !== right.isOwner) {
        return left.isOwner ? -1 : 1;
      }

      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    });

  const pendingRequests = team.isOwner
    ? membershipRows
        .filter((row) => row.membershipStatus === "pending")
        .map(toPendingJoinRequestListItem)
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
    : [];

  const pendingInvites = team.isOwner
    ? membershipRows
        .filter((row) => row.membershipStatus === "invited")
        .map(toPendingInviteListItem)
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
    : [];

  return {
    team,
    members,
    pendingRequests,
    pendingInvites,
  };
}

export async function getTeamMemberForUser(
  userId: string,
  teamId: string,
  memberUserId: string
) {
  const teamMembers = await listTeamMembersForUser(userId, teamId);

  if (!teamMembers) {
    return null;
  }

  return teamMembers.members.find((member) => member.userId === memberUserId) ?? null;
}

export async function searchTeamInviteCandidatesForUser(
  userId: string,
  teamId: string,
  query: string
): Promise<{ candidates: TeamInviteCandidate[]; query: string } | null> {
  const team = await getTeamForUser(userId, teamId);

  if (!team) {
    return null;
  }

  if (!team.isOwner) {
    throw new RouteError("Only a team owner can search invite candidates.", 403);
  }

  const normalizedQuery = query.trim().slice(0, 120);

  if (normalizedQuery.length < 2) {
    return {
      candidates: [],
      query: normalizedQuery,
    };
  }

  const [actor] = await db
    .select({ organizationId: user.organizationId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const candidateMembership = alias(usersToTeams, "candidate_membership");
  const pattern = `%${normalizedQuery}%`;
  const membershipOrder = sql<number>`case
    when ${candidateMembership.membershipStatus} is null then 0
    when ${candidateMembership.membershipStatus} = 'invited' then 1
    when ${candidateMembership.membershipStatus} = 'pending' then 2
    when ${candidateMembership.membershipStatus} = 'active' then 3
    else 4
  end`;

  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      membershipStatus: candidateMembership.membershipStatus,
    })
    .from(user)
    .leftJoin(
      candidateMembership,
      and(eq(candidateMembership.userId, user.id), eq(candidateMembership.teamId, teamId))
    )
    .where(
      and(
        ne(user.id, userId),
        actor?.organizationId ? eq(user.organizationId, actor.organizationId) : sql`false`,
        or(ilike(user.email, pattern), ilike(user.name, pattern))
      )
    )
    .orderBy(asc(membershipOrder), asc(user.email))
    .limit(8);

  return {
    candidates: rows.map((row) => ({
      userId: row.userId,
      name: row.name,
      email: row.email,
      membershipStatus:
        row.membershipStatus === "active" ||
        row.membershipStatus === "pending" ||
        row.membershipStatus === "invited"
          ? row.membershipStatus
          : "none",
    })),
    query: normalizedQuery,
  };
}
