import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { issueClasses, issues, projectModules, user, usersToTeams } from "@/db/schema";
import { RouteError } from "@/routes/errors";
import { getProjectForTeam } from "@/routes/projects/queries";
import { getTeamForUser, listTeamMembersForUser } from "@/routes/teams/queries";
import type { TeamMemberListItem } from "@/routes/teams/types";

import { ensureDefaultIssueClassesForProject } from "./queries";
import {
  GENERAL_MODULE_FILTER_VALUE,
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  MAIN_MODULE_ISSUES_SHEET_NAME,
  type CreateIssueClassInput,
  type CreateIssueInput,
  type CreateProjectModuleInput,
  type IssueClassListItem,
  type IssueExcelImportResponse,
  type IssueExcelSheet,
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
  previousStatus: IssueStatus;
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
  parentModuleId: string | null;
  parentModuleName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProjectModuleListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    parentModuleId: row.parentModuleId,
    parentModuleName: row.parentModuleName,
    isMainModule: row.parentModuleId === null,
    displayName: row.parentModuleName ? `${row.parentModuleName} / ${row.name}` : row.name,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function buildIssueScopeWhereClause(projectId: string, moduleId: string | null) {
  return moduleId
    ? and(eq(issues.projectId, projectId), eq(issues.moduleId, moduleId))
    : and(eq(issues.projectId, projectId), isNull(issues.moduleId));
}

function getIssueScopeKey(moduleId: string | null) {
  return moduleId ?? GENERAL_MODULE_FILTER_VALUE;
}

async function getNextIssueNo(projectId: string, moduleId: string | null) {
  const [row] = await db
    .select({
      maxNo: sql<number>`cast(coalesce(max(${issues.no}), 0) as integer)`,
    })
    .from(issues)
    .where(buildIssueScopeWhereClause(projectId, moduleId));

  return Number(row?.maxNo ?? 0) + 1;
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
  mainModuleId: string | null;
  mainModuleName: string | null;
  subModuleId: string | null;
  subModuleName: string | null;
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
  reopenedBy: string | null;
  reopenedByName: string | null;
  reopenedAt: Date | string | null;
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
    mainModuleId: row.mainModuleId,
    mainModuleName: row.mainModuleName,
    subModuleId: row.subModuleId,
    subModuleName: row.subModuleName,
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
    reopenedBy: row.reopenedBy,
    reopenedByName: row.reopenedByName,
    reopenedAt: row.reopenedAt ? toIsoString(row.reopenedAt) : null,
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
  const parentModule = alias(projectModules, "project_module_parent");
  const [module] = await db
    .select({
      id: projectModules.id,
      name: projectModules.name,
      description: projectModules.description,
      parentModuleId: projectModules.parentModuleId,
      parentModuleName: parentModule.name,
      createdAt: projectModules.createdAt,
      updatedAt: projectModules.updatedAt,
    })
    .from(projectModules)
    .leftJoin(parentModule, eq(projectModules.parentModuleId, parentModule.id))
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
  const reopenedUser = alias(user, "reopened_user");
  const createdUser = alias(user, "created_user");
  const parentModule = alias(projectModules, "parent_module");

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
      moduleName: sql<string | null>`case
        when ${parentModule.id} is not null then concat(${parentModule.name}, ' / ', ${projectModules.name})
        else ${projectModules.name}
      end`,
      mainModuleId: sql<string | null>`case
        when ${parentModule.id} is not null then ${parentModule.id}
        else ${projectModules.id}
      end`,
      mainModuleName: sql<string | null>`case
        when ${parentModule.id} is not null then ${parentModule.name}
        else ${projectModules.name}
      end`,
      subModuleId: sql<string | null>`case
        when ${parentModule.id} is not null then ${projectModules.id}
        else null
      end`,
      subModuleName: sql<string | null>`case
        when ${parentModule.id} is not null then ${projectModules.name}
        else null
      end`,
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
      reopenedBy: issues.reopenedBy,
      reopenedByName: reopenedUser.name,
      reopenedAt: issues.reopenedAt,
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
    .leftJoin(parentModule, eq(projectModules.parentModuleId, parentModule.id))
    .leftJoin(issueClasses, eq(issues.issueClassId, issueClasses.id))
    .leftJoin(assignedUser, eq(issues.assignedTo, assignedUser.id))
    .leftJoin(reviewedUser, eq(issues.reviewedBy, reviewedUser.id))
    .leftJoin(testedUser, eq(issues.testedBy, testedUser.id))
    .leftJoin(reopenedUser, eq(issues.reopenedBy, reopenedUser.id))
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
      and(
        eq(usersToTeams.teamId, teamId),
        eq(usersToTeams.membershipStatus, "active"),
        inArray(usersToTeams.userId, normalizedUserIds)
      )
    );

  if (rows.length !== normalizedUserIds.length) {
    throw new RouteError("Assignees, reviewers, and testers must belong to this team.");
  }
}

