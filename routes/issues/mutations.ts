import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { issueClasses, issues, projectModules, user, usersToTeams } from "@/db/schema";
import { RouteError } from "@/routes/errors";
import { getProjectForTeam } from "@/routes/projects/queries";
import { getTeamForUser, listTeamMembersForUser } from "@/routes/teams/queries";
import type { TeamMemberListItem } from "@/routes/teams/types";

import { ensureDefaultIssueClassesForProject } from "./queries";
import {
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  type CreateIssueClassInput,
  type CreateIssueInput,
  type CreateProjectModuleInput,
  type IssueClassListItem,
  type IssueExcelImportResponse,
  type IssueExcelRow,
  type IssueListItem,
  type IssuePriority,
  type IssueStatus,
  type ProjectModuleListItem,
  type UpdateIssueInput,
} from "./types";

const MODULE_NAME_MAX_LENGTH = 80;
const ISSUE_CLASS_NAME_MAX_LENGTH = 50;
const ISSUE_NAVIGATION_MAX_LENGTH = 255;
const ISSUE_TITLE_MAX_LENGTH = 255;
const ISSUE_TEXT_MAX_LENGTH = 2000;

export interface IssueActor {
  id: string;
}

export interface UpdateIssueResult {
  issue: IssueListItem;
  previousAssignedTo: string | null;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeName(value: string, label: string, maxLength: number) {
  const normalizedValue = value.trim();

  if (normalizedValue.length < 2) {
    throw new RouteError(`${label} must be at least 2 characters long.`);
  }

  if (normalizedValue.length > maxLength) {
    throw new RouteError(`${label} must be ${maxLength} characters or fewer.`);
  }

  return normalizedValue;
}

function normalizeDescription(description?: string | null) {
  const value = description?.trim() ?? "";

  if (!value) {
    return null;
  }

  if (value.length > ISSUE_TEXT_MAX_LENGTH) {
    throw new RouteError(`Description must be ${ISSUE_TEXT_MAX_LENGTH} characters or fewer.`);
  }

  return value;
}

function normalizeOptionalText(value: string | null | undefined, label: string, maxLength: number) {
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > maxLength) {
    throw new RouteError(`${label} must be ${maxLength} characters or fewer.`);
  }

  return normalizedValue;
}

function normalizeOptionalId(value?: string | null) {
  const normalizedValue = value?.trim() ?? "";

  return normalizedValue || null;
}

function normalizeOptionalDate(value?: string | null) {
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = new Date(normalizedValue);

  if (Number.isNaN(parsedValue.getTime())) {
    throw new RouteError("Choose a valid fixed date.");
  }

  return parsedValue;
}

function normalizeOptionalBoolean(value?: boolean | null) {
  return Boolean(value);
}

function normalizeIssuePriority(value: string): IssuePriority {
  if (ISSUE_PRIORITY_OPTIONS.some((option) => option.value === value)) {
    return value as IssuePriority;
  }

  throw new RouteError("Choose a valid issue priority.");
}

