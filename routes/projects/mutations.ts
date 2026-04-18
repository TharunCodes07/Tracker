import "server-only";

import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, teamsToProjects } from "@/db/schema";
import { RouteError } from "@/routes/errors";
import { getTeamForUser } from "@/routes/teams/queries";

import type { CreateProjectInput, UpdateProjectInput } from "./types";
import { getProjectForTeam } from "./queries";

const PROJECT_NAME_MAX_LENGTH = 80;
const PROJECT_DESCRIPTION_MAX_LENGTH = 280;

export interface ProjectActor {
  id: string;
}

function normalizeProjectName(name: string) {
  const value = name.trim();

  if (value.length < 2) {
    throw new RouteError("Project name must be at least 2 characters long.");
  }

  if (value.length > PROJECT_NAME_MAX_LENGTH) {
    throw new RouteError(
      `Project name must be ${PROJECT_NAME_MAX_LENGTH} characters or fewer.`
    );
  }

  return value;
}

function normalizeDescription(description?: string | null) {
  const value = description?.trim() ?? "";

  if (!value) {
    return null;
  }

  if (value.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
    throw new RouteError(
      `Description must be ${PROJECT_DESCRIPTION_MAX_LENGTH} characters or fewer.`
    );
  }

  return value;
}

async function requireEditableTeamForUser(actor: ProjectActor, teamId: string) {
  const team = await getTeamForUser(actor.id, teamId);

  if (!team) {
    throw new RouteError("Team not found.", 404);
  }

  if (!team.canEdit) {
    throw new RouteError("You only have read access to this team.", 403);
  }

  return team;
}

async function requireProjectInEditableTeam(
  actor: ProjectActor,
  teamId: string,
  projectId: string
) {
  await requireEditableTeamForUser(actor, teamId);

  const project = await getProjectForTeam(actor.id, teamId, projectId);

  if (!project) {
    throw new RouteError("Project not found.", 404);
  }

  return project;
}

export async function createProjectForTeam(
  actor: ProjectActor,
  teamId: string,
  input: CreateProjectInput
) {
  await requireEditableTeamForUser(actor, teamId);

  const name = normalizeProjectName(input.name);
  const description = normalizeDescription(input.description);

  const createdProject = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name,
        description,
      })
      .returning({ id: projects.id });

    await tx.insert(teamsToProjects).values({
      teamId,
      projectId: project.id,
    });

    return project;
  });

  const project = await getProjectForTeam(actor.id, teamId, createdProject.id);

  if (!project) {
    throw new RouteError("Project was created but could not be loaded.", 500);
  }

  return project;
}

export async function updateProjectForTeam(
  actor: ProjectActor,
  teamId: string,
  projectId: string,
  input: UpdateProjectInput
) {
  await requireProjectInEditableTeam(actor, teamId, projectId);

  const name = normalizeProjectName(input.name);
  const description = normalizeDescription(input.description);

  await db
    .update(projects)
    .set({
      name,
      description,
    })
    .where(eq(projects.id, projectId));

  const project = await getProjectForTeam(actor.id, teamId, projectId);

  if (!project) {
    throw new RouteError("Project was updated but could not be loaded.", 500);
  }

  return project;
}

export async function deleteProjectForTeam(
  actor: ProjectActor,
  teamId: string,
  projectId: string
) {
  const project = await requireProjectInEditableTeam(actor, teamId, projectId);

  await db.transaction(async (tx) => {
    await tx
      .delete(teamsToProjects)
      .where(and(eq(teamsToProjects.teamId, teamId), eq(teamsToProjects.projectId, projectId)));

    const [remainingLinks] = await tx
      .select({
        count: count(teamsToProjects.teamId).as("count"),
      })
      .from(teamsToProjects)
      .where(eq(teamsToProjects.projectId, projectId));

    if (Number(remainingLinks?.count ?? 0) === 0) {
      await tx.delete(projects).where(eq(projects.id, projectId));
    }
  });

  return project;
}
