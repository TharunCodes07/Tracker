import "server-only";

import { randomUUID } from "node:crypto";

import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { teamMemberRoles, teams, usersToTeams } from "@/db/schema";

import { RouteError } from "@/routes/errors";
import { getUserByEmail } from "@/routes/users/queries";

import { TEAM_MEMBER_ROLE_OPTIONS } from "./types";
import type {
  CreateTeamInput,
  JoinTeamInput,
  TeamAccessLevel,
  TeamMemberRole,
  TeamVisibility,
  TeamInviteMemberInput,
  UpdateTeamInput,
  UpdateTeamMemberInput,
} from "./types";
import { getTeamForUser, getTeamMemberForUser } from "./queries";

const TEAM_CODE_LENGTH = 8;
const TEAM_NAME_MAX_LENGTH = 80;
const TEAM_DESCRIPTION_MAX_LENGTH = 280;

export interface TeamActor {
  id: string;
  organizationId?: string | null;
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
  if (value === "owner" || value === "edit" || value === "read") {
    return value;
  }

  throw new RouteError("Access must be owner, edit, or read.");
}

function normalizeInvitedAccessLevel(
  value: string | undefined
): Exclude<TeamAccessLevel, "owner"> {
  if (value === undefined || value === "edit") {
    return "edit";
  }

  if (value === "read") {
    return "read";
  }

  throw new RouteError("Invited access must be edit or read.");
}

function normalizeInviteEmail(email: string) {
  const value = email.trim().toLowerCase();

  if (!value) {
    throw new RouteError("Enter an email address to invite.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new RouteError("Enter a valid email address.");
  }

  return value;
}

function normalizeTeamVisibility(value: string): TeamVisibility {
  if (value === "public" || value === "private") {
    return value;
  }

  throw new RouteError("Visibility must be public or private.");
}

function normalizeTeamMemberRoles(values: string[]): TeamMemberRole[] {
  const validRoles = new Set<TeamMemberRole>(
    TEAM_MEMBER_ROLE_OPTIONS.map((option) => option.value)
  );
  const seenRoles = new Set<TeamMemberRole>();
  const normalizedRoles: TeamMemberRole[] = [];

  for (const value of values) {
    const normalizedValue = value.trim().toLowerCase();

    if (!validRoles.has(normalizedValue as TeamMemberRole)) {
      throw new RouteError("Choose valid team member roles.");
    }

    const role = normalizedValue as TeamMemberRole;

    if (seenRoles.has(role)) {
      continue;
    }

    seenRoles.add(role);
    normalizedRoles.push(role);
  }

  const roleOrder = new Map<TeamMemberRole, number>(
    TEAM_MEMBER_ROLE_OPTIONS.map((option, index) => [option.value, index])
  );

  normalizedRoles.sort(
    (left, right) => (roleOrder.get(left) ?? 999) - (roleOrder.get(right) ?? 999)
  );

  return normalizedRoles;
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
    throw new RouteError("Only a team owner can do that.", 403);
  }

  return team;
}

async function requireActiveTeamForUser(actor: TeamActor, teamId: string) {
  const team = await getTeamForUser(actor.id, teamId);

  if (!team) {
    throw new RouteError("Team not found.", 404);
  }

  return team;
}

async function requireActiveOwnerCount(teamId: string) {
  const [row] = await db
    .select({
      ownerCount: count(usersToTeams.userId),
    })
    .from(usersToTeams)
    .where(
      and(
        eq(usersToTeams.teamId, teamId),
        eq(usersToTeams.membershipStatus, "active"),
        eq(usersToTeams.accessLevel, "owner")
      )
    );

  return Number(row?.ownerCount ?? 0);
}

async function resolveJoinTarget(input: JoinTeamInput) {
  const requestedTeamId = input.teamId?.trim();

  if (requestedTeamId) {
    const [team] = await db
      .select({
        id: teams.id,
        name: teams.name,
      })
      .from(teams)
      .where(eq(teams.id, requestedTeamId))
      .limit(1);

    if (!team) {
      throw new RouteError("Team not found.", 404);
    }

    return team;
  }

  const code = normalizeJoinCode(input.code ?? "");
  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
    })
    .from(teams)
    .where(eq(teams.joinCode, code))
    .limit(1);

  if (!team) {
    throw new RouteError("No team matches that join code.", 404);
  }

  return team;
}

