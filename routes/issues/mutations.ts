import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { issueClasses, issues, projectModules, user, usersToTeams } from "@/db/schema";
import { RouteError } from "@/routes/errors";
import { getProjectForTeam } from "@/routes/projects/queries";
import { getTeamForUser } from "@/routes/teams/queries";

import { ensureDefaultIssueClassesForProject } from "./queries";
import {
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  type CreateIssueClassInput,
  type CreateIssueInput,
  type CreateProjectModuleInput,
  type IssueClassListItem,
  type IssueListItem,
  type IssuePriority,
  type IssueStatus,
  type ProjectModuleListItem,
  type UpdateIssueInput,
} from "./types";

const MODULE_NAME_MAX_LENGTH = 80;
const ISSUE_CLASS_NAME_MAX_LENGTH = 50;
const ISSUE_TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 2000;

export interface IssueActor {
  id: string;
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

  if (value.length > DESCRIPTION_MAX_LENGTH) {
    throw new RouteError(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`);
  }

  return value;
}

function normalizeOptionalId(value?: string | null) {
  const normalizedValue = value?.trim() ?? "";

  return normalizedValue || null;
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
  testedBy: string | null;
  testedByName: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): IssueListItem {
  return {
    id: row.id,
    no: Number(row.no ?? 0),
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
    testedBy: row.testedBy,
    testedByName: row.testedByName,
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
      testedBy: issues.testedBy,
      testedByName: testedUser.name,
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
  const moduleId = normalizeOptionalId(input.moduleId);
  const issueClassId = normalizeOptionalId(input.issueClassId);
  const assignedTo = normalizeOptionalId(input.assignedTo);
  const reviewedBy = normalizeOptionalId(input.reviewedBy);
  const testedBy = normalizeOptionalId(input.testedBy);
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
    title,
    description,
    moduleId,
    issueClassId,
    assignedTo,
    reviewedBy,
    testedBy,
    priority,
    status,
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
) {
  await requireIssueInEditableProject(actor, teamId, projectId, issueId);
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

  return issue;
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
