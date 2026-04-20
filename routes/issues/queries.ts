import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { issueClasses, issues, projectModules, user } from "@/db/schema";
import { getProjectForTeam } from "@/routes/projects/queries";
import { listTeamMembersForUser } from "@/routes/teams/queries";

import {
  DEFAULT_ISSUE_CLASS_DEFINITIONS,
  GENERAL_MODULE_FILTER_VALUE,
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  UNCLASSIFIED_ISSUE_TYPE_FILTER_VALUE,
  type IssueClassListItem,
  type IssueExcelRow,
  type IssueListItem,
  type IssueListSummary,
  type IssueModuleCount,
  type IssuePriority,
  type IssueStatus,
  type ListProjectIssuesInput,
  type ProjectIssuesListResponse,
  type ProjectIssuesWorkspaceResponse,
  type ProjectModuleListItem,
} from "./types";

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeIssuePriority(value: string | null | undefined): IssuePriority {
  switch (value) {
    case "low":
    case "high":
    case "critical":
      return value;
    case "medium":
    default:
      return "medium";
  }
}

function normalizeIssueStatus(value: string | null | undefined): IssueStatus {
  switch (value) {
    case "in_progress":
    case "review":
    case "done":
      return value;
    case "open":
    default:
      return "open";
  }
}

