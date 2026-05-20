import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";

import { db } from "@/db";
import { issues, projects, teams, teamsToProjects, usersToTeams } from "@/db/schema";
import { getTeamForUser } from "@/routes/teams/queries";

import type {
  ListUserProjectsInput,
  ListTeamProjectsInput,
  ProjectListItem,
  TeamProjectsResponse,
  UserProjectListItem,
  UserProjectsResponse,
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
const accessLevelOrder = sql<number>`case
  when ${usersToTeams.accessLevel} = 'owner' then 0
  when ${usersToTeams.accessLevel} = 'edit' then 1
  else 2
end`;

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toProjectListItem(row: {
  id: string;
  name: string;
  keyPrefix: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  issueCount: number | string | null;
}): ProjectListItem {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    description: row.description,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    issueCount: Number(row.issueCount ?? 0),
  };
}

function toUserProjectListItem(row: {
  id: string;
  name: string;
  keyPrefix: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  issueCount: number | string | null;
  teamId: string;
  teamName: string;
  teamAccessLevel: string;
}): UserProjectListItem {
  const teamAccessLevel =
    row.teamAccessLevel === "owner" || row.teamAccessLevel === "edit"
      ? row.teamAccessLevel
      : "read";

  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    description: row.description,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    issueCount: Number(row.issueCount ?? 0),
    teamId: row.teamId,
    teamName: row.teamName,
    teamAccessLevel,
    teamCanEdit: teamAccessLevel === "owner" || teamAccessLevel === "edit",
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

function buildUserProjectsWhereClause(userId: string, search = "") {
  const normalizedSearch = search.trim();
  const baseCondition = and(
    eq(usersToTeams.userId, userId),
    eq(usersToTeams.membershipStatus, "active")
  );

  if (!normalizedSearch) {
    return baseCondition;
  }

  const pattern = `%${normalizedSearch}%`;

  return and(
    baseCondition,
    or(ilike(projects.name, pattern), ilike(projects.description, pattern), ilike(teams.name, pattern))
  );
}

function buildUserProjectsOrderBy(
  input: Pick<ListUserProjectsInput, "sortBy" | "sortDirection">,
  teamNameColumn: SQLWrapper = teams.name
) {
  const direction = input.sortDirection;

  switch (input.sortBy) {
    case "name":
      return direction === "asc"
        ? [asc(projects.name), asc(teamNameColumn), asc(projects.id)]
        : [desc(projects.name), asc(teamNameColumn), asc(projects.id)];
    case "teamName":
      return direction === "asc"
        ? [asc(teamNameColumn), asc(projects.name), asc(projects.id)]
        : [desc(teamNameColumn), asc(projects.name), asc(projects.id)];
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

async function getUserProjectsSummary(userId: string) {
  const [summaryRow] = await db
    .select({
      totalProjects: sql<number>`cast(count(distinct ${teamsToProjects.projectId}) as integer)`,
      editableProjects: sql<number>`cast(
        count(
          distinct case
            when ${usersToTeams.accessLevel} in ('owner', 'edit') then ${teamsToProjects.projectId}
            else null
          end
        ) as integer
      )`,
    })
    .from(usersToTeams)
    .innerJoin(teamsToProjects, eq(usersToTeams.teamId, teamsToProjects.teamId))
    .where(and(eq(usersToTeams.userId, userId), eq(usersToTeams.membershipStatus, "active")));

  return {
    totalProjects: Number(summaryRow?.totalProjects ?? 0),
    editableProjects: Number(summaryRow?.editableProjects ?? 0),
  };
}

async function getFilteredUserProjectsCount(userId: string, search: string) {
  const [countRow] = await db
    .select({
      totalItems: sql<number>`cast(count(distinct ${teamsToProjects.projectId}) as integer)`,
    })
    .from(usersToTeams)
    .innerJoin(teamsToProjects, eq(usersToTeams.teamId, teamsToProjects.teamId))
    .innerJoin(projects, eq(teamsToProjects.projectId, projects.id))
    .innerJoin(teams, eq(teamsToProjects.teamId, teams.id))
    .where(buildUserProjectsWhereClause(userId, search));

  return Number(countRow?.totalItems ?? 0);
}

async function getProjectRowsForTeam(teamId: string, input: ListTeamProjectsInput) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      keyPrefix: projects.keyPrefix,
      description: projects.description,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
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

async function getProjectRowsForUser(userId: string, input: ListUserProjectsInput) {
  const accessibleUserProjects = db
    .select({
      projectId: teamsToProjects.projectId,
      teamId: sql<string>`(array_agg(${teams.id} order by ${accessLevelOrder}, ${teams.name}, ${teams.id}))[1]`.as(
        "team_id"
      ),
      teamName: sql<string>`(array_agg(${teams.name} order by ${accessLevelOrder}, ${teams.name}, ${teams.id}))[1]`.as(
        "team_name"
      ),
      teamAccessLevel: sql<string>`(array_agg(${usersToTeams.accessLevel} order by ${accessLevelOrder}, ${teams.name}, ${teams.id}))[1]`.as(
        "team_access_level"
      ),
    })
    .from(usersToTeams)
    .innerJoin(teamsToProjects, eq(usersToTeams.teamId, teamsToProjects.teamId))
    .innerJoin(projects, eq(teamsToProjects.projectId, projects.id))
    .innerJoin(teams, eq(teamsToProjects.teamId, teams.id))
    .where(buildUserProjectsWhereClause(userId, input.search))
    .groupBy(teamsToProjects.projectId)
    .as("accessible_user_projects");

  return db
    .select({
      id: projects.id,
      name: projects.name,
      keyPrefix: projects.keyPrefix,
      description: projects.description,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      issueCount: issueCountValue.as("issue_count"),
      teamId: accessibleUserProjects.teamId,
      teamName: accessibleUserProjects.teamName,
      teamAccessLevel: accessibleUserProjects.teamAccessLevel,
    })
    .from(accessibleUserProjects)
    .innerJoin(projects, eq(accessibleUserProjects.projectId, projects.id))
    .leftJoin(projectIssueCounts, eq(projects.id, projectIssueCounts.projectId))
    .orderBy(...buildUserProjectsOrderBy(input, accessibleUserProjects.teamName))
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

export async function listProjectsForUser(
  userId: string,
  input: ListUserProjectsInput
): Promise<UserProjectsResponse> {
  const [summary, totalItems] = await Promise.all([
    getUserProjectsSummary(userId),
    getFilteredUserProjectsCount(userId, input.search),
  ]);

  const totalPages = totalItems > 0 ? Math.ceil(totalItems / input.pageSize) : 1;
  const page = Math.max(1, Math.min(input.page, totalPages));
  const rows = await getProjectRowsForUser(userId, {
    ...input,
    page,
  });

  return {
    projects: rows.map(toUserProjectListItem),
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
      keyPrefix: projects.keyPrefix,
      description: projects.description,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      issueCount: issueCountValue.as("issue_count"),
    })
    .from(teamsToProjects)
    .innerJoin(projects, eq(teamsToProjects.projectId, projects.id))
    .leftJoin(projectIssueCounts, eq(projects.id, projectIssueCounts.projectId))
    .where(and(eq(teamsToProjects.teamId, teamId), eq(projects.id, projectId)))
    .limit(1);

  return project ? toProjectListItem(project) : null;
}