async function actorHasTeamRole(actor: IssueActor, teamId: string, role: "developer" | "tester") {
  const teamMembers = await listTeamMembersForUser(actor.id, teamId);
  const actorMembership = teamMembers?.members.find((member) => member.userId === actor.id);

  return actorMembership?.roles.includes(role) ?? false;
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

function normalizeImportedModuleName(value: string, label: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new RouteError(`${label} is required.`);
  }

  if (normalizedValue.length > MODULE_NAME_MAX_LENGTH) {
    throw new RouteError(`${label} must be ${MODULE_NAME_MAX_LENGTH} characters or fewer.`);
  }

  return normalizedValue;
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

async function requireMainModuleForProject(projectId: string, moduleId: string) {
  const [module] = await db
    .select({
      id: projectModules.id,
      name: projectModules.name,
      parentModuleId: projectModules.parentModuleId,
    })
    .from(projectModules)
    .where(and(eq(projectModules.projectId, projectId), eq(projectModules.id, moduleId)))
    .limit(1);

  if (!module || module.parentModuleId !== null) {
    throw new RouteError("Choose a valid main module for this import.");
  }

  return module;
}

function isMainModuleSheetName(value: string) {
  const normalizedValue = normalizeLookupKey(value);

  return (
    normalizedValue === normalizeLookupKey(MAIN_MODULE_ISSUES_SHEET_NAME) ||
    normalizedValue === "mainissues" ||
    normalizedValue === "moduleissues"
  );
}

export async function importIssuesFromExcel(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  mainModuleId: string,
  importedSheets: IssueExcelSheet[]
): Promise<IssueExcelImportResponse> {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const [teamMembers, defaultIssueClassId, mainModule, moduleRows] = await Promise.all([
    listTeamMembersForUser(actor.id, teamId),
    getDefaultIssueClassId(projectId),
    requireMainModuleForProject(projectId, mainModuleId),
    db
      .select({
        id: projectModules.id,
        name: projectModules.name,
        parentModuleId: projectModules.parentModuleId,
      })
      .from(projectModules)
      .where(eq(projectModules.projectId, projectId)),
  ]);

  if (!teamMembers) {
    throw new RouteError("Team members could not be loaded.", 404);
  }

  const actorIsTester =
    teamMembers.members.find((member) => member.userId === actor.id)?.roles.includes("tester") ??
    false;

  if (importedSheets.length === 0) {
    throw new RouteError("The uploaded Excel file does not contain any importable sheets.", 400);
  }

  const existingSubModulesByKey = new Map<string, { id: string; name: string }>();
  const nextIssueNoByScopeKey = new Map<string, number>();
  const processedScopedNumbers = new Set<string>();

  for (const moduleRow of moduleRows) {
    if (!moduleRow.parentModuleId) {
      continue;
    }

    const key = `${moduleRow.parentModuleId}:${normalizeLookupValue(moduleRow.name)}`;
    existingSubModulesByKey.set(key, {
      id: moduleRow.id,
      name: moduleRow.name,
    });
  }

  const warnings: string[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  async function allocateIssueNo(moduleId: string | null, preferredNo: number | null) {
    const scopeKey = getIssueScopeKey(moduleId);
    const cachedNextNo = nextIssueNoByScopeKey.get(scopeKey);

    if (typeof preferredNo === "number" && Number.isFinite(preferredNo) && preferredNo > 0) {
      const minimumNextNo = preferredNo + 1;

      if (typeof cachedNextNo !== "number" || cachedNextNo < minimumNextNo) {
        nextIssueNoByScopeKey.set(scopeKey, minimumNextNo);
      }

      return preferredNo;
    }

    const nextNo =
      typeof cachedNextNo === "number" ? cachedNextNo : await getNextIssueNo(projectId, moduleId);

    nextIssueNoByScopeKey.set(scopeKey, nextNo + 1);
    return nextNo;
  }

  for (const importedSheet of importedSheets) {
    const importsToMainModule = isMainModuleSheetName(importedSheet.sheetName);
    const sheetLabel = importsToMainModule
      ? MAIN_MODULE_ISSUES_SHEET_NAME
      : normalizeImportedModuleName(importedSheet.sheetName, "Sheet name");
    let targetModuleId = mainModule.id;

    if (!importsToMainModule) {
      const subModuleKey = `${mainModule.id}:${normalizeLookupValue(sheetLabel)}`;
      let subModule = existingSubModulesByKey.get(subModuleKey) ?? null;

      if (!subModule) {
        const [createdModule] = await db
          .insert(projectModules)
          .values({
            projectId,
            parentModuleId: mainModule.id,
            name: sheetLabel,
          })
          .returning({
            id: projectModules.id,
            name: projectModules.name,
          });

        subModule = createdModule;
        existingSubModulesByKey.set(subModuleKey, createdModule);
      }

      targetModuleId = subModule.id;
    }

    const issueNumbers = Array.from(
      new Set(
        importedSheet.rows
          .map((row) => row.no)
          .filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value) && value > 0
          )
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
            .where(
              and(
                buildIssueScopeWhereClause(projectId, targetModuleId),
                inArray(issues.no, issueNumbers)
              )
            )
        : [];
    const issueIdByNo = new Map<number, string>();

    for (const existingIssue of existingIssues) {
      if (typeof existingIssue.no === "number") {
        issueIdByNo.set(existingIssue.no, existingIssue.id);
      }
    }

    for (const importedRow of importedSheet.rows) {
      const rowNumber = importedRow.rowNumber ?? skippedCount + createdCount + updatedCount + 2;
      const rowLabel = `Sheet "${sheetLabel}" row ${rowNumber}`;

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
          `${rowLabel}: ${
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
        warnings.push(`${rowLabel}: Assigned to ${assigneeMatch.warning}`);
      }

      if (testerMatch.warning) {
        warnings.push(`${rowLabel}: Tested By ${testerMatch.warning}`);
      }

      if (fixedDate.state === "invalid") {
        warnings.push(`${rowLabel}: Fixed Date "${importedRow.fixedDate}" is invalid.`);
      }

      const importedNo =
        typeof importedRow.no === "number" && Number.isFinite(importedRow.no) && importedRow.no > 0
          ? importedRow.no
          : null;
      const scopedNumberKey =
        importedNo === null ? null : `${getIssueScopeKey(targetModuleId)}:${importedNo}`;

      if (scopedNumberKey && processedScopedNumbers.has(scopedNumberKey)) {
        skippedCount += 1;
        warnings.push(`${rowLabel}: Issue number ${importedNo} is duplicated in this import.`);
        continue;
      }

      if (scopedNumberKey) {
        processedScopedNumbers.add(scopedNumberKey);
      }

      const issueId = importedNo === null ? null : issueIdByNo.get(importedNo) ?? null;
      const resolvedIssueNo = await allocateIssueNo(targetModuleId, importedNo);

      const importedValues: {
        moduleId: string;
        no: number;
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
        moduleId: targetModuleId,
        no: resolvedIssueNo,
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
          moduleId: targetModuleId,
          issueClassId: defaultIssueClassId,
          createdBy: actor.id,
          assignedTo: assigneeMatch.state === "matched" ? assigneeMatch.userId : null,
          testedBy:
            testerMatch.state === "matched" ? testerMatch.userId : actorIsTester ? actor.id : null,
          fixedDate: fixedDate.state === "valid" ? fixedDate.value : null,
          navigation,
          title,
          priority,
          status,
          comments,
          remark,
          development,
          deployment,
          no: resolvedIssueNo,
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
  const parentModuleId = normalizeOptionalId(input.parentModuleId);

  if (parentModuleId) {
    const [parentModule] = await db
      .select({
        id: projectModules.id,
        parentModuleId: projectModules.parentModuleId,
      })
      .from(projectModules)
      .where(and(eq(projectModules.projectId, projectId), eq(projectModules.id, parentModuleId)))
      .limit(1);

    if (!parentModule || parentModule.parentModuleId !== null) {
      throw new RouteError("Choose a valid main module.");
    }
  }

  const [existingModule] = await db
    .select({ id: projectModules.id })
    .from(projectModules)
    .where(
      and(
        eq(projectModules.projectId, projectId),
        eq(projectModules.name, name),
        parentModuleId
          ? eq(projectModules.parentModuleId, parentModuleId)
          : sql`${projectModules.parentModuleId} is null`
      )
    )
    .limit(1);

  if (existingModule) {
    throw new RouteError("A module with that name already exists at this level.");
  }

  const [createdModule] = await db
    .insert(projectModules)
    .values({
      projectId,
      parentModuleId,
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
  const actorIsTester = await actorHasTeamRole(actor, teamId, "tester");
  const validatedIssue = await validateIssueFields(teamId, projectId, {
    ...input,
    testedBy: input.testedBy || (actorIsTester ? actor.id : null),
  });
  const nextIssueNo = await getNextIssueNo(projectId, validatedIssue.moduleId);

  const [createdIssue] = await db
    .insert(issues)
    .values({
      projectId,
      ...validatedIssue,
      no: nextIssueNo,
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
  const nextIssueNo =
    existingIssue.moduleId === validatedIssue.moduleId
      ? existingIssue.no
      : await getNextIssueNo(projectId, validatedIssue.moduleId);
  const isTesterReopen =
    existingIssue.status === "done" &&
    validatedIssue.status !== "done" &&
    (await actorHasTeamRole(actor, teamId, "tester"));

  await db
    .update(issues)
    .set({
      ...validatedIssue,
      no: nextIssueNo,
      ...(isTesterReopen
        ? {
            reopenedBy: actor.id,
            reopenedAt: new Date(),
          }
        : {}),
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
    previousStatus: existingIssue.status,
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