function toProjectModuleListItem(row: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProjectModuleListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function toIssueClassListItem(row: {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}): IssueClassListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function toIssueListItem(row: {
  id: string;
  no: number | string | null;
  navigation: string | null;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  moduleId: string | null;
  moduleName: string | null;
  issueClassId: string | null;
  issueClassName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  comments: string | null;
  remark: string | null;
  testedBy: string | null;
  testedByName: string | null;
  fixedDate: Date | string | null;
  development: boolean | null;
  deployment: boolean | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): IssueListItem {
  return {
    id: row.id,
    no: Number(row.no ?? 0),
    navigation: row.navigation,
    title: row.title,
    description: row.description,
    priority: normalizeIssuePriority(row.priority),
    status: normalizeIssueStatus(row.status),
    moduleId: row.moduleId,
    moduleName: row.moduleName,
    issueClassId: row.issueClassId,
    issueClassName: row.issueClassName,
    assignedTo: row.assignedTo,
    assignedToName: row.assignedToName,
    reviewedBy: row.reviewedBy,
    reviewedByName: row.reviewedByName,
    comments: row.comments,
    remark: row.remark,
    testedBy: row.testedBy,
    testedByName: row.testedByName,
    fixedDate: row.fixedDate ? toIsoString(row.fixedDate) : null,
    development: Boolean(row.development),
    deployment: Boolean(row.deployment),
    createdBy: row.createdBy,
    createdByName: row.createdByName,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

export async function ensureDefaultIssueClassesForProject(projectId: string) {
  await db
    .insert(issueClasses)
    .values(
      DEFAULT_ISSUE_CLASS_DEFINITIONS.map((issueClassDefinition) => ({
        projectId,
        name: issueClassDefinition.name,
        description: issueClassDefinition.description,
        isSystem: true,
      }))
    )
    .onConflictDoNothing({
      target: [issueClasses.projectId, issueClasses.name],
    });
}

export async function getProjectIssuesWorkspaceForUser(
  userId: string,
  teamId: string,
  projectId: string
): Promise<ProjectIssuesWorkspaceResponse | null> {
  const [teamMembers, project] = await Promise.all([
    listTeamMembersForUser(userId, teamId),
    getProjectForTeam(userId, teamId, projectId),
  ]);

  if (!teamMembers || !project) {
    return null;
  }

  await ensureDefaultIssueClassesForProject(projectId);

  const [moduleRows, issueClassRows] = await Promise.all([
    db
      .select({
        id: projectModules.id,
        name: projectModules.name,
        description: projectModules.description,
        createdAt: projectModules.createdAt,
        updatedAt: projectModules.updatedAt,
      })
      .from(projectModules)
      .where(eq(projectModules.projectId, projectId))
      .orderBy(asc(projectModules.name)),
    db
      .select({
        id: issueClasses.id,
        name: issueClasses.name,
        description: issueClasses.description,
        isSystem: issueClasses.isSystem,
        createdAt: issueClasses.createdAt,
        updatedAt: issueClasses.updatedAt,
      })
      .from(issueClasses)
      .where(eq(issueClasses.projectId, projectId))
      .orderBy(desc(issueClasses.isSystem), asc(issueClasses.name)),
  ]);

  return {
    team: teamMembers.team,
    project,
    members: teamMembers.members,
    modules: moduleRows.map(toProjectModuleListItem),
    issueClasses: issueClassRows.map(toIssueClassListItem),
  };
}

function buildProjectIssuesWhereClause(
  projectId: string,
  currentUserId: string,
  input: ListProjectIssuesInput,
  aliases: {
    assignedUserName: SQLWrapper;
    reviewedUserName: SQLWrapper;
    testedUserName: SQLWrapper;
    createdUserName: SQLWrapper;
  }
) {
  const conditions: SQL[] = [eq(issues.projectId, projectId)];

  if (input.resolution === "open") {
    conditions.push(ne(issues.status, "done"));
  } else if (input.resolution === "resolved") {
    conditions.push(eq(issues.status, "done"));
  }

  if (input.moduleFilters.length > 0) {
    const moduleConditions: SQL[] = [];
    const selectedModuleIds = input.moduleFilters.filter(
      (value) => value !== GENERAL_MODULE_FILTER_VALUE
    );

    if (selectedModuleIds.length > 0) {
      moduleConditions.push(inArray(issues.moduleId, selectedModuleIds));
    }

    if (input.moduleFilters.includes(GENERAL_MODULE_FILTER_VALUE)) {
      moduleConditions.push(isNull(issues.moduleId));
    }

    if (moduleConditions.length > 0) {
      conditions.push(or(...moduleConditions) as SQL);
    }
  }

  if (input.issueTypeFilters.length > 0) {
    const issueTypeConditions: SQL[] = [];
    const selectedIssueTypeIds = input.issueTypeFilters.filter(
      (value) => value !== UNCLASSIFIED_ISSUE_TYPE_FILTER_VALUE
    );

    if (selectedIssueTypeIds.length > 0) {
      issueTypeConditions.push(inArray(issues.issueClassId, selectedIssueTypeIds));
    }

    if (input.issueTypeFilters.includes(UNCLASSIFIED_ISSUE_TYPE_FILTER_VALUE)) {
      issueTypeConditions.push(isNull(issues.issueClassId));
    }

    if (issueTypeConditions.length > 0) {
      conditions.push(or(...issueTypeConditions) as SQL);
    }
  }

  if (input.priorityFilters.length > 0) {
    conditions.push(inArray(issues.priority, input.priorityFilters));
  }

  if (input.assigneeFilters.length > 0) {
    const assigneeConditions: SQL[] = [];

    if (input.assigneeFilters.includes("current-user")) {
      assigneeConditions.push(eq(issues.assignedTo, currentUserId));
    }

    if (input.assigneeFilters.includes("unassigned")) {
      assigneeConditions.push(isNull(issues.assignedTo));
    }

    if (assigneeConditions.length > 0) {
      conditions.push(or(...assigneeConditions) as SQL);
    }
  }

  const normalizedSearch = input.search.trim();

  if (normalizedSearch) {
    const pattern = `%${normalizedSearch}%`;
    const issueNumberPattern = `%${normalizedSearch.replace(/^#/, "")}%`;

    conditions.push(
      or(
        sql<boolean>`cast(${issues.no} as text) ilike ${issueNumberPattern}`,
        ilike(issues.navigation, pattern),
        ilike(issues.title, pattern),
        ilike(issues.description, pattern),
        ilike(issues.comments, pattern),
        ilike(issues.remark, pattern),
        sql<boolean>`coalesce(${projectModules.name}, 'General') ilike ${pattern}`,
        sql<boolean>`coalesce(${issueClasses.name}, 'Unclassified') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.assignedUserName}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.reviewedUserName}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.testedUserName}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.createdUserName}, '') ilike ${pattern}`,
        sql<boolean>`case when ${issues.development} then 'yes' else 'no' end ilike ${pattern}`,
        sql<boolean>`case when ${issues.deployment} then 'yes' else 'no' end ilike ${pattern}`,
        ilike(issues.priority, pattern),
        ilike(issues.status, pattern)
      ) as SQL
    );
  }

  return and(...conditions) as SQL;
}

function buildProjectIssuesOrderBy(
  input: Pick<ListProjectIssuesInput, "sortBy" | "sortDirection">,
  aliases: {
    assignedUserName: SQLWrapper;
  }
) {
  const direction = input.sortDirection;
  const priorityOrder = sql<number>`case
    when ${issues.priority} = 'low' then 1
    when ${issues.priority} = 'medium' then 2
    when ${issues.priority} = 'high' then 3
    when ${issues.priority} = 'critical' then 4
    else 0
  end`;
  const statusOrder = sql<number>`case
    when ${issues.status} = 'open' then 1
    when ${issues.status} = 'in_progress' then 2
    when ${issues.status} = 'review' then 3
    when ${issues.status} = 'done' then 4
    else 0
  end`;
  const issueClassNameOrder = sql<string>`coalesce(${issueClasses.name}, '')`;
  const moduleNameOrder = sql<string>`coalesce(${projectModules.name}, 'General')`;
  const assignedToNameOrder = sql<string>`coalesce(${aliases.assignedUserName}, '')`;

  switch (input.sortBy) {
    case "no":
      return direction === "asc"
        ? [asc(issues.no), asc(issues.id)]
        : [desc(issues.no), asc(issues.id)];
    case "title":
      return direction === "asc"
        ? [asc(issues.title), desc(issues.updatedAt), desc(issues.no), asc(issues.id)]
        : [desc(issues.title), desc(issues.updatedAt), desc(issues.no), asc(issues.id)];
    case "issueClassName":
      return direction === "asc"
        ? [asc(issueClassNameOrder), desc(issues.updatedAt), desc(issues.no), asc(issues.id)]
        : [desc(issueClassNameOrder), desc(issues.updatedAt), desc(issues.no), asc(issues.id)];
    case "moduleName":
      return direction === "asc"
        ? [asc(moduleNameOrder), desc(issues.updatedAt), desc(issues.no), asc(issues.id)]
        : [desc(moduleNameOrder), desc(issues.updatedAt), desc(issues.no), asc(issues.id)];
    case "priority":
      return direction === "asc"
        ? [asc(priorityOrder), desc(issues.updatedAt), desc(issues.no), asc(issues.id)]
        : [desc(priorityOrder), desc(issues.updatedAt), desc(issues.no), asc(issues.id)];
    case "status":
      return direction === "asc"
        ? [asc(statusOrder), desc(issues.updatedAt), desc(issues.no), asc(issues.id)]
        : [desc(statusOrder), desc(issues.updatedAt), desc(issues.no), asc(issues.id)];
    case "assignedToName":
      return direction === "asc"
        ? [asc(assignedToNameOrder), desc(issues.updatedAt), desc(issues.no), asc(issues.id)]
        : [desc(assignedToNameOrder), desc(issues.updatedAt), desc(issues.no), asc(issues.id)];
    case "updatedAt":
    default:
      return direction === "asc"
        ? [asc(issues.updatedAt), asc(issues.no), asc(issues.id)]
        : [desc(issues.updatedAt), desc(issues.no), asc(issues.id)];
  }
}

async function getProjectIssuesSummary(projectId: string): Promise<IssueListSummary> {
  const [summaryRow] = await db
    .select({
      totalIssues: count(issues.id),
      openIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.status} <> 'done') as integer)`,
      resolvedIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.status} = 'done') as integer)`,
      criticalIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.priority} = 'critical') as integer)`,
      unclassifiedIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.issueClassId} is null) as integer)`,
    })
    .from(issues)
    .where(eq(issues.projectId, projectId));

  return {
    totalIssues: Number(summaryRow?.totalIssues ?? 0),
    openIssueCount: Number(summaryRow?.openIssueCount ?? 0),
    resolvedIssueCount: Number(summaryRow?.resolvedIssueCount ?? 0),
    criticalIssueCount: Number(summaryRow?.criticalIssueCount ?? 0),
    hasUnclassifiedIssues: Number(summaryRow?.unclassifiedIssueCount ?? 0) > 0,
  };
}

