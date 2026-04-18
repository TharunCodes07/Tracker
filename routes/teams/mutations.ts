import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { teams, usersToTeams } from "@/db/schema";

import { RouteError } from "@/routes/errors";

import type {
  CreateTeamInput,
  JoinTeamInput,
  TeamAccessLevel,
  UpdateTeamInput,
  UpdateTeamMemberAccessInput,
} from "./types";
import { getTeamForUser, getTeamMemberForUser } from "./queries";

const TEAM_CODE_LENGTH = 8;
const TEAM_NAME_MAX_LENGTH = 80;
const TEAM_DESCRIPTION_MAX_LENGTH = 280;

export interface TeamActor {
  id: string;
}

function normalizeTeamName(name: string) {
  const value = name.trim();

  if (value.length < 2) {
    throw new RouteError("Team name must be at least 2 characters long.");
  }

  if (value.length > TEAM_NAME_MAX_LENGTH) {
    throw new RouteError(`Team name must be ${TEAM_NAME_MAX_LENGTH} characters or fewer.`);
  }

  return value;
}

function normalizeDescription(description?: string | null) {
  const value = description?.trim() ?? "";

  if (!value) {
    return null;
  }

  if (value.length > TEAM_DESCRIPTION_MAX_LENGTH) {
    throw new RouteError(
      `Description must be ${TEAM_DESCRIPTION_MAX_LENGTH} characters or fewer.`
    );
  }

  return value;
}

function normalizeJoinCode(code: string) {
  const value = code.trim().toUpperCase();

  if (!value) {
    throw new RouteError("Enter a team join code.");
  }

  if (!/^[A-Z0-9]{6,12}$/.test(value)) {
    throw new RouteError("Join code must be 6 to 12 letters or numbers.");
  }

  return value;
}

function normalizeTeamAccessLevel(value: string): TeamAccessLevel {
  if (value === "edit" || value === "read") {
    return value;
  }

  throw new RouteError("Access must be either edit or read.");
}

async function generateUniqueJoinCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinCode = randomUUID().replace(/-/g, "").slice(0, TEAM_CODE_LENGTH).toUpperCase();

    const [existingTeam] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.joinCode, joinCode))
      .limit(1);

    if (!existingTeam) {
      return joinCode;
    }
  }

  throw new RouteError("Could not create a unique join code right now.", 500);
}

async function requireOwnedTeamForUser(actor: TeamActor, teamId: string) {
  const team = await getTeamForUser(actor.id, teamId);

  if (!team) {
    throw new RouteError("Team not found.", 404);
  }

  if (!team.isOwner) {
    throw new RouteError("Only the team owner can do that.", 403);
  }

  return team;
}

export async function createTeamForUser(actor: TeamActor, input: CreateTeamInput) {
  const name = normalizeTeamName(input.name);
  const description = normalizeDescription(input.description);
  const joinCode = await generateUniqueJoinCode();

  const createdTeam = await db.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({
        name,
        description,
        joinCode,
        createdBy: actor.id,
      })
      .returning({ id: teams.id });

    await tx.insert(usersToTeams).values({
      userId: actor.id,
      teamId: team.id,
      accessLevel: "edit",
    });

    return team;
  });

  const team = await getTeamForUser(actor.id, createdTeam.id);

  if (!team) {
    throw new RouteError("Team was created but could not be loaded.", 500);
  }

  return team;
}

export async function joinTeamForUser(actor: TeamActor, input: JoinTeamInput) {
  const code = normalizeJoinCode(input.code);

  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.joinCode, code))
    .limit(1);

  if (!team) {
    throw new RouteError("No team matches that join code.", 404);
  }

  const [existingMembership] = await db
    .select({ teamId: usersToTeams.teamId })
    .from(usersToTeams)
    .where(and(eq(usersToTeams.userId, actor.id), eq(usersToTeams.teamId, team.id)))
    .limit(1);

  if (existingMembership) {
    throw new RouteError("You are already a member of this team.", 409);
  }

  await db.insert(usersToTeams).values({
    userId: actor.id,
    teamId: team.id,
    accessLevel: "edit",
  });

  const joinedTeam = await getTeamForUser(actor.id, team.id);

  if (!joinedTeam) {
    throw new RouteError("Team was joined but could not be loaded.", 500);
  }

  return joinedTeam;
}

export async function updateTeamForUser(
  actor: TeamActor,
  teamId: string,
  input: UpdateTeamInput
) {
  await requireOwnedTeamForUser(actor, teamId);

  const name = normalizeTeamName(input.name);
  const description = normalizeDescription(input.description);

  await db
    .update(teams)
    .set({
      name,
      description,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));

  const updatedTeam = await getTeamForUser(actor.id, teamId);

  if (!updatedTeam) {
    throw new RouteError("Team was updated but could not be loaded.", 500);
  }

  return updatedTeam;
}

export async function deleteTeamForUser(actor: TeamActor, teamId: string) {
  const team = await requireOwnedTeamForUser(actor, teamId);

  await db.delete(teams).where(eq(teams.id, teamId));

  return team;
}

export async function updateTeamMemberAccessForUser(
  actor: TeamActor,
  teamId: string,
  memberUserId: string,
  input: UpdateTeamMemberAccessInput
) {
  await requireOwnedTeamForUser(actor, teamId);

  const [teamRecord] = await db
    .select({
      createdBy: teams.createdBy,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!teamRecord) {
    throw new RouteError("Team not found.", 404);
  }

  if (teamRecord.createdBy === memberUserId) {
    throw new RouteError("The owner's access cannot be changed.");
  }

  const [membership] = await db
    .select({
      userId: usersToTeams.userId,
    })
    .from(usersToTeams)
    .where(and(eq(usersToTeams.teamId, teamId), eq(usersToTeams.userId, memberUserId)))
    .limit(1);

  if (!membership) {
    throw new RouteError("Member not found.", 404);
  }

  const accessLevel = normalizeTeamAccessLevel(input.accessLevel);

  await db
    .update(usersToTeams)
    .set({
      accessLevel,
    })
    .where(and(eq(usersToTeams.teamId, teamId), eq(usersToTeams.userId, memberUserId)));

  const member = await getTeamMemberForUser(actor.id, teamId, memberUserId);

  if (!member) {
    throw new RouteError("Member was updated but could not be loaded.", 500);
  }

  return member;
}