export async function createTeamForUser(actor: TeamActor, input: CreateTeamInput) {
  const name = normalizeTeamName(input.name);
  const description = normalizeDescription(input.description);
  const visibility = normalizeTeamVisibility(input.visibility);
  const joinCode = await generateUniqueJoinCode();

  const createdTeam = await db.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({
        name,
        description,
        visibility,
        joinCode,
        createdBy: actor.id,
      })
      .returning({ id: teams.id });

    await tx.insert(usersToTeams).values({
      userId: actor.id,
      teamId: team.id,
      accessLevel: "owner",
      membershipStatus: "active",
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
  const team = await resolveJoinTarget(input);

  const [existingMembership] = await db
    .select({
      teamId: usersToTeams.teamId,
      membershipStatus: usersToTeams.membershipStatus,
    })
    .from(usersToTeams)
    .where(and(eq(usersToTeams.userId, actor.id), eq(usersToTeams.teamId, team.id)))
    .limit(1);

  if (existingMembership?.membershipStatus === "active") {
    throw new RouteError("You are already a member of this team.", 409);
  }

  if (existingMembership?.membershipStatus === "pending") {
    throw new RouteError("Your join request is already pending approval.", 409);
  }

  if (existingMembership?.membershipStatus === "invited") {
    throw new RouteError("You already have an invitation to this team.", 409);
  }

  await db.insert(usersToTeams).values({
    userId: actor.id,
    teamId: team.id,
    accessLevel: "edit",
    membershipStatus: "pending",
  });

  return team;
}

export async function acceptTeamInviteForUser(actor: TeamActor, teamId: string) {
  const [membership] = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      membershipStatus: usersToTeams.membershipStatus,
    })
    .from(usersToTeams)
    .innerJoin(teams, eq(usersToTeams.teamId, teams.id))
    .where(and(eq(usersToTeams.userId, actor.id), eq(usersToTeams.teamId, teamId)))
    .limit(1);

  if (!membership) {
    throw new RouteError("Invitation not found.", 404);
  }

  if (membership.membershipStatus === "active") {
    return {
      id: membership.teamId,
      name: membership.teamName,
      alreadyActive: true,
    };
  }

  if (membership.membershipStatus !== "invited") {
    throw new RouteError("This team membership is not an invitation.", 409);
  }

  await db
    .update(usersToTeams)
    .set({
      membershipStatus: "active",
    })
    .where(and(eq(usersToTeams.userId, actor.id), eq(usersToTeams.teamId, teamId)));

  return {
    id: membership.teamId,
    name: membership.teamName,
    alreadyActive: false,
  };
}

