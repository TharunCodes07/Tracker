import "server-only";

import { count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { teams, user, usersToTeams } from "@/db/schema";

import type { TeamAccessLevel, TeamListItem, TeamMemberListItem } from "./types";

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeTeamAccessLevel(value: string | null | undefined): TeamAccessLevel {
  return value === "read" ? "read" : "edit";
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
    accessLevel: string | null;
  },
  currentUserId: string
): TeamListItem {
  const isOwner = row.createdBy === currentUserId;
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
      accessLevel: usersToTeams.accessLevel,
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
