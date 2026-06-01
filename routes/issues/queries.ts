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
import {
  issueComments,
  issues,
  projectComponents,
  projectEpics,
  projectModules,
  projectReleases,
  sprints,
  teamMemberRoles,
  user,
} from "@/db/schema";
import { getProjectForTeam } from "@/routes/projects/queries";
import { listTeamMembersForUser } from "@/routes/teams/queries";

import { listIssueMediaForIssueIds } from "./media";
import {
  DEPLOYMENT_STATUS_OPTIONS,
  DEVELOPMENT_STATUS_OPTIONS,
  EPIC_STATUS_OPTIONS,
  GENERAL_MODULE_FILTER_VALUE,
  ISSUE_ASSIGNMENT_GROUP_OPTIONS,
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  RELEASE_STATUS_OPTIONS,
  SPRINT_STATUS_OPTIONS,
  type DeploymentStatus,
  type DevelopmentStatus,
  type EpicStatus,
  type IssueAssignmentGroup,
  type IssueExcelRow,
  type IssueExcelWorkbook,
  type IssueGroupCount,
  type IssueListItem,
  type IssueListSummary,
  type IssueMediaListItem,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
  type ListProjectIssuesInput,
  type ProjectComponentListItem,
  type ProjectEpicListItem,
  type ProjectIssuesListResponse,
  type ProjectIssuesWorkspaceResponse,
  type ProjectModuleListItem,
  type ProjectReleaseListItem,
  type ProjectReleaseStatus,
  type ProjectSprintListItem,
  type SprintStatus,
} from "./types";