export async function updateTeamForUser(
  actor: TeamActor,
  teamId: string,
  input: UpdateTeamInput
) {
  await requireOwnedTeamForUser(actor, teamId);

  const name = normalizeTeamName(input.name);
  const description = normalizeDescription(input.description);
  const visibility = normalizeTeamVisibility(input.visibility);

  await db
    .update(teams)
    .set({
      name,
      description,
      visibility,
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

export async function updateTeamMemberForUser(
  actor: TeamActor,
  teamId: string,
  memberUserId: string,
  input: UpdateTeamMemberInput
) {
  const team = await requireActiveTeamForUser(actor, teamId);

  const [membership] = await db
    .select({
      userId: usersToTeams.userId,
      accessLevel: usersToTeams.accessLevel,
      membershipStatus: usersToTeams.membershipStatus,
    })
    .from(usersToTeams)
    .where(and(eq(usersToTeams.teamId, teamId), eq(usersToTeams.userId, memberUserId)))
    .limit(1);

  if (!membership || membership.membershipStatus !== "active") {
    throw new RouteError("Member not found.", 404);
  }

  if (input.accessLevel === undefined && input.roles === undefined) {
    throw new RouteError("Choose at least one member setting to update.");
  }

  const accessLevel =
    input.accessLevel !== undefined ? normalizeTeamAccessLevel(input.accessLevel) : undefined;
  const roles = input.roles !== undefined ? normalizeTeamMemberRoles(input.roles) : undefined;
  const currentAccessLevel = normalizeTeamAccessLevel(membership.accessLevel);

  if (accessLevel !== undefined && !team.isOwner) {
    throw new RouteError("Only a team owner can update member access.", 403);
  }

  if (roles !== undefined && !team.canEdit) {
    throw new RouteError("You only have read access to this team.", 403);
  }

  if (accessLevel !== undefined && currentAccessLevel === "owner" && accessLevel !== "owner") {
    const ownerCount = await requireActiveOwnerCount(teamId);

    if (ownerCount <= 1) {
      throw new RouteError("This team must keep at least one owner.", 409);
    }
  }

  await db.transaction(async (tx) => {
    if (accessLevel !== undefined) {
      await tx
        .update(usersToTeams)
        .set({
          accessLevel,
        })
        .where(and(eq(usersToTeams.teamId, teamId), eq(usersToTeams.userId, memberUserId)));
    }

    if (roles !== undefined) {
      await tx
        .delete(teamMemberRoles)
        .where(
          and(eq(teamMemberRoles.teamId, teamId), eq(teamMemberRoles.userId, memberUserId))
        );

      if (roles.length > 0) {
        await tx.insert(teamMemberRoles).values(
          roles.map((role) => ({
            teamId,
            userId: memberUserId,
            role,
          }))
        );
      }
    }
  });

  const member = await getTeamMemberForUser(actor.id, teamId, memberUserId);

  if (!member) {
    throw new RouteError("Member was updated but could not be loaded.", 500);
  }

  return member;
}

export async function approveTeamJoinRequestForUser(
  actor: TeamActor,
  teamId: string,
  memberUserId: string
) {
  await requireOwnedTeamForUser(actor, teamId);

  const [membership] = await db
    .select({
      userId: usersToTeams.userId,
      membershipStatus: usersToTeams.membershipStatus,
    })
    .from(usersToTeams)
    .where(and(eq(usersToTeams.teamId, teamId), eq(usersToTeams.userId, memberUserId)))
    .limit(1);

  if (!membership || membership.membershipStatus !== "pending") {
    throw new RouteError("Join request not found.", 404);
  }

  await db
    .update(usersToTeams)
    .set({
      membershipStatus: "active",
    })
    .where(and(eq(usersToTeams.teamId, teamId), eq(usersToTeams.userId, memberUserId)));

  return memberUserId;
}

export async function rejectTeamJoinRequestForUser(
  actor: TeamActor,
  teamId: string,
  memberUserId: string
) {
  await requireOwnedTeamForUser(actor, teamId);

  const [membership] = await db
    .select({
      userId: usersToTeams.userId,
      membershipStatus: usersToTeams.membershipStatus,
    })
    .from(usersToTeams)
    .where(and(eq(usersToTeams.teamId, teamId), eq(usersToTeams.userId, memberUserId)))
    .limit(1);

  if (!membership || membership.membershipStatus !== "pending") {
    throw new RouteError("Join request not found.", 404);
  }

  await db
    .delete(usersToTeams)
    .where(and(eq(usersToTeams.teamId, teamId), eq(usersToTeams.userId, memberUserId)));

  return memberUserId;
}

export async function inviteTeamMemberForUser(
  actor: TeamActor,
  teamId: string,
  input: TeamInviteMemberInput
) {
  const team = await requireOwnedTeamForUser(actor, teamId);
  const email = normalizeInviteEmail(input.email);
  const accessLevel = normalizeInvitedAccessLevel(input.accessLevel);
  const invitedUser = await getUserByEmail(email);

  if (!invitedUser) {
    throw new RouteError("No user account matches that email address.", 404);
  }

  if (actor.organizationId && invitedUser.organizationId !== actor.organizationId) {
    throw new RouteError("No user account matches that email address in this organization.", 404);
  }

  if (invitedUser.id === actor.id) {
    throw new RouteError("You are already part of this team.", 409);
  }

  const [existingMembership] = await db
    .select({
      membershipStatus: usersToTeams.membershipStatus,
    })
    .from(usersToTeams)
    .where(and(eq(usersToTeams.teamId, teamId), eq(usersToTeams.userId, invitedUser.id)))
    .limit(1);

  if (existingMembership?.membershipStatus === "active") {
    throw new RouteError(`${invitedUser.name ?? invitedUser.email} is already in this team.`, 409);
  }

  if (existingMembership?.membershipStatus === "pending") {
    throw new RouteError(
      `${invitedUser.name ?? invitedUser.email} already requested access. Approve the request instead.`,
      409
    );
  }

  if (existingMembership?.membershipStatus === "invited") {
    throw new RouteError(
      `${invitedUser.name ?? invitedUser.email} already has a pending invitation.`,
      409
    );
  }

  await db.insert(usersToTeams).values({
    userId: invitedUser.id,
    teamId,
    accessLevel,
    membershipStatus: "invited",
  });

  return {
    team,
    invitedUser,
  };
}
