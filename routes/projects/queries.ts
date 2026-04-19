import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { issues, projects, teamsToProjects } from "@/db/schema";
import { getTeamForUser } from "@/routes/teams/queries";

import type {
  ListTeamProjectsInput,
  ProjectListItem,
  TeamProjectsResponse,
} from "./types";

const projectIssueCounts = db
  .select({
    projectId: issues.projectId,
    issueCount: count(issues.id).as("issue_count"),
  })
  .from(issues)
  .groupBy(issues.projectId)
  .as("project_issue_counts");

const issueCountValue = sql<number>`cast(coalesce(${projectIssueCounts.issueCount}, 0) as integer)`;

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

function buildTeamProjectsWhereClause(teamId: string, search = "") {
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    return eq(teamsToProjects.teamId, teamId);
  }

  const pattern = `%${normalizedSearch}%`;

  return and(
    eq(teamsToProjects.teamId, teamId),
    or(ilike(projects.name, pattern), ilike(projects.description, pattern))
  );
}

function buildTeamProjectsOrderBy(input: Pick<ListTeamProjectsInput, "sortBy" | "sortDirection">) {
  const direction = input.sortDirection;

  switch (input.sortBy) {
    case "name":
      return direction === "asc"
        ? [asc(projects.name), desc(projects.createdAt), asc(projects.id)]
        : [desc(projects.name), desc(projects.createdAt), asc(projects.id)];
    case "issueCount":
      return direction === "asc"
        ? [asc(issueCountValue), asc(projects.name), asc(projects.id)]
        : [desc(issueCountValue), asc(projects.name), asc(projects.id)];
    case "createdAt":
    default:
      return direction === "asc"
        ? [asc(projects.createdAt), asc(projects.name), asc(projects.id)]
        : [desc(projects.createdAt), asc(projects.name), asc(projects.id)];
  }
}

async function getTeamProjectsSummary(teamId: string) {
  const [summaryRow] = await db
    .select({
      totalProjects: count(teamsToProjects.projectId),
    })
    .from(teamsToProjects)
    .where(eq(teamsToProjects.teamId, teamId));

  return {
    totalProjects: Number(summaryRow?.totalProjects ?? 0),
  };
}

async function getFilteredProjectsCount(teamId: string, search: string) {
  const [countRow] = await db
    .select({
      totalItems: count(teamsToProjects.projectId),
    })
    .from(teamsToProjects)
    .innerJoin(projects, eq(teamsToProjects.projectId, projects.id))
    .where(buildTeamProjectsWhereClause(teamId, search));

  return Number(countRow?.totalItems ?? 0);
}

async function getProjectRowsForTeam(teamId: string, input: ListTeamProjectsInput) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
      issueCount: issueCountValue.as("issue_count"),
    })
    .from(teamsToProjects)
    .innerJoin(projects, eq(teamsToProjects.projectId, projects.id))
    .leftJoin(projectIssueCounts, eq(projects.id, projectIssueCounts.projectId))
    .where(buildTeamProjectsWhereClause(teamId, input.search))
    .orderBy(...buildTeamProjectsOrderBy(input))
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);
}

export async function getTeamProjectsForUser(
  userId: string,
  teamId: string,
  input: ListTeamProjectsInput
): Promise<TeamProjectsResponse | null> {
  const team = await getTeamForUser(userId, teamId);

  if (!team) {
    return null;
  }

  const [summary, totalItems] = await Promise.all([
    getTeamProjectsSummary(teamId),
    getFilteredProjectsCount(teamId, input.search),
  ]);

  const totalPages = totalItems > 0 ? Math.ceil(totalItems / input.pageSize) : 1;
  const page = Math.max(1, Math.min(input.page, totalPages));
  const rows = await getProjectRowsForTeam(teamId, {
    ...input,
    page,
  });

  return {
    team,
    projects: rows.map(toProjectListItem),
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

export async function getProjectForTeam(userId: string, teamId: string, projectId: string) {
  const team = await getTeamForUser(userId, teamId);

  if (!team) {
    return null;
  }

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
      issueCount: issueCountValue.as("issue_count"),
    })
    .from(teamsToProjects)
    .innerJoin(projects, eq(teamsToProjects.projectId, projects.id))
    .leftJoin(projectIssueCounts, eq(projects.id, projectIssueCounts.projectId))
    .where(and(eq(teamsToProjects.teamId, teamId), eq(projects.id, projectId)))
    .limit(1);

  return project ? toProjectListItem(project) : null;
}
