import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { issues, projects, teamsToProjects } from "@/db/schema";
import { getTeamForUser } from "@/routes/teams/queries";

import type { ProjectListItem } from "./types";

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toProjectListItem(row: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | string;
  issueCount: number | string | null;
}): ProjectListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: toIsoString(row.createdAt),
    issueCount: Number(row.issueCount ?? 0),
  };
}

async function listProjectsForTeamInternal(teamId: string) {
  const projectIssueCounts = db
    .select({
      projectId: issues.projectId,
      issueCount: count(issues.id).as("issue_count"),
    })
    .from(issues)
    .groupBy(issues.projectId)
    .as("project_issue_counts");

  return db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
      issueCount: projectIssueCounts.issueCount,
    })
    .from(teamsToProjects)
    .innerJoin(projects, eq(teamsToProjects.projectId, projects.id))
    .leftJoin(projectIssueCounts, eq(projects.id, projectIssueCounts.projectId))
    .where(eq(teamsToProjects.teamId, teamId))
    .orderBy(desc(projects.createdAt), projects.name);
}

export async function getTeamProjectsForUser(userId: string, teamId: string) {
  const team = await getTeamForUser(userId, teamId);

  if (!team) {
    return null;
  }

  const results = await listProjectsForTeamInternal(teamId);

  return {
    team,
    projects: results.map(toProjectListItem),
  };
}

export async function getProjectForTeam(userId: string, teamId: string, projectId: string) {
  const team = await getTeamForUser(userId, teamId);

  if (!team) {
    return null;
  }

  const projectIssueCounts = db
    .select({
      projectId: issues.projectId,
      issueCount: count(issues.id).as("issue_count"),
    })
    .from(issues)
    .groupBy(issues.projectId)
    .as("project_issue_counts");

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
      issueCount: projectIssueCounts.issueCount,
    })
    .from(teamsToProjects)
    .innerJoin(projects, eq(teamsToProjects.projectId, projects.id))
    .leftJoin(projectIssueCounts, eq(projects.id, projectIssueCounts.projectId))
    .where(and(eq(teamsToProjects.teamId, teamId), eq(projects.id, projectId)))
    .limit(1);

  return project ? toProjectListItem(project) : null;
}
