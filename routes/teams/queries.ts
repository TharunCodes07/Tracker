import "server-only";

import { count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { teams, user, usersToTeams } from "@/db/schema";

import type { TeamListItem } from "./types";

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toTeamListItem(
  row: {
    id: string;
    name: string;
    description: string | null;
    joinCode: string;
    createdAt: Date | string;
    createdBy: string | null;
    createdByName: string | null;
    memberCount: number | string | null;
  },
  currentUserId: string
): TeamListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    joinCode: row.joinCode,
    createdAt: toIsoString(row.createdAt),
    createdByName: row.createdByName ?? "Unknown owner",
    memberCount: Number(row.memberCount ?? 0),
    isOwner: row.createdBy === currentUserId,
  };
}

async function listTeamsForUserInternal(userId: string) {
  const creator = alias(user, "team_creator");

  const teamMemberCounts = db
    .select({
      teamId: usersToTeams.teamId,
      memberCount: count(usersToTeams.userId).as("member_count"),
    })
    .from(usersToTeams)
    .groupBy(usersToTeams.teamId)
    .as("team_member_counts");

  return db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      joinCode: teams.joinCode,
      createdAt: teams.createdAt,
      createdBy: teams.createdBy,
      createdByName: creator.name,
      memberCount: teamMemberCounts.memberCount,
    })
    .from(usersToTeams)
    .innerJoin(teams, eq(usersToTeams.teamId, teams.id))
    .leftJoin(creator, eq(teams.createdBy, creator.id))
    .leftJoin(teamMemberCounts, eq(teams.id, teamMemberCounts.teamId))
    .where(eq(usersToTeams.userId, userId))
    .orderBy(desc(teams.createdAt), teams.name);
}

export async function listTeamsForUser(userId: string) {
  const results = await listTeamsForUserInternal(userId);

  return results.map((row) => toTeamListItem(row, userId));
}

export async function getTeamForUser(userId: string, teamId: string) {
  const teamsForUser = await listTeamsForUserInternal(userId);
  const match = teamsForUser.find((team) => team.id === teamId);

  return match ? toTeamListItem(match, userId) : null;
}