async function getProjectIssueModuleCounts(projectId: string): Promise<IssueModuleCount[]> {
  const countRows = await db
    .select({
      moduleId: issues.moduleId,
      issueCount: count(issues.id),
    })
    .from(issues)
    .where(eq(issues.projectId, projectId))
    .groupBy(issues.moduleId);

  return countRows.map((row) => ({
    moduleId: row.moduleId,
    issueCount: Number(row.issueCount ?? 0),
  }));
}

async function getFilteredProjectIssuesCount(
  projectId: string,
  currentUserId: string,
  input: ListProjectIssuesInput
) {
  const assignedUser = alias(user, "filtered_count_assigned_user");
  const reviewedUser = alias(user, "filtered_count_reviewed_user");
  const testedUser = alias(user, "filtered_count_tested_user");
  const createdUser = alias(user, "filtered_count_created_user");

  const [countRow] = await db
    .select({
      totalItems: count(issues.id),
    })
    .from(issues)
    .leftJoin(projectModules, eq(issues.moduleId, projectModules.id))
    .leftJoin(issueClasses, eq(issues.issueClassId, issueClasses.id))
    .leftJoin(assignedUser, eq(issues.assignedTo, assignedUser.id))
    .leftJoin(reviewedUser, eq(issues.reviewedBy, reviewedUser.id))
    .leftJoin(testedUser, eq(issues.testedBy, testedUser.id))
    .leftJoin(createdUser, eq(issues.createdBy, createdUser.id))
    .where(
      buildProjectIssuesWhereClause(projectId, currentUserId, input, {
        assignedUserName: assignedUser.name,
        reviewedUserName: reviewedUser.name,
        testedUserName: testedUser.name,
        createdUserName: createdUser.name,
      })
    );

  return Number(countRow?.totalItems ?? 0);
}

