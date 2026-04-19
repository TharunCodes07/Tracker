import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { teams, user, usersToTeams } from "@/db/schema";

import type {
  ListTeamsInput,
  TeamAccessLevel,
  TeamListItem,
  TeamMemberListItem,
  TeamsListResponse,
} from "./types";

const teamCreator = alias(user, "team_creator");
const teamMembers = alias(usersToTeams, "team_members");

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeTeamAccessLevel(value: string | null | undefined): TeamAccessLevel {
  return value === "read" ? "read" : "edit";
}

function toTeamMemberListItem(
  row: {
    userId: string;
    name: string | null;
    email: string | null;
    accessLevel: string | null;
  },
  ownerUserId: string | null,
  currentUserId: string
): TeamMemberListItem {
  const isOwner = ownerUserId === row.userId;

  return {
    userId: row.userId,
    name: row.name ?? "Unknown member",
    email: row.email ?? "No email",
    isOwner,
    isCurrentUser: row.userId === currentUserId,
    accessLevel: isOwner ? "edit" : normalizeTeamAccessLevel(row.accessLevel),
  };
}

function matchesKeyword(search: string, keyword: string) {
  return keyword.includes(search) || search.includes(keyword);
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
    searchConditions.push(eq(teams.createdBy, userId));
  }

  if (matchesKeyword(loweredSearch, "member")) {
    searchConditions.push(sql`${teams.createdBy} is distinct from ${userId}`);
  }

  if (matchesKeyword(loweredSearch, "edit")) {
    searchConditions.push(
      or(eq(usersToTeams.accessLevel, "edit"), eq(teams.createdBy, userId)) ?? sql`false`
    );
  }

  if (matchesKeyword(loweredSearch, "read")) {
    searchConditions.push(
      and(
        sql`${teams.createdBy} is distinct from ${userId}`,
        eq(usersToTeams.accessLevel, "read")
      ) ?? sql`false`
    );
  }

  return or(...searchConditions) ?? undefined;
}

function buildTeamWhereClause(userId: string, search = "") {
  const searchCondition = buildTeamSearchCondition(userId, search);

  return searchCondition
    ? and(eq(usersToTeams.userId, userId), searchCondition) ?? eq(usersToTeams.userId, userId)
    : eq(usersToTeams.userId, userId);
}

function buildTeamOrderBy(
  input: Pick<ListTeamsInput, "sortBy" | "sortDirection">,
  userId: string,
  memberCountExpression: SQL
) {
  const accessLevelExpression = sql<string>`case
    when ${teams.createdBy} = ${userId} then 'edit'
    else ${usersToTeams.accessLevel}
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
        ? [asc(accessLevelExpression), asc(teams.name), asc(teams.id)]
        : [desc(accessLevelExpression), asc(teams.name), asc(teams.id)];
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
      totalTeams: count(usersToTeams.teamId),
      ownedTeams: sql<number>`cast(
        coalesce(sum(case when ${teams.createdBy} = ${userId} then 1 else 0 end), 0) as integer
      )`,
    })
    .from(usersToTeams)
    .innerJoin(teams, eq(usersToTeams.teamId, teams.id))
    .where(eq(usersToTeams.userId, userId));

  return {
    totalTeams: Number(summaryRow?.totalTeams ?? 0),
    ownedTeams: Number(summaryRow?.ownedTeams ?? 0),
  };
}

async function getFilteredTeamsCountForUser(userId: string, search: string) {
  const [countRow] = await db
    .select({
      totalItems: count(usersToTeams.teamId),
    })
    .from(usersToTeams)
    .innerJoin(teams, eq(usersToTeams.teamId, teams.id))
    .leftJoin(teamCreator, eq(teams.createdBy, teamCreator.id))
    .where(buildTeamWhereClause(userId, search));

  return Number(countRow?.totalItems ?? 0);
}

async function getTeamRowsForUser(userId: string, input: ListTeamsInput) {
  const memberCountExpression = count(teamMembers.userId);

  return db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      joinCode: teams.joinCode,
      createdAt: teams.createdAt,
      createdBy: teams.createdBy,
      createdByName: teamCreator.name,
      memberCount: memberCountExpression.as("member_count"),
      accessLevel: usersToTeams.accessLevel,
    })
    .from(usersToTeams)
    .innerJoin(teams, eq(usersToTeams.teamId, teams.id))
    .leftJoin(teamCreator, eq(teams.createdBy, teamCreator.id))
    .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(buildTeamWhereClause(userId, input.search))
    .groupBy(
      teams.id,
      teams.name,
      teams.description,
      teams.joinCode,
      teams.createdAt,
      teams.createdBy,
      teamCreator.name,
      usersToTeams.accessLevel
    )
    .orderBy(...buildTeamOrderBy(input, userId, memberCountExpression))
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);
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
    teams: rows.map((row) => {
      const isOwner = row.createdBy === userId;
      const accessLevel = normalizeTeamAccessLevel(row.accessLevel);

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        joinCode: row.joinCode,
        createdAt: toIsoString(row.createdAt),
        createdByName: row.createdByName ?? "Unknown owner",
        memberCount: Number(row.memberCount ?? 0),
        isOwner,
        accessLevel,
        canEdit: isOwner || accessLevel === "edit",
      };
    }),
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
  const [row] = await db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      joinCode: teams.joinCode,
      createdAt: teams.createdAt,
      createdBy: teams.createdBy,
      createdByName: teamCreator.name,
      memberCount: count(teamMembers.userId).as("member_count"),
      accessLevel: usersToTeams.accessLevel,
    })
    .from(usersToTeams)
    .innerJoin(teams, eq(usersToTeams.teamId, teams.id))
    .leftJoin(teamCreator, eq(teams.createdBy, teamCreator.id))
    .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(and(eq(usersToTeams.userId, userId), eq(teams.id, teamId)))
    .groupBy(
      teams.id,
      teams.name,
      teams.description,
      teams.joinCode,
      teams.createdAt,
      teams.createdBy,
      teamCreator.name,
      usersToTeams.accessLevel
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const isOwner = row.createdBy === userId;
  const accessLevel = normalizeTeamAccessLevel(row.accessLevel);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    joinCode: row.joinCode,
    createdAt: toIsoString(row.createdAt),
    createdByName: row.createdByName ?? "Unknown owner",
    memberCount: Number(row.memberCount ?? 0),
    isOwner,
    accessLevel,
    canEdit: isOwner || accessLevel === "edit",
  } satisfies TeamListItem;
}

export async function listTeamMembersForUser(userId: string, teamId: string) {
  const team = await getTeamForUser(userId, teamId);

  if (!team) {
    return null;
  }

  const [teamRecord] = await db
    .select({
      createdBy: teams.createdBy,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!teamRecord) {
    return null;
  }

  const results = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      accessLevel: usersToTeams.accessLevel,
    })
    .from(usersToTeams)
    .innerJoin(user, eq(usersToTeams.userId, user.id))
    .where(eq(usersToTeams.teamId, teamId));

  const members = results
    .map((row) => toTeamMemberListItem(row, teamRecord.createdBy, userId))
    .sort((left, right) => {
      if (left.isOwner !== right.isOwner) {
        return left.isOwner ? -1 : 1;
      }

      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    });

  return {
    team,
    members,
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