function normalizeIssueStatus(value: string): IssueStatus {
  if (ISSUE_STATUS_OPTIONS.some((option) => option.value === value)) {
    return value as IssueStatus;
  }

  throw new RouteError("Choose a valid issue status.");
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
  priority: string;
  status: string;
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
    priority: row.priority as IssuePriority,
    status: row.status as IssueStatus,
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

async function requireEditableProjectForUser(
  actor: IssueActor,
  teamId: string,
  projectId: string
) {
  const team = await getTeamForUser(actor.id, teamId);

  if (!team) {
    throw new RouteError("Team not found.", 404);
  }

  if (!team.canEdit) {
    throw new RouteError("You only have read access to this team.", 403);
  }

  const project = await getProjectForTeam(actor.id, teamId, projectId);

  if (!project) {
    throw new RouteError("Project not found.", 404);
  }

  return { team, project };
}

async function getProjectModuleRecord(projectId: string, moduleId: string) {
  const [module] = await db
    .select({
      id: projectModules.id,
      name: projectModules.name,
      description: projectModules.description,
      createdAt: projectModules.createdAt,
      updatedAt: projectModules.updatedAt,
    })
    .from(projectModules)
    .where(and(eq(projectModules.projectId, projectId), eq(projectModules.id, moduleId)))
    .limit(1);

  return module ? toProjectModuleListItem(module) : null;
}

async function getIssueClassRecord(projectId: string, issueClassId: string) {
  const [issueClass] = await db
    .select({
      id: issueClasses.id,
      name: issueClasses.name,
      description: issueClasses.description,
      isSystem: issueClasses.isSystem,
      createdAt: issueClasses.createdAt,
      updatedAt: issueClasses.updatedAt,
    })
    .from(issueClasses)
    .where(and(eq(issueClasses.projectId, projectId), eq(issueClasses.id, issueClassId)))
    .limit(1);

  return issueClass ? toIssueClassListItem(issueClass) : null;
}

async function getIssueRecord(projectId: string, issueId: string) {
  const assignedUser = alias(user, "assigned_user");
  const reviewedUser = alias(user, "reviewed_user");
  const testedUser = alias(user, "tested_user");
  const createdUser = alias(user, "created_user");

  const [issue] = await db
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
    .where(and(eq(issues.projectId, projectId), eq(issues.id, issueId)))
    .limit(1);

  return issue ? toIssueListItem(issue) : null;
}

async function requireIssueInEditableProject(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  issueId: string
) {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const issue = await getIssueRecord(projectId, issueId);

  if (!issue) {
    throw new RouteError("Issue not found.", 404);
  }

  return issue;
}

async function assertUsersBelongToTeam(teamId: string, userIds: string[]) {
  const normalizedUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (normalizedUserIds.length === 0) {
    return;
  }

  const rows = await db
    .select({
      userId: usersToTeams.userId,
    })
    .from(usersToTeams)
    .where(
      and(eq(usersToTeams.teamId, teamId), inArray(usersToTeams.userId, normalizedUserIds))
    );

  if (rows.length !== normalizedUserIds.length) {
    throw new RouteError("Assignees, reviewers, and testers must belong to this team.");
  }
}

async function validateIssueFields(
  teamId: string,
  projectId: string,
  input: CreateIssueInput | UpdateIssueInput
) {
  await ensureDefaultIssueClassesForProject(projectId);

  const title = normalizeName(input.title, "Issue title", ISSUE_TITLE_MAX_LENGTH);
  const description = normalizeDescription(input.description);
  const navigation = normalizeOptionalText(
    input.navigation,
    "Navigation",
    ISSUE_NAVIGATION_MAX_LENGTH
  );
  const moduleId = normalizeOptionalId(input.moduleId);
  const issueClassId = normalizeOptionalId(input.issueClassId);
  const assignedTo = normalizeOptionalId(input.assignedTo);
  const reviewedBy = normalizeOptionalId(input.reviewedBy);
  const comments = normalizeOptionalText(input.comments, "Comments", ISSUE_TEXT_MAX_LENGTH);
  const remark = normalizeOptionalText(input.remark, "Remark", ISSUE_TEXT_MAX_LENGTH);
  const testedBy = normalizeOptionalId(input.testedBy);
  const fixedDate = normalizeOptionalDate(input.fixedDate);
  const development = normalizeOptionalBoolean(input.development);
  const deployment = normalizeOptionalBoolean(input.deployment);
  const priority = normalizeIssuePriority(input.priority);
  const status = normalizeIssueStatus(input.status);

  if (!issueClassId) {
    throw new RouteError("Choose an issue class.");
  }

  if (moduleId) {
    const [moduleRecord] = await db
      .select({ id: projectModules.id })
      .from(projectModules)
      .where(and(eq(projectModules.projectId, projectId), eq(projectModules.id, moduleId)))
      .limit(1);

    if (!moduleRecord) {
      throw new RouteError("Choose a valid project module.");
    }
  }

  const [issueClass] = await db
    .select({ id: issueClasses.id })
    .from(issueClasses)
    .where(and(eq(issueClasses.projectId, projectId), eq(issueClasses.id, issueClassId)))
    .limit(1);

  if (!issueClass) {
    throw new RouteError("Choose a valid issue class.");
  }

  await assertUsersBelongToTeam(
    teamId,
    [assignedTo, reviewedBy, testedBy].filter((value): value is string => Boolean(value))
  );

  return {
    navigation,
    title,
    description,
    moduleId,
    issueClassId,
    assignedTo,
    reviewedBy,
    comments,
    remark,
    testedBy,
    fixedDate,
    development,
    deployment,
    priority,
    status,
  };
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeImportedIssuePriority(value: string | null | undefined) {
  switch (normalizeLookupKey(value ?? "")) {
    case "low":
      return "low" satisfies IssuePriority;
    case "high":
      return "high" satisfies IssuePriority;
    case "critical":
      return "critical" satisfies IssuePriority;
    case "medium":
    default:
      return "medium" satisfies IssuePriority;
  }
}

function normalizeImportedIssueStatus(value: string | null | undefined) {
  switch (normalizeLookupKey(value ?? "")) {
    case "inprogress":
      return "in_progress" satisfies IssueStatus;
    case "review":
    case "inreview":
      return "review" satisfies IssueStatus;
    case "done":
    case "resolved":
    case "closed":
      return "done" satisfies IssueStatus;
    case "open":
    default:
      return "open" satisfies IssueStatus;
  }
}

function resolveTeamMemberId(
  value: string | null | undefined,
  members: TeamMemberListItem[]
): {
  state: "empty" | "matched" | "unresolved";
  userId: string | null;
  warning: string | null;
} {
  const rawValue = value?.trim() ?? "";

  if (!rawValue) {
    return {
      state: "empty",
      userId: null,
      warning: null,
    };
  }

  const normalizedValue = normalizeLookupValue(rawValue);
  const normalizedKey = normalizeLookupKey(rawValue);

  const exactMatches = members.filter((member) => {
    const nameValue = normalizeLookupValue(member.name);
    const emailValue = normalizeLookupValue(member.email);
    const nameKey = normalizeLookupKey(member.name);
    const emailKey = normalizeLookupKey(member.email);

    return (
      normalizedValue === nameValue ||
      normalizedValue === emailValue ||
      normalizedKey === nameKey ||
      normalizedKey === emailKey
    );
  });

  if (exactMatches.length === 1) {
    return {
      state: "matched",
      userId: exactMatches[0].userId,
      warning: null,
    };
  }

  const tokens = normalizedValue.split(/\s+/).filter(Boolean);
  const fuzzyMatches = members.filter((member) => {
    const candidate = normalizeLookupValue(`${member.name} ${member.email}`);

    return tokens.every((token) => candidate.includes(token));
  });

  if (fuzzyMatches.length === 1) {
    return {
      state: "matched",
      userId: fuzzyMatches[0].userId,
      warning: null,
    };
  }

  if (exactMatches.length > 1 || fuzzyMatches.length > 1) {
    return {
      state: "unresolved",
      userId: null,
      warning: `could not match "${rawValue}" to a single team member.`,
    };
  }

  return {
    state: "unresolved",
    userId: null,
    warning: `could not find a team member matching "${rawValue}".`,
  };
}

function parseImportedFixedDate(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue) {
    return {
      state: "empty" as const,
      value: null,
    };
  }

  const parsedValue = new Date(normalizedValue);

  if (Number.isNaN(parsedValue.getTime())) {
    return {
      state: "invalid" as const,
      value: null,
    };
  }

  return {
    state: "valid" as const,
    value: parsedValue,
  };
}

function parseImportedBoolean(value: boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  return false;
}

async function getDefaultIssueClassId(projectId: string) {
  await ensureDefaultIssueClassesForProject(projectId);

  const [defaultIssueClass] = await db
    .select({ id: issueClasses.id })
    .from(issueClasses)
    .where(and(eq(issueClasses.projectId, projectId), eq(issueClasses.name, "Bug")))
    .limit(1);

  if (defaultIssueClass) {
    return defaultIssueClass.id;
  }

  const [firstIssueClass] = await db
    .select({ id: issueClasses.id })
    .from(issueClasses)
    .where(eq(issueClasses.projectId, projectId))
    .limit(1);

  if (!firstIssueClass) {
    throw new RouteError("No issue class is available for this project.", 500);
  }

  return firstIssueClass.id;
}

export async function importIssuesFromExcel(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  importedRows: IssueExcelRow[]
): Promise<IssueExcelImportResponse> {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const [teamMembers, defaultIssueClassId] = await Promise.all([
    listTeamMembersForUser(actor.id, teamId),
    getDefaultIssueClassId(projectId),
  ]);

  if (!teamMembers) {
    throw new RouteError("Team members could not be loaded.", 404);
  }

  const issueNumbers = Array.from(
    new Set(
      importedRows
        .map((row) => row.no)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    )
  );

  const existingIssues =
    issueNumbers.length > 0
      ? await db
          .select({
            id: issues.id,
            no: issues.no,
          })
          .from(issues)
          .where(and(eq(issues.projectId, projectId), inArray(issues.no, issueNumbers)))
      : [];

  const issueIdByNo = new Map<number, string>();

  for (const existingIssue of existingIssues) {
    if (typeof existingIssue.no === "number") {
      issueIdByNo.set(existingIssue.no, existingIssue.id);
    }
  }

  const warnings: string[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const importedRow of importedRows) {
    const rowNumber = importedRow.rowNumber ?? skippedCount + createdCount + updatedCount + 2;

    let title: string;
    let navigation: string | null;
    let comments: string | null;
    let remark: string | null;

    try {
      title = normalizeName(importedRow.title ?? "", "Issue", ISSUE_TITLE_MAX_LENGTH);
      navigation = normalizeOptionalText(
        importedRow.navigation,
        "Navigation",
        ISSUE_NAVIGATION_MAX_LENGTH
      );
      comments = normalizeOptionalText(importedRow.comments, "Comments", ISSUE_TEXT_MAX_LENGTH);
      remark = normalizeOptionalText(importedRow.remark, "Remark", ISSUE_TEXT_MAX_LENGTH);
    } catch (error) {
      skippedCount += 1;
      warnings.push(
        `Row ${rowNumber}: ${
          error instanceof Error ? error.message : "Could not validate the issue."
        }`
      );
      continue;
    }

    const priority = normalizeImportedIssuePriority(importedRow.priority);
    const status = normalizeImportedIssueStatus(importedRow.status);
    const assigneeMatch = resolveTeamMemberId(importedRow.assignedToName, teamMembers.members);
    const testerMatch = resolveTeamMemberId(importedRow.testedByName, teamMembers.members);
    const fixedDate = parseImportedFixedDate(importedRow.fixedDate);
    const development = parseImportedBoolean(importedRow.development);
    const deployment = parseImportedBoolean(importedRow.deployment);

    if (assigneeMatch.warning) {
      warnings.push(`Row ${rowNumber}: Assigned to ${assigneeMatch.warning}`);
    }

    if (testerMatch.warning) {
      warnings.push(`Row ${rowNumber}: Tested By ${testerMatch.warning}`);
    }

    if (fixedDate.state === "invalid") {
      warnings.push(`Row ${rowNumber}: Fixed Date "${importedRow.fixedDate}" is invalid.`);
    }

    const issueId =
      typeof importedRow.no === "number" ? issueIdByNo.get(importedRow.no) ?? null : null;

    const importedValues: {
      navigation: string | null;
      title: string;
      priority: IssuePriority;
      status: IssueStatus;
      comments: string | null;
      remark: string | null;
      development: boolean;
      deployment: boolean;
      updatedAt: Date;
      assignedTo?: string | null;
      testedBy?: string | null;
      fixedDate?: Date | null;
    } = {
      navigation,
      title,
      priority,
      status,
      comments,
      remark,
      development,
      deployment,
      updatedAt: new Date(),
    };

    if (assigneeMatch.state === "empty") {
      importedValues.assignedTo = null;
    } else if (assigneeMatch.state === "matched") {
      importedValues.assignedTo = assigneeMatch.userId;
    }

    if (testerMatch.state === "empty") {
      importedValues.testedBy = null;
    } else if (testerMatch.state === "matched") {
      importedValues.testedBy = testerMatch.userId;
    }

    if (fixedDate.state === "empty" || fixedDate.state === "valid") {
      importedValues.fixedDate = fixedDate.value;
    }

    if (issueId) {
      await db
        .update(issues)
        .set(importedValues)
        .where(and(eq(issues.projectId, projectId), eq(issues.id, issueId)));

      updatedCount += 1;
      continue;
    }

    const [createdIssue] = await db
      .insert(issues)
      .values({
        projectId,
        issueClassId: defaultIssueClassId,
        createdBy: actor.id,
        assignedTo: assigneeMatch.state === "matched" ? assigneeMatch.userId : null,
        testedBy: testerMatch.state === "matched" ? testerMatch.userId : null,
        fixedDate: fixedDate.state === "valid" ? fixedDate.value : null,
        navigation,
        title,
        priority,
        status,
        comments,
        remark,
        development,
        deployment,
        ...(typeof importedRow.no === "number" ? { no: importedRow.no } : {}),
      })
      .returning({
        id: issues.id,
        no: issues.no,
      });

    if (typeof createdIssue.no === "number") {
      issueIdByNo.set(createdIssue.no, createdIssue.id);
    }

    createdCount += 1;
  }

  if (createdCount > 0) {
    await db.execute(
      sql`select setval(pg_get_serial_sequence('issues', 'no'), coalesce((select max(no) from issues), 1), true)`
    );
  }

  return {
    createdCount,
    updatedCount,
    skippedCount,
    warnings,
    message: `Imported ${createdCount + updatedCount} issues from Excel.`,
  };
}

export async function createProjectModule(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  input: CreateProjectModuleInput
) {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const name = normalizeName(input.name, "Module name", MODULE_NAME_MAX_LENGTH);
  const description = normalizeDescription(input.description);

  const [existingModule] = await db
    .select({ id: projectModules.id })
    .from(projectModules)
    .where(and(eq(projectModules.projectId, projectId), eq(projectModules.name, name)))
    .limit(1);

  if (existingModule) {
    throw new RouteError("A module with that name already exists in this project.");
  }

  const [createdModule] = await db
    .insert(projectModules)
    .values({
      projectId,
      name,
      description,
    })
    .returning({ id: projectModules.id });

  const projectModule = await getProjectModuleRecord(projectId, createdModule.id);

  if (!projectModule) {
    throw new RouteError("Module was created but could not be loaded.", 500);
  }

  return projectModule;
}

export async function createIssueClass(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  input: CreateIssueClassInput
) {
  await requireEditableProjectForUser(actor, teamId, projectId);
  await ensureDefaultIssueClassesForProject(projectId);

  const name = normalizeName(input.name, "Issue class name", ISSUE_CLASS_NAME_MAX_LENGTH);
  const description = normalizeDescription(input.description);

  const [existingIssueClass] = await db
    .select({ id: issueClasses.id })
    .from(issueClasses)
    .where(and(eq(issueClasses.projectId, projectId), eq(issueClasses.name, name)))
    .limit(1);

  if (existingIssueClass) {
    throw new RouteError("An issue class with that name already exists in this project.");
  }

  const [createdIssueClass] = await db
    .insert(issueClasses)
    .values({
      projectId,
      name,
      description,
      isSystem: false,
    })
    .returning({ id: issueClasses.id });

  const issueClass = await getIssueClassRecord(projectId, createdIssueClass.id);

  if (!issueClass) {
    throw new RouteError("Issue class was created but could not be loaded.", 500);
  }

  return issueClass;
}

export async function createIssue(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  input: CreateIssueInput
) {
  await requireEditableProjectForUser(actor, teamId, projectId);
  const validatedIssue = await validateIssueFields(teamId, projectId, input);

  const [createdIssue] = await db
    .insert(issues)
    .values({
      projectId,
      ...validatedIssue,
      createdBy: actor.id,
    })
    .returning({ id: issues.id });

  const issue = await getIssueRecord(projectId, createdIssue.id);

  if (!issue) {
    throw new RouteError("Issue was created but could not be loaded.", 500);
  }

  return issue;
}

export async function updateIssue(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  issueId: string,
  input: UpdateIssueInput
): Promise<UpdateIssueResult> {
  const existingIssue = await requireIssueInEditableProject(actor, teamId, projectId, issueId);
  const validatedIssue = await validateIssueFields(teamId, projectId, input);

  await db
    .update(issues)
    .set({
      ...validatedIssue,
      updatedAt: new Date(),
    })
    .where(and(eq(issues.projectId, projectId), eq(issues.id, issueId)));

  const issue = await getIssueRecord(projectId, issueId);

  if (!issue) {
    throw new RouteError("Issue was updated but could not be loaded.", 500);
  }

  return {
    issue,
    previousAssignedTo: existingIssue.assignedTo,
  };
}

export async function deleteIssue(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  issueId: string
) {
  const issue = await requireIssueInEditableProject(actor, teamId, projectId, issueId);

  await db
    .delete(issues)
    .where(and(eq(issues.projectId, projectId), eq(issues.id, issueId)));

  return issue;
}