function toIsoString(value: Date | string) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toOptionalIsoString(value: Date | string | null) {
  return value ? toIsoString(value) : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeOption<T extends string>(
  value: string | null | undefined,
  options: readonly { value: T; label: string }[],
  fallback: T,
): T {
  return options.some((option) => option.value === value)
    ? (value as T)
    : fallback;
}

function normalizeIssueType(value: string | null | undefined): IssueType {
  return normalizeOption(value, ISSUE_TYPE_OPTIONS, "bug");
}

function normalizeIssuePriority(
  value: string | null | undefined,
): IssuePriority {
  return normalizeOption(value, ISSUE_PRIORITY_OPTIONS, "medium");
}

function normalizeIssueStatus(value: string | null | undefined): IssueStatus {
  if (value === "open") {
    return "todo";
  }

  if (value === "done") {
    return "fixed";
  }

  if (value === "reopened") {
    return "in_progress";
  }

  return normalizeOption(value, ISSUE_STATUS_OPTIONS, "todo");
}

function normalizeDevelopmentStatus(
  value: string | null | undefined,
): DevelopmentStatus {
  if (value === "done") {
    return "fixed";
  }

  return normalizeOption(value, DEVELOPMENT_STATUS_OPTIONS, "not_started");
}

function normalizeDeploymentStatus(
  value: string | null | undefined,
): DeploymentStatus {
  return normalizeOption(value, DEPLOYMENT_STATUS_OPTIONS, "not_deployed");
}

function normalizeIssueAssignmentGroup(
  value: string | null | undefined,
): IssueAssignmentGroup | null {
  return ISSUE_ASSIGNMENT_GROUP_OPTIONS.some((option) => option.value === value)
    ? (value as IssueAssignmentGroup)
    : null;
}

function getIssueAssignmentGroupLabel(value: IssueAssignmentGroup | null) {
  return value
    ? (ISSUE_ASSIGNMENT_GROUP_OPTIONS.find((option) => option.value === value)
        ?.label ?? value)
    : null;
}

function normalizeEpicStatus(value: string | null | undefined): EpicStatus {
  return normalizeOption(value, EPIC_STATUS_OPTIONS, "open");
}

function normalizeReleaseStatus(
  value: string | null | undefined,
): ProjectReleaseStatus {
  return normalizeOption(value, RELEASE_STATUS_OPTIONS, "planned");
}

function normalizeSprintStatus(value: string | null | undefined): SprintStatus {
  return normalizeOption(value, SPRINT_STATUS_OPTIONS, "planned");
}

function getIssueTypeLabel(type: IssueType) {
  return (
    ISSUE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
  );
}

export function toProjectModuleListItem(row: {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProjectModuleListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: Number(row.sortOrder ?? 0),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    displayName: row.name,
    parentModuleId: null,
    parentModuleName: null,
    isMainModule: true,
  };
}

function toProjectComponentListItem(row: {
  id: string;
  projectId?: string;
  moduleId: string;
  moduleName: string;
  name: string;
  description: string | null;
  leadId: string | null;
  leadName: string | null;
  sortOrder: number | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProjectComponentListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    moduleId: row.moduleId,
    moduleName: row.moduleName,
    name: row.name,
    description: row.description,
    leadId: row.leadId,
    leadName: row.leadName,
    sortOrder: Number(row.sortOrder ?? 0),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

export function toProjectEpicListItem(row: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDate: Date | string | null;
  targetDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProjectEpicListItem {
  return {
    id: row.id,
    title: row.title,
    name: row.title,
    description: row.description,
    status: normalizeEpicStatus(row.status),
    startDate: toOptionalIsoString(row.startDate),
    targetDate: toOptionalIsoString(row.targetDate),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

export function toProjectReleaseListItem(row: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: Date | string | null;
  targetDate: Date | string | null;
  releasedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProjectReleaseListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: normalizeReleaseStatus(row.status),
    startDate: toOptionalIsoString(row.startDate),
    targetDate: toOptionalIsoString(row.targetDate),
    releasedAt: toOptionalIsoString(row.releasedAt),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function toProjectSprintListItem(row: {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProjectSprintListItem {
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    status: normalizeSprintStatus(row.status),
    startDate: toOptionalIsoString(row.startDate),
    endDate: toOptionalIsoString(row.endDate),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function toIssueListItem(
  row: {
    id: string;
    key: string;
    sequence: number | string | null;
    issueType: string | null;
    title: string;
    description: string | null;
    status: string | null;
    priority: string | null;
    assigneeGroup: string | null;
    testerAssigneeGroup: string | null;
    moduleId: string | null;
    moduleName: string | null;
    componentId: string | null;
    componentName: string | null;
    epicId: string | null;
    epicTitle: string | null;
    sprintId: string | null;
    sprintName: string | null;
    releaseId: string | null;
    releaseName: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
    testerAssigneeId: string | null;
    testerAssigneeName: string | null;
    reporterId: string | null;
    reporterName: string | null;
    testedById: string | null;
    testedByName: string | null;
    parentIssueId: string | null;
    parentIssueKey: string | null;
    parentIssueTitle: string | null;
    remark: string | null;
    fixedDate: Date | string | null;
    reopenedBy: string | null;
    reopenedByName: string | null;
    reopenedAt: Date | string | null;
    developmentStatus: string | null;
    deploymentStatus: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  },
  options: {
    media?: IssueMediaListItem[];
    subtaskCount?: number;
    commentCount?: number;
    comments?: string | null;
  } = {},
): IssueListItem {
  const serialNumber = Number(row.sequence ?? 0);
  const issueType = normalizeIssueType(row.issueType);
  const status = normalizeIssueStatus(row.status);
  const priority = normalizeIssuePriority(row.priority);
  const developmentStatus = normalizeDevelopmentStatus(row.developmentStatus);
  const deploymentStatus = normalizeDeploymentStatus(row.deploymentStatus);
  const assigneeGroup = normalizeIssueAssignmentGroup(row.assigneeGroup);
  const assignmentGroupName = getIssueAssignmentGroupLabel(assigneeGroup);
  const testerAssigneeGroup = normalizeIssueAssignmentGroup(
    row.testerAssigneeGroup,
  );
  const testerAssignmentGroupName =
    getIssueAssignmentGroupLabel(testerAssigneeGroup);
  const issueTypeLabel = getIssueTypeLabel(issueType);

  return {
    id: row.id,
    key: row.key,
    issueKey: row.key,
    sequence: serialNumber,
    serialNumber,
    no: serialNumber,
    issueType,
    type: issueType,
    title: row.title,
    description: row.description,
    status,
    priority,
    assigneeGroup,
    testerAssigneeGroup,
    moduleId: row.moduleId,
    moduleName: row.moduleName,
    componentId: row.componentId,
    componentName: row.componentName,
    epicId: row.epicId,
    epicTitle: row.epicTitle,
    sprintId: row.sprintId,
    sprintName: row.sprintName,
    releaseId: row.releaseId,
    releaseName: row.releaseName,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    testerAssigneeId: row.testerAssigneeId,
    testerAssigneeName: row.testerAssigneeName,
    reporterId: row.reporterId,
    reporterName: row.reporterName,
    testedById: row.testedById,
    testedByName: row.testedByName,
    parentIssueId: row.parentIssueId,
    parentIssueKey: row.parentIssueKey,
    parentIssueTitle: row.parentIssueTitle,
    subtaskCount: options.subtaskCount ?? 0,
    commentCount: options.commentCount ?? 0,
    remark: row.remark,
    fixedDate: toOptionalIsoString(row.fixedDate),
    developmentStatus,
    deploymentStatus,
    media: options.media ?? [],
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),

    navigation: row.componentName ?? row.moduleName ?? null,
    mainModuleId: row.moduleId,
    mainModuleName: row.moduleName,
    subModuleId: row.componentId,
    subModuleName: row.componentName,
    issueClassId: issueType,
    issueClassName: issueTypeLabel,
    assignedTo: row.assigneeId,
    assignedToName: row.assigneeName ?? assignmentGroupName,
    assignmentGroup: assigneeGroup,
    assignmentGroupName,
    testerAssignedTo: row.testerAssigneeId,
    testerAssignedToName: row.testerAssigneeName ?? testerAssignmentGroupName,
    testerAssignmentGroup: testerAssigneeGroup,
    testerAssignmentGroupName,
    reviewedBy: null,
    reviewedByName: null,
    comments: options.comments ?? null,
    testedBy: row.testedById,
    reopenedBy: row.reopenedBy,
    reopenedByName: row.reopenedByName,
    reopenedAt: toOptionalIsoString(row.reopenedAt),
    development: developmentStatus === "fixed",
    deployment:
      deploymentStatus === "deployed" || deploymentStatus === "verified",
    createdBy: row.reporterId,
    createdByName: row.reporterName,
  };
}

function buildIssueTypeListItems() {
  const now = new Date(0).toISOString();

  return ISSUE_TYPE_OPTIONS.map((option) => ({
    id: option.value,
    name: option.label,
    description:
      option.value === "bug"
        ? "Broken behavior or regression."
        : option.value === "improvement"
          ? "Incremental product or workflow improvement."
          : option.value === "subtask"
            ? "Smaller piece of work under a parent issue."
            : "Implementation or operational work.",
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  }));
}

function appendNullableIdFilter(
  conditions: SQL[],
  field: SQLWrapper,
  selectedValues: string[],
) {
  if (selectedValues.length === 0) {
    return;
  }

  const selectedIds = selectedValues.filter(
    (value) => value !== GENERAL_MODULE_FILTER_VALUE,
  );
  const filterConditions: SQL[] = [];

  if (selectedIds.length > 0) {
    filterConditions.push(inArray(field as never, selectedIds));
  }

  if (selectedValues.includes(GENERAL_MODULE_FILTER_VALUE)) {
    filterConditions.push(isNull(field as never));
  }

  if (filterConditions.length > 0) {
    conditions.push(or(...filterConditions) as SQL);
  }
}

function buildProjectIssuesWhereClause(
  projectId: string,
  currentUserId: string,
  input: ListProjectIssuesInput,
  currentUserRoles: readonly string[],
  aliases: {
    assigneeName: SQLWrapper;
    testerAssigneeName: SQLWrapper;
    reporterName: SQLWrapper;
    testedByName: SQLWrapper;
    moduleName: SQLWrapper;
    componentName: SQLWrapper;
    epicTitle: SQLWrapper;
    releaseName: SQLWrapper;
    sprintName: SQLWrapper;
  },
) {
  const conditions: SQL[] = [eq(issues.projectId, projectId)];

  if (input.resolution === "open") {
    conditions.push(ne(issues.status, "fixed"));
  } else if (input.resolution === "review") {
    conditions.push(eq(issues.status, "review"));
  } else if (input.resolution === "resolved") {
    conditions.push(eq(issues.status, "fixed"));
  } else if (input.resolution === "reopened") {
    conditions.push(sql`${issues.reopenedAt} is not null`);
  }

  if (input.typeFilters.length > 0) {
    conditions.push(inArray(issues.issueType, input.typeFilters));
  }

  if (input.statusFilters.length > 0) {
    conditions.push(inArray(issues.status, input.statusFilters));
  }

  appendNullableIdFilter(conditions, issues.moduleId, input.moduleFilters);
  appendNullableIdFilter(
    conditions,
    issues.componentId,
    input.componentFilters,
  );

  if (input.epicFilters.length > 0) {
    conditions.push(inArray(issues.epicId, input.epicFilters));
  }

  if (input.releaseFilters.length > 0) {
    conditions.push(inArray(issues.releaseId, input.releaseFilters));
  }

  if (input.sprintFilters.length > 0) {
    conditions.push(inArray(issues.sprintId, input.sprintFilters));
  }

  if (input.priorityFilters.length > 0) {
    conditions.push(inArray(issues.priority, input.priorityFilters));
  }

  if (input.assigneeFilters.length > 0) {
    const assigneeConditions: SQL[] = [];

    if (input.assigneeFilters.includes("current-user")) {
      assigneeConditions.push(
        or(
          eq(issues.assigneeId, currentUserId),
          eq(issues.testerAssigneeId, currentUserId),
        ) as SQL,
      );
    }

    if (input.assigneeFilters.includes("current-role")) {
      const roleConditions: SQL[] = [];

      if (currentUserRoles.includes("developer")) {
        roleConditions.push(
          and(
            eq(issues.assigneeGroup, "development"),
            isNull(issues.assigneeId),
          ) as SQL,
        );
      }

      if (currentUserRoles.includes("tester")) {
        roleConditions.push(
          and(
            eq(issues.testerAssigneeGroup, "testing"),
            isNull(issues.testerAssigneeId),
          ) as SQL,
        );
      }

      assigneeConditions.push(
        roleConditions.length > 0 ? (or(...roleConditions) as SQL) : sql`false`,
      );
    }

    if (input.assigneeFilters.includes("unassigned")) {
      assigneeConditions.push(
        and(isNull(issues.assigneeId), isNull(issues.testerAssigneeId)) as SQL,
      );
    }

    if (assigneeConditions.length > 0) {
      conditions.push(or(...assigneeConditions) as SQL);
    }
  }

  if (input.reporterFilters.includes("current-user")) {
    conditions.push(eq(issues.reporterId, currentUserId));
  }

  if (input.testedByFilters.includes("current-user")) {
    conditions.push(eq(issues.testedById, currentUserId));
  }

  if (input.testedByFilters.includes("untested")) {
    conditions.push(isNull(issues.testedById));
  }

  if (input.backlogOnly) {
    conditions.push(
      and(isNull(issues.sprintId), ne(issues.status, "fixed")) as SQL,
    );
  }

  const normalizedSearch = input.search.trim();

  if (normalizedSearch) {
    const pattern = `%${normalizedSearch}%`;

    conditions.push(
      or(
        ilike(issues.key, pattern),
        ilike(issues.title, pattern),
        ilike(issues.description, pattern),
        ilike(issues.issueType, pattern),
        ilike(issues.status, pattern),
        ilike(issues.priority, pattern),
        ilike(issues.assigneeGroup, pattern),
        ilike(issues.testerAssigneeGroup, pattern),
        ilike(issues.remark, pattern),
        ilike(issues.developmentStatus, pattern),
        ilike(issues.deploymentStatus, pattern),
        sql<boolean>`coalesce(${aliases.assigneeName}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.testerAssigneeName}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.reporterName}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.testedByName}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.moduleName}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.componentName}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.epicTitle}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.releaseName}, '') ilike ${pattern}`,
        sql<boolean>`coalesce(${aliases.sprintName}, '') ilike ${pattern}`,
      ) as SQL,
    );
  }

  return and(...conditions) as SQL;
}

function buildProjectIssuesOrderBy(
  input: Pick<ListProjectIssuesInput, "sortBy" | "sortDirection">,
  aliases: {
    assigneeName: SQLWrapper;
    testerAssigneeName: SQLWrapper;
    testedByName: SQLWrapper;
    moduleName: SQLWrapper;
    componentName: SQLWrapper;
    epicTitle: SQLWrapper;
    releaseName: SQLWrapper;
    sprintName: SQLWrapper;
  },
) {
  const direction = input.sortDirection;
  const typeOrder = sql<number>`case
    when ${issues.issueType} = 'bug' then 1
    when ${issues.issueType} = 'task' then 2
    when ${issues.issueType} = 'improvement' then 3
    when ${issues.issueType} = 'subtask' then 4
    else 9
  end`;
  const statusOrder = sql<number>`case
    when ${issues.status} = 'todo' then 1
    when ${issues.status} = 'open' then 1
    when ${issues.status} = 'in_progress' then 2
    when ${issues.status} = 'reopened' then 2
    when ${issues.status} = 'review' then 3
    when ${issues.status} = 'fixed' then 4
    when ${issues.status} = 'done' then 4
    else 9
  end`;
  const priorityOrder = sql<number>`case
    when ${issues.priority} = 'critical' then 4
    when ${issues.priority} = 'high' then 3
    when ${issues.priority} = 'medium' then 2
    when ${issues.priority} = 'low' then 1
    else 0
  end`;

  function withDirection(value: SQLWrapper) {
    return direction === "asc" ? asc(value) : desc(value);
  }

  switch (input.sortBy) {
    case "serialNumber":
    case "no":
    case "key":
    case "issueKey":
      return direction === "asc"
        ? [asc(issues.sequence), asc(issues.id)]
        : [desc(issues.sequence), asc(issues.id)];
    case "title":
      return [
        withDirection(issues.title),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "issueType":
    case "type":
      return [
        withDirection(typeOrder),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "status":
      return [
        withDirection(statusOrder),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "priority":
      return [
        withDirection(priorityOrder),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "module":
    case "moduleName":
      return [
        withDirection(sql<string>`coalesce(${aliases.moduleName}, '')`),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "component":
    case "componentName":
      return [
        withDirection(sql<string>`coalesce(${aliases.componentName}, '')`),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "epic":
    case "epicTitle":
      return [
        withDirection(sql<string>`coalesce(${aliases.epicTitle}, '')`),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "release":
    case "releaseName":
      return [
        withDirection(sql<string>`coalesce(${aliases.releaseName}, '')`),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "sprint":
    case "sprintName":
      return [
        withDirection(sql<string>`coalesce(${aliases.sprintName}, '')`),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "assignee":
    case "assigneeName":
    case "assignedToName":
      return [
        withDirection(
          sql<string>`coalesce(${aliases.assigneeName}, ${aliases.testerAssigneeName}, '')`,
        ),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "testerAssigneeName":
    case "testerAssignedToName":
      return [
        withDirection(sql<string>`coalesce(${aliases.testerAssigneeName}, '')`),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "testedBy":
    case "testedByName":
      return [
        withDirection(sql<string>`coalesce(${aliases.testedByName}, '')`),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "fixedDate":
      return [
        withDirection(issues.fixedDate),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "developmentStatus":
      return [
        withDirection(issues.developmentStatus),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "deploymentStatus":
      return [
        withDirection(issues.deploymentStatus),
        desc(issues.updatedAt),
        desc(issues.sequence),
        asc(issues.id),
      ];
    case "updatedAt":
    default:
      return direction === "asc"
        ? [asc(issues.updatedAt), asc(issues.sequence), asc(issues.id)]
        : [desc(issues.updatedAt), desc(issues.sequence), asc(issues.id)];
  }
}

function buildIssueAliases(prefix = "issue") {
  return {
    assignee: alias(user, `${prefix}_assignee`),
    testerAssignee: alias(user, `${prefix}_tester_assignee`),
    reporter: alias(user, `${prefix}_reporter`),
    testedBy: alias(user, `${prefix}_tested_by`),
    reopenedBy: alias(user, `${prefix}_reopened_by`),
    parentIssue: alias(issues, `${prefix}_parent_issue`),
  };
}

async function getProjectIssueRows(
  projectId: string,
  currentUserId: string,
  input: ListProjectIssuesInput,
  currentUserRoles: readonly string[] = [],
) {
  const aliases = buildIssueAliases();

  return db
    .select({
      id: issues.id,
      key: issues.key,
      sequence: issues.sequence,
      issueType: issues.issueType,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      assigneeGroup: issues.assigneeGroup,
      testerAssigneeGroup: issues.testerAssigneeGroup,
      moduleId: issues.moduleId,
      moduleName: projectModules.name,
      componentId: issues.componentId,
      componentName: projectComponents.name,
      epicId: issues.epicId,
      epicTitle: projectEpics.title,
      sprintId: issues.sprintId,
      sprintName: sprints.name,
      releaseId: issues.releaseId,
      releaseName: projectReleases.name,
      assigneeId: issues.assigneeId,
      assigneeName: aliases.assignee.name,
      testerAssigneeId: issues.testerAssigneeId,
      testerAssigneeName: aliases.testerAssignee.name,
      reporterId: issues.reporterId,
      reporterName: aliases.reporter.name,
      testedById: issues.testedById,
      testedByName: aliases.testedBy.name,
      parentIssueId: issues.parentIssueId,
      parentIssueKey: aliases.parentIssue.key,
      parentIssueTitle: aliases.parentIssue.title,
      remark: issues.remark,
      fixedDate: issues.fixedDate,
      reopenedBy: issues.reopenedById,
      reopenedByName: aliases.reopenedBy.name,
      reopenedAt: issues.reopenedAt,
      developmentStatus: issues.developmentStatus,
      deploymentStatus: issues.deploymentStatus,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .leftJoin(aliases.assignee, eq(issues.assigneeId, aliases.assignee.id))
    .leftJoin(
      aliases.testerAssignee,
      eq(issues.testerAssigneeId, aliases.testerAssignee.id),
    )
    .leftJoin(aliases.reporter, eq(issues.reporterId, aliases.reporter.id))
    .leftJoin(aliases.testedBy, eq(issues.testedById, aliases.testedBy.id))
    .leftJoin(
      aliases.reopenedBy,
      eq(issues.reopenedById, aliases.reopenedBy.id),
    )
    .leftJoin(
      aliases.parentIssue,
      eq(issues.parentIssueId, aliases.parentIssue.id),
    )
    .leftJoin(projectModules, eq(issues.moduleId, projectModules.id))
    .leftJoin(projectComponents, eq(issues.componentId, projectComponents.id))
    .leftJoin(projectEpics, eq(issues.epicId, projectEpics.id))
    .leftJoin(projectReleases, eq(issues.releaseId, projectReleases.id))
    .leftJoin(sprints, eq(issues.sprintId, sprints.id))
    .where(
      buildProjectIssuesWhereClause(
        projectId,
        currentUserId,
        input,
        currentUserRoles,
        {
          assigneeName: aliases.assignee.name,
          testerAssigneeName: aliases.testerAssignee.name,
          reporterName: aliases.reporter.name,
          testedByName: aliases.testedBy.name,
          moduleName: projectModules.name,
          componentName: projectComponents.name,
          epicTitle: projectEpics.title,
          releaseName: projectReleases.name,
          sprintName: sprints.name,
        },
      ),
    )
    .orderBy(
      ...buildProjectIssuesOrderBy(input, {
        assigneeName: aliases.assignee.name,
        testerAssigneeName: aliases.testerAssignee.name,
        testedByName: aliases.testedBy.name,
        moduleName: projectModules.name,
        componentName: projectComponents.name,
        epicTitle: projectEpics.title,
        releaseName: projectReleases.name,
        sprintName: sprints.name,
      }),
    )
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);
}

async function getFilteredProjectIssuesCount(
  projectId: string,
  currentUserId: string,
  input: ListProjectIssuesInput,
  currentUserRoles: readonly string[] = [],
) {
  const aliases = buildIssueAliases("count_issue");

  const [countRow] = await db
    .select({ totalItems: count(issues.id) })
    .from(issues)
    .leftJoin(aliases.assignee, eq(issues.assigneeId, aliases.assignee.id))
    .leftJoin(
      aliases.testerAssignee,
      eq(issues.testerAssigneeId, aliases.testerAssignee.id),
    )
    .leftJoin(aliases.reporter, eq(issues.reporterId, aliases.reporter.id))
    .leftJoin(aliases.testedBy, eq(issues.testedById, aliases.testedBy.id))
    .leftJoin(projectModules, eq(issues.moduleId, projectModules.id))
    .leftJoin(projectComponents, eq(issues.componentId, projectComponents.id))
    .leftJoin(projectEpics, eq(issues.epicId, projectEpics.id))
    .leftJoin(projectReleases, eq(issues.releaseId, projectReleases.id))
    .leftJoin(sprints, eq(issues.sprintId, sprints.id))
    .where(
      buildProjectIssuesWhereClause(
        projectId,
        currentUserId,
        input,
        currentUserRoles,
        {
          assigneeName: aliases.assignee.name,
          testerAssigneeName: aliases.testerAssignee.name,
          reporterName: aliases.reporter.name,
          testedByName: aliases.testedBy.name,
          moduleName: projectModules.name,
          componentName: projectComponents.name,
          epicTitle: projectEpics.title,
          releaseName: projectReleases.name,
          sprintName: sprints.name,
        },
      ),
    );

  return Number(countRow?.totalItems ?? 0);
}

async function getProjectIssuesSummary(
  projectId: string,
): Promise<IssueListSummary> {
  const [summaryRow, epicCountRow] = await Promise.all([
    db
      .select({
        totalIssues: count(issues.id),
        openIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.status} <> 'fixed') as integer)`,
        doneIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.status} = 'fixed') as integer)`,
        reviewIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.status} = 'review') as integer)`,
        fixedIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.status} = 'fixed') as integer)`,
        reopenedIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.reopenedAt} is not null) as integer)`,
        backlogIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.sprintId} is null and ${issues.status} <> 'fixed') as integer)`,
        criticalIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.priority} = 'critical' and ${issues.status} <> 'fixed') as integer)`,
        unassignedIssueCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.assigneeId} is null and ${issues.testerAssigneeId} is null and ${issues.status} <> 'fixed') as integer)`,
      })
      .from(issues)
      .where(eq(issues.projectId, projectId)),
    db
      .select({ totalEpics: count(projectEpics.id) })
      .from(projectEpics)
      .where(eq(projectEpics.projectId, projectId)),
  ]);

  const row = summaryRow[0];
  const totalIssues = Number(row?.totalIssues ?? 0);
  const doneIssueCount = Number(row?.doneIssueCount ?? 0);

  return {
    totalIssues,
    openIssueCount: Number(row?.openIssueCount ?? 0),
    doneIssueCount,
    reviewIssueCount: Number(row?.reviewIssueCount ?? 0),
    fixedIssueCount: Number(row?.fixedIssueCount ?? 0),
    backlogIssueCount: Number(row?.backlogIssueCount ?? 0),
    epicCount: Number(epicCountRow[0]?.totalEpics ?? 0),
    criticalIssueCount: Number(row?.criticalIssueCount ?? 0),
    unassignedIssueCount: Number(row?.unassignedIssueCount ?? 0),
    hasUnclassifiedIssues: false,
    resolvedIssueCount: doneIssueCount,
    reopenedIssueCount: Number(row?.reopenedIssueCount ?? 0),
  };
}

async function getIssueGroupCounts(
  projectId: string,
  field:
    | typeof issues.moduleId
    | typeof issues.componentId
    | typeof issues.releaseId
    | typeof issues.epicId
    | typeof issues.sprintId,
): Promise<IssueGroupCount[]> {
  const rows = await db
    .select({
      id: field,
      issueCount: count(issues.id),
      doneCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.status} = 'fixed') as integer)`,
      highPriorityCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.priority} in ('critical', 'high') and ${issues.status} <> 'fixed') as integer)`,
      openCount: sql<number>`cast(count(${issues.id}) filter (where ${issues.status} <> 'fixed') as integer)`,
    })
    .from(issues)
    .where(eq(issues.projectId, projectId))
    .groupBy(field);

  return rows.map((row) => ({
    id: row.id,
    issueCount: Number(row.issueCount ?? 0),
    doneCount: Number(row.doneCount ?? 0),
    highPriorityCount: Number(row.highPriorityCount ?? 0),
    openCount: Number(row.openCount ?? 0),
  }));
}

async function getIssueSubtaskCounts(issueIds: string[]) {
  if (issueIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db
    .select({
      parentIssueId: issues.parentIssueId,
      subtaskCount: count(issues.id),
    })
    .from(issues)
    .where(inArray(issues.parentIssueId, issueIds))
    .groupBy(issues.parentIssueId);

  return new Map(
    rows
      .filter((row) => Boolean(row.parentIssueId))
      .map((row) => [
        row.parentIssueId as string,
        Number(row.subtaskCount ?? 0),
      ]),
  );
}

async function getIssueCommentCounts(issueIds: string[]) {
  if (issueIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db
    .select({
      issueId: issueComments.issueId,
      commentCount: count(issueComments.id),
    })
    .from(issueComments)
    .where(inArray(issueComments.issueId, issueIds))
    .groupBy(issueComments.issueId);

  return new Map(
    rows.map((row) => [row.issueId, Number(row.commentCount ?? 0)]),
  );
}

async function getIssueCommentTexts(issueIds: string[]) {
  if (issueIds.length === 0) {
    return new Map<string, string>();
  }

  const rows = await db
    .select({
      issueId: issueComments.issueId,
      body: issueComments.body,
    })
    .from(issueComments)
    .where(inArray(issueComments.issueId, issueIds))
    .orderBy(asc(issueComments.createdAt), asc(issueComments.id));
  const commentsByIssueId = new Map<string, string[]>();

  for (const row of rows) {
    const issueCommentsForIssue = commentsByIssueId.get(row.issueId) ?? [];
    issueCommentsForIssue.push(row.body);
    commentsByIssueId.set(row.issueId, issueCommentsForIssue);
  }

  return new Map(
    Array.from(commentsByIssueId.entries()).map(([issueId, comments]) => [
      issueId,
      comments.join("\n\n"),
    ]),
  );
}

async function hydrateIssueRows(
  rows: Awaited<ReturnType<typeof getProjectIssueRows>>,
  options?: { includeMedia?: boolean },
) {
  const issueIds = rows.map((row) => row.id);
  const [mediaByIssueId, subtaskCounts, commentCounts, commentTexts] =
    await Promise.all([
      options?.includeMedia === false
        ? Promise.resolve(new Map<string, IssueMediaListItem[]>())
        : listIssueMediaForIssueIds(issueIds),
      getIssueSubtaskCounts(issueIds),
      getIssueCommentCounts(issueIds),
      getIssueCommentTexts(issueIds),
    ]);

  return rows.map((row) =>
    toIssueListItem(row, {
      media: mediaByIssueId.get(row.id) ?? [],
      subtaskCount: subtaskCounts.get(row.id) ?? 0,
      commentCount: commentCounts.get(row.id) ?? 0,
      comments: commentTexts.get(row.id) ?? null,
    }),
  );
}

async function listProjectEpics(projectId: string) {
  const rows = await db
    .select({
      id: projectEpics.id,
      title: projectEpics.title,
      description: projectEpics.description,
      status: projectEpics.status,
      startDate: projectEpics.startDate,
      targetDate: projectEpics.targetDate,
      createdAt: projectEpics.createdAt,
      updatedAt: projectEpics.updatedAt,
    })
    .from(projectEpics)
    .where(eq(projectEpics.projectId, projectId))
    .orderBy(asc(projectEpics.title), asc(projectEpics.id));

  return rows.map(toProjectEpicListItem);
}

async function listIssueRolesForTeamMember(userId: string, teamId: string) {
  const rows = await db
    .select({ role: teamMemberRoles.role })
    .from(teamMemberRoles)
    .where(
      and(
        eq(teamMemberRoles.userId, userId),
        eq(teamMemberRoles.teamId, teamId),
      ),
    );

  return Array.from(new Set(rows.map((row) => row.role)));
}

export async function getProjectIssuesWorkspaceForUser(
  userId: string,
  teamId: string,
  projectId: string,
): Promise<ProjectIssuesWorkspaceResponse | null> {
  const [teamMembers, project] = await Promise.all([
    listTeamMembersForUser(userId, teamId),
    getProjectForTeam(userId, teamId, projectId),
  ]);

  if (!teamMembers || !project) {
    return null;
  }

  const componentLead = alias(user, "component_lead");
  const [moduleRows, componentRows, releaseRows, sprintRows, epics] =
    await Promise.all([
      db
        .select({
          id: projectModules.id,
          name: projectModules.name,
          description: projectModules.description,
          sortOrder: projectModules.sortOrder,
          createdAt: projectModules.createdAt,
          updatedAt: projectModules.updatedAt,
        })
        .from(projectModules)
        .where(eq(projectModules.projectId, projectId))
        .orderBy(
          asc(projectModules.sortOrder),
          asc(projectModules.name),
          asc(projectModules.id),
        ),
      db
        .select({
          id: projectComponents.id,
          projectId: projectComponents.projectId,
          moduleId: projectComponents.moduleId,
          moduleName: projectModules.name,
          name: projectComponents.name,
          description: projectComponents.description,
          leadId: projectComponents.leadId,
          leadName: componentLead.name,
          sortOrder: projectComponents.sortOrder,
          createdAt: projectComponents.createdAt,
          updatedAt: projectComponents.updatedAt,
        })
        .from(projectComponents)
        .innerJoin(
          projectModules,
          eq(projectComponents.moduleId, projectModules.id),
        )
        .leftJoin(componentLead, eq(projectComponents.leadId, componentLead.id))
        .where(eq(projectComponents.projectId, projectId))
        .orderBy(
          asc(projectModules.sortOrder),
          asc(projectModules.name),
          asc(projectComponents.sortOrder),
          asc(projectComponents.name),
          asc(projectComponents.id),
        ),
      db
        .select({
          id: projectReleases.id,
          name: projectReleases.name,
          description: projectReleases.description,
          status: projectReleases.status,
          startDate: projectReleases.startDate,
          targetDate: projectReleases.targetDate,
          releasedAt: projectReleases.releasedAt,
          createdAt: projectReleases.createdAt,
          updatedAt: projectReleases.updatedAt,
        })
        .from(projectReleases)
        .where(eq(projectReleases.projectId, projectId))
        .orderBy(asc(projectReleases.targetDate), asc(projectReleases.name)),
      db
        .select({
          id: sprints.id,
          name: sprints.name,
          goal: sprints.goal,
          status: sprints.status,
          startDate: sprints.startDate,
          endDate: sprints.endDate,
          createdAt: sprints.createdAt,
          updatedAt: sprints.updatedAt,
        })
        .from(sprints)
        .where(eq(sprints.projectId, projectId))
        .orderBy(asc(sprints.startDate), asc(sprints.name)),
      listProjectEpics(projectId),
    ]);

  const issueTypes = buildIssueTypeListItems();

  return {
    team: teamMembers.team,
    project,
    members: teamMembers.members,
    issueTypes,
    modules: moduleRows.map(toProjectModuleListItem),
    components: componentRows.map(toProjectComponentListItem),
    epics,
    releases: releaseRows.map(toProjectReleaseListItem),
    sprints: sprintRows.map(toProjectSprintListItem),
    issueClasses: issueTypes,
  };
}

export async function listProjectIssuesForUser(
  userId: string,
  teamId: string,
  projectId: string,
  input: ListProjectIssuesInput,
): Promise<ProjectIssuesListResponse | null> {
  const project = await getProjectForTeam(userId, teamId, projectId);

  if (!project) {
    return null;
  }

  const currentUserRoles = await listIssueRolesForTeamMember(userId, teamId);
  const [
    summary,
    moduleCounts,
    componentCounts,
    releaseCounts,
    epicCounts,
    sprintCounts,
    totalItems,
  ] = await Promise.all([
    getProjectIssuesSummary(projectId),
    getIssueGroupCounts(projectId, issues.moduleId),
    getIssueGroupCounts(projectId, issues.componentId),
    getIssueGroupCounts(projectId, issues.releaseId),
    getIssueGroupCounts(projectId, issues.epicId),
    getIssueGroupCounts(projectId, issues.sprintId),
    getFilteredProjectIssuesCount(projectId, userId, input, currentUserRoles),
  ]);

  const totalPages =
    totalItems > 0 ? Math.ceil(totalItems / input.pageSize) : 1;
  const page = Math.max(1, Math.min(input.page, totalPages));
  const rows = await getProjectIssueRows(
    projectId,
    userId,
    {
      ...input,
      page,
    },
    currentUserRoles,
  );
  const hydratedIssues = await hydrateIssueRows(rows);

  return {
    issues: hydratedIssues,
    summary,
    moduleCounts: moduleCounts.map((moduleCount) => ({
      ...moduleCount,
      moduleId: moduleCount.id,
    })),
    componentCounts,
    releaseCounts,
    epicCounts,
    sprintCounts,
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

export async function getProjectIssueForUser(
  userId: string,
  teamId: string,
  projectId: string,
  issueKeyOrId: string,
) {
  const project = await getProjectForTeam(userId, teamId, projectId);

  if (!project) {
    return null;
  }

  const input: ListProjectIssuesInput = {
    page: 1,
    pageSize: 1,
    search: "",
    resolution: "all",
    typeFilters: [],
    statusFilters: [],
    moduleFilters: [],
    componentFilters: [],
    epicFilters: [],
    releaseFilters: [],
    sprintFilters: [],
    priorityFilters: [],
    assigneeFilters: [],
    reporterFilters: [],
    testedByFilters: [],
    backlogOnly: false,
    sortBy: "updatedAt",
    sortDirection: "desc",
    issueTypeFilters: [],
  };
  const rows = await getProjectIssueRows(projectId, userId, input);
  const matchedRows = rows.filter((row) =>
    isUuid(issueKeyOrId)
      ? row.id === issueKeyOrId || row.key === issueKeyOrId
      : row.key === issueKeyOrId,
  );

  if (matchedRows.length === 0) {
    const allRows = await getProjectIssueRows(projectId, userId, {
      ...input,
      pageSize: 2147483647,
    });
    matchedRows.push(
      ...allRows.filter((row) =>
        isUuid(issueKeyOrId)
          ? row.id === issueKeyOrId || row.key === issueKeyOrId
          : row.key === issueKeyOrId,
      ),
    );
  }

  if (!matchedRows[0]) {
    return null;
  }

  const [issue] = await hydrateIssueRows([matchedRows[0]]);
  return issue ?? null;
}

function toIssueExcelRow(issue: IssueListItem): IssueExcelRow {
  return {
    no: issue.serialNumber,
    moduleName: issue.moduleName,
    componentName: issue.componentName,
    title: issue.title,
    priority:
      ISSUE_PRIORITY_OPTIONS.find((option) => option.value === issue.priority)
        ?.label ?? issue.priority,
    assignedToName: issue.assignedToName,
    testerAssignedToName: issue.testerAssignedToName,
    status:
      ISSUE_STATUS_OPTIONS.find((option) => option.value === issue.status)
        ?.label ?? issue.status,
    comments: issue.comments,
    remark: issue.remark,
    fixedDate: issue.fixedDate,
    developmentStatus:
      DEVELOPMENT_STATUS_OPTIONS.find(
        (option) => option.value === issue.developmentStatus,
      )?.label ?? issue.developmentStatus,
    deploymentStatus:
      DEPLOYMENT_STATUS_OPTIONS.find(
        (option) => option.value === issue.deploymentStatus,
      )?.label ?? issue.deploymentStatus,
    epicTitle: issue.epicTitle,
    sprintName: issue.sprintName,
    releaseName: issue.releaseName,
  };
}

export async function listProjectIssuesForExcelForUser(
  userId: string,
  teamId: string,
  projectId: string,
  input: ListProjectIssuesInput,
) {
  const projectIssues = await listProjectIssuesForUser(
    userId,
    teamId,
    projectId,
    {
      ...input,
      page: 1,
      pageSize: 2147483647,
      sortBy: "serialNumber",
      sortDirection: "asc",
    },
  );

  return projectIssues?.issues.map(toIssueExcelRow) ?? null;
}

export async function listProjectIssueWorkbookBundleForUser(
  userId: string,
  teamId: string,
  projectId: string,
  projectName: string,
): Promise<IssueExcelWorkbook[] | null> {
  const rows = await listProjectIssuesForExcelForUser(
    userId,
    teamId,
    projectId,
    {
      page: 1,
      pageSize: 2147483647,
      search: "",
      resolution: "all",
      typeFilters: [],
      statusFilters: [],
      moduleFilters: [],
      componentFilters: [],
      epicFilters: [],
      releaseFilters: [],
      sprintFilters: [],
      priorityFilters: [],
      assigneeFilters: [],
      reporterFilters: [],
      testedByFilters: [],
      backlogOnly: false,
      sortBy: "serialNumber",
      sortDirection: "asc",
      issueTypeFilters: [],
    },
  );

  if (!rows) {
    return null;
  }

  return [
    {
      fileName: `${projectName || "project"}-issues.xlsx`,
      sheets: [
        {
          sheetName: "Issues",
          rows,
        },
      ],
    },
  ];
}