async function getProjectIssueRows(
  projectId: string,
  currentUserId: string,
  input: ListProjectIssuesInput
) {
  const assignedUser = alias(user, "assigned_user");
  const reviewedUser = alias(user, "reviewed_user");
  const testedUser = alias(user, "tested_user");
  const createdUser = alias(user, "created_user");

  return db
    .select({
      id: issues.id,
      no: issues.no,
      navigation: issues.navigation,
      title: issues.title,
      description: issues.description,
      priority: issues.priority,
      status: issues.status,
      moduleId: issues.moduleId,
      moduleName: projectModules.name,
      issueClassId: issues.issueClassId,
      issueClassName: issueClasses.name,
      assignedTo: issues.assignedTo,
      assignedToName: assignedUser.name,
      reviewedBy: issues.reviewedBy,
      reviewedByName: reviewedUser.name,
      comments: issues.comments,
      remark: issues.remark,
      testedBy: issues.testedBy,
      testedByName: testedUser.name,
      fixedDate: issues.fixedDate,
      development: issues.development,
      deployment: issues.deployment,
      createdBy: issues.createdBy,
      createdByName: createdUser.name,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .leftJoin(projectModules, eq(issues.moduleId, projectModules.id))
    .leftJoin(issueClasses, eq(issues.issueClassId, issueClasses.id))
    .leftJoin(assignedUser, eq(issues.assignedTo, assignedUser.id))
    .leftJoin(reviewedUser, eq(issues.reviewedBy, reviewedUser.id))
    .leftJoin(testedUser, eq(issues.testedBy, testedUser.id))
    .leftJoin(createdUser, eq(issues.createdBy, createdUser.id))
    .where(
      buildProjectIssuesWhereClause(projectId, currentUserId, input, {
        assignedUserName: assignedUser.name,
        reviewedUserName: reviewedUser.name,
        testedUserName: testedUser.name,
        createdUserName: createdUser.name,
      })
    )
    .orderBy(...buildProjectIssuesOrderBy(input, { assignedUserName: assignedUser.name }))
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);
}

function toIssueExcelRow(issue: IssueListItem): IssueExcelRow {
  return {
    no: issue.no,
    navigation: issue.navigation,
    title: issue.title,
    priority:
      ISSUE_PRIORITY_OPTIONS.find((option) => option.value === issue.priority)?.label ?? "Medium",
    assignedToName: issue.assignedToName,
    status:
      ISSUE_STATUS_OPTIONS.find((option) => option.value === issue.status)?.label ?? "Open",
    comments: issue.comments,
    remark: issue.remark,
    testedByName: issue.testedByName,
    fixedDate: issue.fixedDate ? issue.fixedDate.slice(0, 10) : null,
    development: issue.development,
    deployment: issue.deployment,
  };
}

export async function listProjectIssuesForExcelForUser(
  userId: string,
  teamId: string,
  projectId: string,
  input: ListProjectIssuesInput
) {
  const projectIssues = await listProjectIssuesForUser(userId, teamId, projectId, {
    ...input,
    page: 1,
    pageSize: 2147483647,
    sortBy: "no",
    sortDirection: "asc",
  });

  if (!projectIssues) {
    return null;
  }

  return projectIssues.issues.map(toIssueExcelRow);
}

export async function listProjectIssuesForUser(
  userId: string,
  teamId: string,
  projectId: string,
  input: ListProjectIssuesInput
): Promise<ProjectIssuesListResponse | null> {
  const project = await getProjectForTeam(userId, teamId, projectId);

  if (!project) {
    return null;
  }

  const [summary, moduleCounts, totalItems] = await Promise.all([
    getProjectIssuesSummary(projectId),
    getProjectIssueModuleCounts(projectId),
    getFilteredProjectIssuesCount(projectId, userId, input),
  ]);

  const totalPages = totalItems > 0 ? Math.ceil(totalItems / input.pageSize) : 1;
  const page = Math.max(1, Math.min(input.page, totalPages));
  const issueRows = await getProjectIssueRows(projectId, userId, {
    ...input,
    page,
  });

  return {
    issues: issueRows.map(toIssueListItem),
    summary,
    moduleCounts,
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
