import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  issueActivity,
  issueComments,
  issues,
  projectComponents,
  projectEpics,
  projectModules,
  projectReleases,
  projects,
  sprints,
  teamMemberRoles,
  user,
  usersToTeams,
} from "@/db/schema";
import { RouteError } from "@/routes/errors";
import { getProjectForTeam } from "@/routes/projects/queries";
import { getTeamForUser } from "@/routes/teams/queries";

import {
  deleteIssueMediaObjectsForIssue,
  updateIssueMediaRecords,
  validateIssueMediaMutationInput,
} from "./media";
import {
  getProjectIssueForUser,
  toProjectEpicListItem,
  toProjectModuleListItem,
  toProjectReleaseListItem,
} from "./queries";
import {
  DEPLOYMENT_STATUS_OPTIONS,
  DEVELOPMENT_STATUS_OPTIONS,
  EPIC_STATUS_OPTIONS,
  ISSUE_ASSIGNMENT_GROUP_OPTIONS,
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  MAIN_MODULE_ISSUES_SHEET_NAME,
  RELEASE_STATUS_OPTIONS,
  SPRINT_STATUS_OPTIONS,
  type CreateIssueClassInput,
  type CreateIssueInput,
  type CreateProjectComponentInput,
  type CreateProjectEpicInput,
  type CreateProjectModuleInput,
  type CreateProjectReleaseInput,
  type CreateProjectSprintInput,
  type DeploymentStatus,
  type DevelopmentStatus,
  type EpicStatus,
  type IssueExcelImportResponse,
  type IssueAssignmentGroup,
  type IssueExcelRow,
  type IssueExcelSheet,
  type IssueListItem,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
  type ProjectReleaseStatus,
  type UpdateIssueInput,
} from "./types";

const NAME_MAX_LENGTH = 80;
const ISSUE_TITLE_MAX_LENGTH = 255;
const ISSUE_TEXT_MAX_LENGTH = 4000;

export interface IssueActor {
  id: string;
}

export interface UpdateIssueResult {
  issue: IssueListItem;
  previousAssignedTo: string | null;
  previousTesterAssignedTo: string | null;
  previousAssigneeGroup: IssueAssignmentGroup | null;
  previousTesterAssigneeGroup: IssueAssignmentGroup | null;
  previousStatus: IssueStatus;
  previousDeploymentStatus: DeploymentStatus;
  reopened: boolean;
}

interface ValidatedIssueFields {
  title: string;
  description: string | null;
  issueType: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeGroup: IssueAssignmentGroup | null;
  testerAssigneeGroup: IssueAssignmentGroup | null;
  moduleId: string | null;
  componentId: string | null;
  epicId: string | null;
  sprintId: string | null;
  releaseId: string | null;
  assigneeId: string | null;
  testerAssigneeId: string | null;
  reporterId: string | null;
  testedById: string | null;
  parentIssueId: string | null;
  remark: string | null;
  fixedDate: Date | null;
  developmentStatus: DevelopmentStatus;
  deploymentStatus: DeploymentStatus;
}

function normalizeName(
  value: string,
  label: string,
  maxLength = NAME_MAX_LENGTH,
) {
  const normalizedValue = value.trim();

  if (normalizedValue.length < 2) {
    throw new RouteError(`${label} must be at least 2 characters long.`);
  }

  if (normalizedValue.length > maxLength) {
    throw new RouteError(`${label} must be ${maxLength} characters or fewer.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(
  value: string | null | undefined,
  label = "Description",
) {
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > ISSUE_TEXT_MAX_LENGTH) {
    throw new RouteError(
      `${label} must be ${ISSUE_TEXT_MAX_LENGTH} characters or fewer.`,
    );
  }

  return normalizedValue;
}

function stripBulletPrefix(value: string) {
  return value.replace(/^([-*]|\d+[.)])\s+/, "").trim();
}

function normalizeTextItems(value: string | null | undefined, label: string) {
  const normalizedText = normalizeOptionalText(value, label);

  if (!normalizedText) {
    return [];
  }

  return normalizedText
    .split(/\r?\n+/)
    .map(stripBulletPrefix)
    .filter(Boolean);
}

function getNewCommentItems(
  inputComments: string | null | undefined,
  existingComments: string | null,
) {
  const normalizedComments = normalizeOptionalText(inputComments, "Comments");
  const normalizedExistingComments = normalizeOptionalText(
    existingComments,
    "Comments",
  );

  if (!normalizedComments) {
    return [];
  }

  if (!normalizedExistingComments) {
    return normalizeTextItems(normalizedComments, "Comments");
  }

  if (normalizedComments === normalizedExistingComments) {
    return [];
  }

  if (normalizedComments.startsWith(normalizedExistingComments)) {
    return normalizeTextItems(
      normalizedComments.slice(normalizedExistingComments.length),
      "Comments",
    );
  }

  const existingItems = new Set(
    normalizeTextItems(normalizedExistingComments, "Comments"),
  );
  return normalizeTextItems(normalizedComments, "Comments").filter(
    (item) => !existingItems.has(item),
  );
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
    throw new RouteError("Choose a valid date.");
  }

  return parsedValue;
}

function assertOption<T extends string>(
  value: string,
  options: readonly { value: T; label: string }[],
  message: string,
): T {
  if (options.some((option) => option.value === value)) {
    return value as T;
  }

  throw new RouteError(message);
}

function normalizeIssueType(input: CreateIssueInput | UpdateIssueInput) {
  const value =
    input.issueType ??
    input.type ??
    (input.issueClassId as IssueType | undefined) ??
    "bug";
  return assertOption(value, ISSUE_TYPE_OPTIONS, "Choose a valid issue type.");
}

function normalizeIssuePriority(value: string) {
  return assertOption(
    value,
    ISSUE_PRIORITY_OPTIONS,
    "Choose a valid issue priority.",
  );
}

function normalizeIssueStatus(value: string) {
  return assertOption(
    value,
    ISSUE_STATUS_OPTIONS,
    "Choose a valid issue status.",
  );
}

function normalizeDevelopmentStatus(
  value?: string | null,
  status?: IssueStatus,
): DevelopmentStatus {
  if (value === "done") {
    return "fixed";
  }

  if (value) {
    return assertOption(
      value,
      DEVELOPMENT_STATUS_OPTIONS,
      "Choose a valid development status.",
    );
  }

  return status === "fixed" ? "fixed" : "not_started";
}

function normalizeDeploymentStatus(
  value?: string | null,
  deployed?: boolean,
): DeploymentStatus {
  if (value) {
    return assertOption(
      value,
      DEPLOYMENT_STATUS_OPTIONS,
      "Choose a valid deployment status.",
    );
  }

  return deployed ? "deployed" : "not_deployed";
}

function normalizeIssueAssignmentGroup(
  value?: string | null,
): IssueAssignmentGroup | null {
  const normalizedValue = normalizeOptionalId(value);

  if (!normalizedValue) {
    return null;
  }

  return assertOption(
    normalizedValue,
    ISSUE_ASSIGNMENT_GROUP_OPTIONS,
    "Choose a valid assignment team.",
  );
}

function isFixedWorkflowState(
  status: IssueStatus,
  developmentStatus: DevelopmentStatus,
) {
  return status === "fixed" || developmentStatus === "fixed";
}

function getAutomaticFixedDate(
  fields: Pick<
    ValidatedIssueFields,
    "status" | "developmentStatus" | "fixedDate"
  >,
  previousFixedDate?: string | Date | null,
) {
  if (!isFixedWorkflowState(fields.status, fields.developmentStatus)) {
    return null;
  }

  if (fields.fixedDate) {
    return fields.fixedDate;
  }

  return previousFixedDate ? new Date(previousFixedDate) : new Date();
}

function normalizeEpicStatus(value?: string | null) {
  return assertOption(
    value ?? "open",
    EPIC_STATUS_OPTIONS,
    "Choose a valid epic status.",
  );
}

function normalizeReleaseStatus(value?: string | null) {
  return assertOption(
    value ?? "planned",
    RELEASE_STATUS_OPTIONS,
    "Choose a valid release status.",
  );
}

function normalizeSprintStatus(value?: string | null) {
  return assertOption(
    value ?? "planned",
    SPRINT_STATUS_OPTIONS,
    "Choose a valid sprint status.",
  );
}

async function requireEditableProjectForUser(
  actor: IssueActor,
  teamId: string,
  projectId: string,
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

async function assertUsersBelongToTeam(teamId: string, userIds: string[]) {
  const normalizedUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (normalizedUserIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ userId: usersToTeams.userId })
    .from(usersToTeams)
    .where(
      and(
        eq(usersToTeams.teamId, teamId),
        eq(usersToTeams.membershipStatus, "active"),
        inArray(usersToTeams.userId, normalizedUserIds),
      ),
    );

  if (rows.length !== normalizedUserIds.length) {
    throw new RouteError(
      "Assignee, reporter, and tester must belong to this team.",
    );
  }
}

async function assertUserHasTeamRole(
  teamId: string,
  userId: string | null,
  role: "developer" | "tester",
  label: string,
) {
  if (!userId) {
    return;
  }

  const [roleRow] = await db
    .select({ userId: teamMemberRoles.userId })
    .from(teamMemberRoles)
    .where(
      and(
        eq(teamMemberRoles.teamId, teamId),
        eq(teamMemberRoles.userId, userId),
        eq(teamMemberRoles.role, role),
      ),
    )
    .limit(1);

  if (!roleRow) {
    throw new RouteError(`${label} must be assigned to a ${role} team member.`);
  }
}

async function assertModuleBelongsToProject(
  projectId: string,
  moduleId: string | null,
) {
  if (!moduleId) {
    return null;
  }

  const [record] = await db
    .select({ id: projectModules.id, name: projectModules.name })
    .from(projectModules)
    .where(
      and(
        eq(projectModules.projectId, projectId),
        eq(projectModules.id, moduleId),
      ),
    )
    .limit(1);

  if (!record) {
    throw new RouteError("Choose a valid module.");
  }

  return record;
}

async function assertComponentBelongsToProject(
  projectId: string,
  componentId: string | null,
) {
  if (!componentId) {
    return null;
  }

  const [record] = await db
    .select({
      id: projectComponents.id,
      moduleId: projectComponents.moduleId,
      name: projectComponents.name,
    })
    .from(projectComponents)
    .where(
      and(
        eq(projectComponents.projectId, projectId),
        eq(projectComponents.id, componentId),
      ),
    )
    .limit(1);

  if (!record) {
    throw new RouteError("Choose a valid component.");
  }

  return record;
}

async function assertEpicBelongsToProject(
  projectId: string,
  epicId: string | null,
) {
  if (!epicId) {
    return;
  }

  const [record] = await db
    .select({ id: projectEpics.id })
    .from(projectEpics)
    .where(
      and(eq(projectEpics.projectId, projectId), eq(projectEpics.id, epicId)),
    )
    .limit(1);

  if (!record) {
    throw new RouteError("Choose a valid epic.");
  }
}

async function assertReleaseBelongsToProject(
  projectId: string,
  releaseId: string | null,
) {
  if (!releaseId) {
    return;
  }

  const [record] = await db
    .select({ id: projectReleases.id })
    .from(projectReleases)
    .where(
      and(
        eq(projectReleases.projectId, projectId),
        eq(projectReleases.id, releaseId),
      ),
    )
    .limit(1);

  if (!record) {
    throw new RouteError("Choose a valid release.");
  }
}

async function assertSprintBelongsToProject(
  projectId: string,
  sprintId: string | null,
) {
  if (!sprintId) {
    return;
  }

  const [record] = await db
    .select({ id: sprints.id })
    .from(sprints)
    .where(and(eq(sprints.projectId, projectId), eq(sprints.id, sprintId)))
    .limit(1);

  if (!record) {
    throw new RouteError("Choose a valid sprint.");
  }
}

async function assertIssueBelongsToProject(
  projectId: string,
  issueId: string | null,
  label: string,
) {
  if (!issueId) {
    return;
  }

  const [issue] = await db
    .select({ id: issues.id })
    .from(issues)
    .where(and(eq(issues.projectId, projectId), eq(issues.id, issueId)))
    .limit(1);

  if (!issue) {
    throw new RouteError(`Choose a valid ${label}.`);
  }
}

async function validateIssueFields(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  input: CreateIssueInput | UpdateIssueInput,
): Promise<ValidatedIssueFields> {
  const issueType = normalizeIssueType(input);
  const title = normalizeName(
    input.title,
    "Issue title",
    ISSUE_TITLE_MAX_LENGTH,
  );
  const description = normalizeOptionalText(input.description);
  const status = normalizeIssueStatus(input.status);
  const priority = normalizeIssuePriority(input.priority);
  const assigneeGroup = normalizeIssueAssignmentGroup(
    input.assigneeGroup ?? input.assignmentGroup,
  );
  const assigneeId = normalizeOptionalId(input.assigneeId ?? input.assignedTo);
  const testerAssigneeGroup = normalizeIssueAssignmentGroup(
    input.testerAssigneeGroup ?? input.testerAssignmentGroup,
  );
  const testerAssigneeId = normalizeOptionalId(
    input.testerAssigneeId ?? input.testerAssignedTo,
  );
  const reporterId = normalizeOptionalId(input.reporterId) ?? actor.id;
  const testedById = normalizeOptionalId(input.testedById ?? input.testedBy);
  const componentId = normalizeOptionalId(input.componentId);
  const requestedModuleId = normalizeOptionalId(input.moduleId);
  const component = await assertComponentBelongsToProject(
    projectId,
    componentId,
  );
  const moduleId = component?.moduleId ?? requestedModuleId;
  const epicId = normalizeOptionalId(input.epicId);
  const sprintId = normalizeOptionalId(input.sprintId);
  const releaseId = normalizeOptionalId(input.releaseId);
  const parentIssueId = normalizeOptionalId(input.parentIssueId);
  const remark = normalizeOptionalText(input.remark);
  const fixedDate = normalizeOptionalDate(input.fixedDate);
  const developmentStatus = normalizeDevelopmentStatus(
    input.developmentStatus,
    input.development ? "fixed" : status,
  );
  const deploymentStatus = normalizeDeploymentStatus(
    input.deploymentStatus,
    input.deployment,
  );

  if (
    component &&
    requestedModuleId &&
    component.moduleId !== requestedModuleId
  ) {
    throw new RouteError("Component must belong to the selected module.");
  }

  if (issueType === "subtask" && !parentIssueId) {
    throw new RouteError("Choose a parent issue for a subtask.");
  }

  await Promise.all([
    assertUsersBelongToTeam(teamId, [
      assigneeId ?? "",
      testerAssigneeId ?? "",
      reporterId,
      testedById ?? "",
    ]),
    assigneeGroup === "development"
      ? assertUserHasTeamRole(teamId, assigneeId, "developer", "Developer")
      : Promise.resolve(),
    testerAssigneeGroup === "testing"
      ? assertUserHasTeamRole(teamId, testerAssigneeId, "tester", "Tester")
      : Promise.resolve(),
    assertModuleBelongsToProject(projectId, moduleId),
    assertEpicBelongsToProject(projectId, epicId),
    assertReleaseBelongsToProject(projectId, releaseId),
    assertSprintBelongsToProject(projectId, sprintId),
    assertIssueBelongsToProject(projectId, parentIssueId, "parent issue"),
  ]);

  return {
    title,
    description,
    issueType,
    status,
    priority,
    assigneeGroup,
    testerAssigneeGroup,
    moduleId,
    componentId,
    epicId,
    sprintId,
    releaseId,
    assigneeId,
    testerAssigneeId,
    reporterId,
    testedById,
    parentIssueId,
    remark,
    fixedDate,
    developmentStatus,
    deploymentStatus,
  };
}

export async function createProjectModule(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  input: CreateProjectModuleInput,
) {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const name = normalizeName(input.name, "Module name");
  const description = normalizeOptionalText(input.description);
  const sortOrder = Number.isFinite(input.sortOrder)
    ? Number(input.sortOrder)
    : 0;

  const [createdModule] = await db
    .insert(projectModules)
    .values({
      projectId,
      name,
      description,
      sortOrder,
    })
    .returning({
      id: projectModules.id,
      name: projectModules.name,
      description: projectModules.description,
      sortOrder: projectModules.sortOrder,
      createdAt: projectModules.createdAt,
      updatedAt: projectModules.updatedAt,
    });

  return toProjectModuleListItem(createdModule);
}

export async function createProjectComponent(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  input: CreateProjectComponentInput,
) {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const moduleId = normalizeOptionalId(input.moduleId);
  const parentModule = await assertModuleBelongsToProject(projectId, moduleId);

  if (!moduleId || !parentModule) {
    throw new RouteError("Choose a parent module for this component.");
  }

  const name = normalizeName(input.name, "Component name");
  const description = normalizeOptionalText(input.description);
  const leadId = normalizeOptionalId(input.leadId);
  const sortOrder = Number.isFinite(input.sortOrder)
    ? Number(input.sortOrder)
    : 0;

  await assertUsersBelongToTeam(teamId, leadId ? [leadId] : []);

  const [createdComponent] = await db
    .insert(projectComponents)
    .values({
      projectId,
      moduleId,
      name,
      description,
      leadId,
      sortOrder,
    })
    .returning({
      id: projectComponents.id,
      projectId: projectComponents.projectId,
      moduleId: projectComponents.moduleId,
      name: projectComponents.name,
      description: projectComponents.description,
      leadId: projectComponents.leadId,
      sortOrder: projectComponents.sortOrder,
      createdAt: projectComponents.createdAt,
      updatedAt: projectComponents.updatedAt,
    });

  return {
    ...createdComponent,
    moduleName: parentModule.name,
    leadName: null,
    createdAt: createdComponent.createdAt.toISOString(),
    updatedAt: createdComponent.updatedAt.toISOString(),
  };
}

export async function createProjectEpic(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  input: CreateProjectEpicInput,
) {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const title = normalizeName(
    input.title,
    "Epic title",
    ISSUE_TITLE_MAX_LENGTH,
  );
  const description = normalizeOptionalText(input.description);
  const status = normalizeEpicStatus(input.status);
  const startDate = normalizeOptionalDate(input.startDate);
  const targetDate = normalizeOptionalDate(input.targetDate);

  const [createdEpic] = await db
    .insert(projectEpics)
    .values({
      projectId,
      title,
      description,
      status,
      startDate,
      targetDate,
    })
    .returning({
      id: projectEpics.id,
      title: projectEpics.title,
      description: projectEpics.description,
      status: projectEpics.status,
      startDate: projectEpics.startDate,
      targetDate: projectEpics.targetDate,
      createdAt: projectEpics.createdAt,
      updatedAt: projectEpics.updatedAt,
    });

  return {
    id: createdEpic.id,
    title: createdEpic.title,
    name: createdEpic.title,
    description: createdEpic.description,
    status: normalizeEpicStatus(createdEpic.status),
    startDate: createdEpic.startDate?.toISOString() ?? null,
    targetDate: createdEpic.targetDate?.toISOString() ?? null,
    createdAt: createdEpic.createdAt.toISOString(),
    updatedAt: createdEpic.updatedAt.toISOString(),
  };
}

export async function createProjectRelease(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  input: CreateProjectReleaseInput,
) {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const name = normalizeName(input.name, "Release name");
  const description = normalizeOptionalText(input.description);
  const status = normalizeReleaseStatus(input.status);
  const startDate = normalizeOptionalDate(input.startDate);
  const targetDate = normalizeOptionalDate(input.targetDate);
  const releasedAt = normalizeOptionalDate(input.releasedAt);

  const [createdRelease] = await db
    .insert(projectReleases)
    .values({
      projectId,
      name,
      description,
      status,
      startDate,
      targetDate,
      releasedAt,
    })
    .returning({
      id: projectReleases.id,
      name: projectReleases.name,
      description: projectReleases.description,
      status: projectReleases.status,
      startDate: projectReleases.startDate,
      targetDate: projectReleases.targetDate,
      releasedAt: projectReleases.releasedAt,
      createdAt: projectReleases.createdAt,
      updatedAt: projectReleases.updatedAt,
    });

  return {
    ...createdRelease,
    status: normalizeReleaseStatus(createdRelease.status),
    startDate: createdRelease.startDate?.toISOString() ?? null,
    targetDate: createdRelease.targetDate?.toISOString() ?? null,
    releasedAt: createdRelease.releasedAt?.toISOString() ?? null,
    createdAt: createdRelease.createdAt.toISOString(),
    updatedAt: createdRelease.updatedAt.toISOString(),
  };
}

export async function updateProjectEpicStatus(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  epicId: string,
  input: { status?: EpicStatus | null },
) {
  await requireEditableProjectForUser(actor, teamId, projectId);

  if (!input.status) {
    throw new RouteError("Choose a valid epic status.");
  }

  const status = normalizeEpicStatus(input.status);
  const [updatedEpic] = await db
    .update(projectEpics)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(
      and(eq(projectEpics.projectId, projectId), eq(projectEpics.id, epicId)),
    )
    .returning({
      id: projectEpics.id,
      title: projectEpics.title,
      description: projectEpics.description,
      status: projectEpics.status,
      startDate: projectEpics.startDate,
      targetDate: projectEpics.targetDate,
      createdAt: projectEpics.createdAt,
      updatedAt: projectEpics.updatedAt,
    });

  if (!updatedEpic) {
    throw new RouteError("Epic not found.", 404);
  }

  return toProjectEpicListItem(updatedEpic);
}

export async function updateProjectReleaseStatus(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  releaseId: string,
  input: { status?: ProjectReleaseStatus | null },
) {
  await requireEditableProjectForUser(actor, teamId, projectId);

  if (!input.status) {
    throw new RouteError("Choose a valid release status.");
  }

  const status = normalizeReleaseStatus(input.status);
  const [updatedRelease] = await db
    .update(projectReleases)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectReleases.projectId, projectId),
        eq(projectReleases.id, releaseId),
      ),
    )
    .returning({
      id: projectReleases.id,
      name: projectReleases.name,
      description: projectReleases.description,
      status: projectReleases.status,
      startDate: projectReleases.startDate,
      targetDate: projectReleases.targetDate,
      releasedAt: projectReleases.releasedAt,
      createdAt: projectReleases.createdAt,
      updatedAt: projectReleases.updatedAt,
    });

  if (!updatedRelease) {
    throw new RouteError("Release not found.", 404);
  }

  return toProjectReleaseListItem(updatedRelease);
}

export async function createProjectSprint(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  input: CreateProjectSprintInput,
) {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const name = normalizeName(input.name, "Sprint name");
  const goal = normalizeOptionalText(input.goal, "Goal");
  const status = normalizeSprintStatus(input.status);
  const startDate = normalizeOptionalDate(input.startDate);
  const endDate = normalizeOptionalDate(input.endDate);

  const [createdSprint] = await db
    .insert(sprints)
    .values({
      projectId,
      name,
      goal,
      status,
      startDate,
      endDate,
    })
    .returning({
      id: sprints.id,
      name: sprints.name,
      goal: sprints.goal,
      status: sprints.status,
      startDate: sprints.startDate,
      endDate: sprints.endDate,
      createdAt: sprints.createdAt,
      updatedAt: sprints.updatedAt,
    });

  return {
    ...createdSprint,
    status: normalizeSprintStatus(createdSprint.status),
    startDate: createdSprint.startDate?.toISOString() ?? null,
    endDate: createdSprint.endDate?.toISOString() ?? null,
    createdAt: createdSprint.createdAt.toISOString(),
    updatedAt: createdSprint.updatedAt.toISOString(),
  };
}

export async function createIssueClass(
  _actor: IssueActor,
  _teamId: string,
  _projectId: string,
  input: CreateIssueClassInput,
) {
  const normalizedName = input.name.trim().toLowerCase();
  const match = ISSUE_TYPE_OPTIONS.find(
    (option) =>
      option.value === normalizedName ||
      option.label.toLowerCase() === normalizedName,
  );

  if (!match) {
    throw new RouteError(
      "Issue types are fixed to Bug, Task, Improvement, and Subtask.",
    );
  }

  const now = new Date(0).toISOString();

  return {
    id: match.value,
    name: match.label,
    description: input.description ?? null,
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function allocateIssueKey(projectId: string) {
  const [projectCounter] = await db
    .update(projects)
    .set({
      nextIssueNumber: sql`${projects.nextIssueNumber} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning({
      keyPrefix: projects.keyPrefix,
      nextIssueNumber: projects.nextIssueNumber,
    });

  if (!projectCounter) {
    throw new RouteError("Project not found.", 404);
  }

  const sequence = Number(projectCounter.nextIssueNumber) - 1;

  return {
    sequence,
    key: `${projectCounter.keyPrefix}-${sequence}`,
  };
}

async function loadIssueForActor(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  issueId: string,
) {
  const issue = await getProjectIssueForUser(
    actor.id,
    teamId,
    projectId,
    issueId,
  );

  if (!issue) {
    throw new RouteError("Issue not found.", 404);
  }

  return issue;
}

export async function createIssue(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  input: CreateIssueInput,
) {
  await requireEditableProjectForUser(actor, teamId, projectId);
  const validatedIssue = await validateIssueFields(
    actor,
    teamId,
    projectId,
    input,
  );
  const hasMediaUploads = Boolean(input.media?.length);
  const initialComments = normalizeTextItems(input.comments, "Comments");
  const fixedDate = getAutomaticFixedDate(validatedIssue);

  if (hasMediaUploads) {
    validateIssueMediaMutationInput(teamId, projectId, input.media);
  }

  const createdIssueId = await db.transaction(async () => {
    const keyFields = await allocateIssueKey(projectId);
    const [createdIssue] = await db
      .insert(issues)
      .values({
        projectId,
        ...keyFields,
        ...validatedIssue,
        fixedDate,
      })
      .returning({ id: issues.id });

    await db.insert(issueActivity).values({
      projectId,
      issueId: createdIssue.id,
      actorId: actor.id,
      action: "created",
      toValue: keyFields.key,
    });

    if (initialComments.length > 0) {
      await db.insert(issueComments).values(
        initialComments.map((body) => ({
          projectId,
          issueId: createdIssue.id,
          authorId: actor.id,
          body,
        })),
      );
    }

    return createdIssue.id;
  });

  if (hasMediaUploads) {
    await updateIssueMediaRecords({
      actor,
      teamId,
      projectId,
      issueId: createdIssueId,
      uploadedMedia: input.media,
    });
  }

  return loadIssueForActor(actor, teamId, projectId, createdIssueId);
}

export async function updateIssue(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  issueId: string,
  input: UpdateIssueInput,
): Promise<UpdateIssueResult> {
  await requireEditableProjectForUser(actor, teamId, projectId);
  const existingIssue = await loadIssueForActor(
    actor,
    teamId,
    projectId,
    issueId,
  );
  const validatedIssue = await validateIssueFields(
    actor,
    teamId,
    projectId,
    input,
  );
  const isReopenRequest = Boolean(input.reopen);
  const mediaChanged = Boolean(
    input.mediaChanged || input.media?.length || input.removeMediaIds?.length,
  );
  const commentsToAppend = getNewCommentItems(
    input.comments,
    existingIssue.comments,
  );

  if (
    isReopenRequest &&
    existingIssue.status !== "review" &&
    existingIssue.status !== "fixed"
  ) {
    throw new RouteError(
      "Only issues in review or fixed status can be reopened.",
    );
  }

  const issueFields: ValidatedIssueFields = isReopenRequest
    ? {
        ...validatedIssue,
        status: validatedIssue.status === "todo" ? "todo" : "in_progress",
        developmentStatus:
          validatedIssue.status === "todo" ? "not_started" : "in_progress",
        deploymentStatus: "not_deployed",
      }
    : validatedIssue;
  const fixedDate = isReopenRequest
    ? null
    : getAutomaticFixedDate(issueFields, existingIssue.fixedDate);

  if (mediaChanged) {
    validateIssueMediaMutationInput(
      teamId,
      projectId,
      input.media,
      input.removeMediaIds,
    );
  }

  await db
    .update(issues)
    .set({
      ...issueFields,
      fixedDate,
      ...(isReopenRequest
        ? {
            reopenedById: actor.id,
            reopenedAt: new Date(),
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(eq(issues.projectId, projectId), eq(issues.id, existingIssue.id)),
    );

  if (existingIssue.status !== issueFields.status) {
    await db.insert(issueActivity).values({
      projectId,
      issueId: existingIssue.id,
      actorId: actor.id,
      action: "status_changed",
      fromValue: existingIssue.status,
      toValue: issueFields.status,
    });
  }

  if (isReopenRequest) {
    await db.insert(issueActivity).values({
      projectId,
      issueId: existingIssue.id,
      actorId: actor.id,
      action: "reopened",
      fromValue: existingIssue.status,
      toValue: issueFields.status,
    });
  }

  if (commentsToAppend.length > 0) {
    await db.insert(issueComments).values(
      commentsToAppend.map((body) => ({
        projectId,
        issueId: existingIssue.id,
        authorId: actor.id,
        body,
      })),
    );
  }

  if (mediaChanged) {
    await updateIssueMediaRecords({
      actor,
      teamId,
      projectId,
      issueId: existingIssue.id,
      uploadedMedia: input.media,
      removeMediaIds: input.removeMediaIds,
    });
  }

  const issue = await loadIssueForActor(
    actor,
    teamId,
    projectId,
    existingIssue.id,
  );

  return {
    issue,
    previousAssignedTo: existingIssue.assigneeId,
    previousTesterAssignedTo: existingIssue.testerAssigneeId,
    previousAssigneeGroup: existingIssue.assigneeGroup,
    previousTesterAssigneeGroup: existingIssue.testerAssigneeGroup,
    previousStatus: existingIssue.status,
    previousDeploymentStatus: existingIssue.deploymentStatus,
    reopened: isReopenRequest,
  };
}

export async function updateIssueStatus(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  issueId: string,
  status: IssueStatus,
) {
  const existingIssue = await loadIssueForActor(
    actor,
    teamId,
    projectId,
    issueId,
  );
  const developmentStatus =
    status === "fixed" ? "fixed" : existingIssue.developmentStatus;

  return updateIssue(actor, teamId, projectId, existingIssue.id, {
    title: existingIssue.title,
    description: existingIssue.description,
    issueType: existingIssue.issueType,
    status,
    priority: existingIssue.priority,
    moduleId: existingIssue.moduleId,
    componentId: existingIssue.componentId,
    epicId: existingIssue.epicId,
    sprintId: existingIssue.sprintId,
    releaseId: existingIssue.releaseId,
    assigneeGroup: existingIssue.assigneeGroup,
    assigneeId: existingIssue.assigneeId,
    testerAssigneeGroup: existingIssue.testerAssigneeGroup,
    testerAssigneeId: existingIssue.testerAssigneeId,
    reporterId: existingIssue.reporterId,
    testedById: existingIssue.testedById,
    parentIssueId: existingIssue.parentIssueId,
    remark: existingIssue.remark,
    developmentStatus,
    deploymentStatus: existingIssue.deploymentStatus,
  });
}

export async function deleteIssue(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  issueId: string,
) {
  await requireEditableProjectForUser(actor, teamId, projectId);
  const issue = await loadIssueForActor(actor, teamId, projectId, issueId);

  await deleteIssueMediaObjectsForIssue(projectId, issue.id);
  await db
    .delete(issues)
    .where(and(eq(issues.projectId, projectId), eq(issues.id, issue.id)));

  return issue;
}

const IMPORT_DEFAULT_MODULE_NAME = "Imported";

type ImportOptionAliases<T extends string> = Partial<Record<string, T>>;

interface ImportModuleRecord {
  id: string;
  name: string;
}

interface ImportComponentRecord {
  id: string;
  moduleId: string;
  name: string;
}

interface ImportReferenceRecord {
  id: string;
  name: string;
}

interface ImportTeamMemberRecord {
  userId: string;
  name: string;
  email: string;
  roles: Set<string>;
}

interface IssueImportLookupState {
  mainModule: ImportModuleRecord | null;
  modulesByName: Map<string, ImportModuleRecord>;
  componentsByModuleAndName: Map<string, ImportComponentRecord>;
  epicsByTitle: Map<string, ImportReferenceRecord>;
  releasesByName: Map<string, ImportReferenceRecord>;
  sprintsByName: Map<string, ImportReferenceRecord>;
  membersByLookupKey: Map<string, ImportTeamMemberRecord>;
}

interface PreparedImportIssue {
  fields: ValidatedIssueFields;
  comments: string[];
}

function normalizeImportKey(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeImportName(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? "";
  return normalizedValue || null;
}

function getImportOptionValue<T extends string>(
  value: string | null | undefined,
  options: readonly { value: T; label: string }[],
  fallback: T,
  aliases: ImportOptionAliases<T> = {},
): T {
  const key = normalizeImportKey(value);

  if (!key) {
    return fallback;
  }

  const alias = aliases[key];

  if (alias) {
    return alias;
  }

  return (
    options.find(
      (option) =>
        normalizeImportKey(option.value) === key ||
        normalizeImportKey(option.label) === key,
    )?.value ?? fallback
  );
}

function isMainIssueSheet(sheetName: string) {
  const key = normalizeImportKey(sheetName);

  return (
    key === normalizeImportKey(MAIN_MODULE_ISSUES_SHEET_NAME) ||
    key === "imported issues"
  );
}

function addImportWarning(warnings: Set<string>, message: string) {
  warnings.add(message);
}

function getImportRowLabel(sheet: IssueExcelSheet, row: IssueExcelRow) {
  return `${sheet.sheetName} row ${row.rowNumber ?? "?"}`;
}

async function loadIssueImportLookupState(
  teamId: string,
  projectId: string,
  mainModuleId: string | null,
): Promise<IssueImportLookupState> {
  const [
    moduleRows,
    componentRows,
    epicRows,
    releaseRows,
    sprintRows,
    memberRows,
  ] = await Promise.all([
    db
      .select({
        id: projectModules.id,
        name: projectModules.name,
      })
      .from(projectModules)
      .where(eq(projectModules.projectId, projectId)),
    db
      .select({
        id: projectComponents.id,
        moduleId: projectComponents.moduleId,
        name: projectComponents.name,
      })
      .from(projectComponents)
      .where(eq(projectComponents.projectId, projectId)),
    db
      .select({
        id: projectEpics.id,
        name: projectEpics.title,
      })
      .from(projectEpics)
      .where(eq(projectEpics.projectId, projectId)),
    db
      .select({
        id: projectReleases.id,
        name: projectReleases.name,
      })
      .from(projectReleases)
      .where(eq(projectReleases.projectId, projectId)),
    db
      .select({
        id: sprints.id,
        name: sprints.name,
      })
      .from(sprints)
      .where(eq(sprints.projectId, projectId)),
    db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: teamMemberRoles.role,
      })
      .from(usersToTeams)
      .innerJoin(user, eq(usersToTeams.userId, user.id))
      .leftJoin(
        teamMemberRoles,
        and(
          eq(teamMemberRoles.teamId, usersToTeams.teamId),
          eq(teamMemberRoles.userId, usersToTeams.userId),
        ),
      )
      .where(
        and(
          eq(usersToTeams.teamId, teamId),
          eq(usersToTeams.membershipStatus, "active"),
        ),
      ),
  ]);
  const modulesByName = new Map<string, ImportModuleRecord>();
  const componentsByModuleAndName = new Map<string, ImportComponentRecord>();
  const epicsByTitle = new Map<string, ImportReferenceRecord>();
  const releasesByName = new Map<string, ImportReferenceRecord>();
  const sprintsByName = new Map<string, ImportReferenceRecord>();
  const membersByUserId = new Map<string, ImportTeamMemberRecord>();
  const membersByLookupKey = new Map<string, ImportTeamMemberRecord>();

  for (const row of moduleRows) {
    modulesByName.set(normalizeImportKey(row.name), row);
  }

  for (const row of componentRows) {
    componentsByModuleAndName.set(
      `${row.moduleId}:${normalizeImportKey(row.name)}`,
      row,
    );
  }

  for (const row of epicRows) {
    epicsByTitle.set(normalizeImportKey(row.name), row);
  }

  for (const row of releaseRows) {
    releasesByName.set(normalizeImportKey(row.name), row);
  }

  for (const row of sprintRows) {
    sprintsByName.set(normalizeImportKey(row.name), row);
  }

  for (const row of memberRows) {
    let member = membersByUserId.get(row.userId);

    if (!member) {
      member = {
        userId: row.userId,
        name: row.name,
        email: row.email,
        roles: new Set<string>(),
      };
      membersByUserId.set(row.userId, member);
    }

    if (row.role) {
      member.roles.add(row.role);
    }
  }

  for (const member of membersByUserId.values()) {
    for (const key of [
      normalizeImportKey(member.name),
      normalizeImportKey(member.email),
    ]) {
      if (key && !membersByLookupKey.has(key)) {
        membersByLookupKey.set(key, member);
      }
    }
  }

  const mainModule = mainModuleId
    ? (moduleRows.find((row) => row.id === mainModuleId) ?? null)
    : null;

  if (mainModuleId && !mainModule) {
    throw new RouteError("Choose a valid main module for this import.");
  }

  return {
    mainModule,
    modulesByName,
    componentsByModuleAndName,
    epicsByTitle,
    releasesByName,
    sprintsByName,
    membersByLookupKey,
  };
}

async function ensureImportModule(
  projectId: string,
  state: IssueImportLookupState,
  rawName: string,
) {
  const name = normalizeName(rawName, "Module name");
  const key = normalizeImportKey(name);
  const existingModule = state.modulesByName.get(key);

  if (existingModule) {
    return existingModule;
  }

  const [createdModule] = await db
    .insert(projectModules)
    .values({
      projectId,
      name,
      description: null,
      sortOrder: state.modulesByName.size + 1,
    })
    .returning({
      id: projectModules.id,
      name: projectModules.name,
    });

  state.modulesByName.set(key, createdModule);
  return createdModule;
}

async function ensureImportComponent(
  projectId: string,
  state: IssueImportLookupState,
  moduleId: string,
  rawName: string,
) {
  const name = normalizeName(rawName, "Component name");
  const key = `${moduleId}:${normalizeImportKey(name)}`;
  const existingComponent = state.componentsByModuleAndName.get(key);

  if (existingComponent) {
    return existingComponent;
  }

  const [createdComponent] = await db
    .insert(projectComponents)
    .values({
      projectId,
      moduleId,
      name,
      description: null,
      leadId: null,
      sortOrder: state.componentsByModuleAndName.size + 1,
    })
    .returning({
      id: projectComponents.id,
      moduleId: projectComponents.moduleId,
      name: projectComponents.name,
    });

  state.componentsByModuleAndName.set(key, createdComponent);
  return createdComponent;
}

async function ensureImportEpic(
  projectId: string,
  state: IssueImportLookupState,
  rawTitle: string,
) {
  const title = normalizeName(rawTitle, "Epic title", ISSUE_TITLE_MAX_LENGTH);
  const key = normalizeImportKey(title);
  const existingEpic = state.epicsByTitle.get(key);

  if (existingEpic) {
    return existingEpic;
  }

  const [createdEpic] = await db
    .insert(projectEpics)
    .values({
      projectId,
      title,
      description: null,
      status: "open",
    })
    .returning({
      id: projectEpics.id,
      name: projectEpics.title,
    });

  state.epicsByTitle.set(key, createdEpic);
  return createdEpic;
}

async function ensureImportRelease(
  projectId: string,
  state: IssueImportLookupState,
  rawName: string,
) {
  const name = normalizeName(rawName, "Release name");
  const key = normalizeImportKey(name);
  const existingRelease = state.releasesByName.get(key);

  if (existingRelease) {
    return existingRelease;
  }

  const [createdRelease] = await db
    .insert(projectReleases)
    .values({
      projectId,
      name,
      description: null,
      status: "planned",
    })
    .returning({
      id: projectReleases.id,
      name: projectReleases.name,
    });

  state.releasesByName.set(key, createdRelease);
  return createdRelease;
}

async function ensureImportSprint(
  projectId: string,
  state: IssueImportLookupState,
  rawName: string,
) {
  const name = normalizeName(rawName, "Sprint name");
  const key = normalizeImportKey(name);
  const existingSprint = state.sprintsByName.get(key);

  if (existingSprint) {
    return existingSprint;
  }

  const [createdSprint] = await db
    .insert(sprints)
    .values({
      projectId,
      name,
      goal: null,
      status: "planned",
    })
    .returning({
      id: sprints.id,
      name: sprints.name,
    });

  state.sprintsByName.set(key, createdSprint);
  return createdSprint;
}

function resolveImportAssignee(
  rawName: string | null,
  role: "developer" | "tester",
  state: IssueImportLookupState,
  warnings: Set<string>,
  rowLabel: string,
): {
  group: IssueAssignmentGroup | null;
  userId: string | null;
} | null {
  const normalizedName = normalizeImportName(rawName);

  if (!normalizedName) {
    return null;
  }

  const key = normalizeImportKey(normalizedName);
  const group = role === "developer" ? "development" : "testing";
  const groupNames =
    role === "developer"
      ? new Set([
          "dev",
          "developer",
          "developers",
          "development",
          "development team",
        ])
      : new Set(["qa", "test", "tester", "testers", "testing", "testing team"]);

  if (groupNames.has(key)) {
    return { group, userId: null };
  }

  const member = state.membersByLookupKey.get(key);

  if (!member) {
    addImportWarning(
      warnings,
      `${rowLabel}: ${role === "developer" ? "Developer" : "Tester"} "${normalizedName}" does not match an active team member.`,
    );
    return { group: null, userId: null };
  }

  if (!member.roles.has(role)) {
    addImportWarning(
      warnings,
      `${rowLabel}: ${member.name} is not assigned to the ${role} role.`,
    );
    return { group: null, userId: null };
  }

  return { group, userId: member.userId };
}

async function resolveImportModuleAndComponent(
  projectId: string,
  state: IssueImportLookupState,
  sheet: IssueExcelSheet,
  row: IssueExcelRow,
) {
  const rowModuleName = normalizeImportName(row.moduleName);
  const rowComponentName = normalizeImportName(row.componentName);
  const sheetName =
    normalizeImportName(sheet.sheetName) ?? IMPORT_DEFAULT_MODULE_NAME;
  const sheetCanBecomeSubModule = !isMainIssueSheet(sheetName);
  let moduleId: string | null = null;
  let componentId: string | null = null;
  let moduleRecord: ImportModuleRecord | null = null;

  if (rowModuleName) {
    moduleRecord = await ensureImportModule(projectId, state, rowModuleName);
  } else if (state.mainModule) {
    moduleRecord = state.mainModule;
  } else if (rowComponentName) {
    moduleRecord = await ensureImportModule(
      projectId,
      state,
      sheetCanBecomeSubModule ? sheetName : IMPORT_DEFAULT_MODULE_NAME,
    );
  } else if (sheetCanBecomeSubModule) {
    moduleRecord = await ensureImportModule(
      projectId,
      state,
      IMPORT_DEFAULT_MODULE_NAME,
    );
  }

  if (moduleRecord) {
    moduleId = moduleRecord.id;
  }

  const componentName =
    rowComponentName ?? (sheetCanBecomeSubModule ? sheetName : null);

  if (componentName) {
    const componentModule =
      moduleRecord ??
      (await ensureImportModule(projectId, state, IMPORT_DEFAULT_MODULE_NAME));
    const component = await ensureImportComponent(
      projectId,
      state,
      componentModule.id,
      componentName,
    );

    moduleId = component.moduleId;
    componentId = component.id;
  }

  return { moduleId, componentId };
}

async function buildImportIssuePayload(
  actor: IssueActor,
  projectId: string,
  state: IssueImportLookupState,
  sheet: IssueExcelSheet,
  row: IssueExcelRow,
  warnings: Set<string>,
): Promise<PreparedImportIssue> {
  const rowLabel = getImportRowLabel(sheet, row);
  const title = normalizeName(
    normalizeImportName(row.title) ?? "",
    "Issue title",
    ISSUE_TITLE_MAX_LENGTH,
  );

  const { moduleId, componentId } = await resolveImportModuleAndComponent(
    projectId,
    state,
    sheet,
    row,
  );
  const developerAssignment = resolveImportAssignee(
    row.assignedToName,
    "developer",
    state,
    warnings,
    rowLabel,
  );
  const testerAssignment = resolveImportAssignee(
    row.testerAssignedToName,
    "tester",
    state,
    warnings,
    rowLabel,
  );
  const fixedDate = normalizeOptionalDate(row.fixedDate);
  const status = getImportOptionValue<IssueStatus>(
    row.status,
    ISSUE_STATUS_OPTIONS,
    fixedDate ? "fixed" : "todo",
    {
      open: "todo",
      todo: "todo",
      "to do": "todo",
      progress: "in_progress",
      "in progress": "in_progress",
      review: "review",
      "in review": "review",
      done: "fixed",
      closed: "fixed",
      fixed: "fixed",
      resolved: "fixed",
    },
  );
  const developmentStatus = row.developmentStatus
    ? getImportOptionValue<DevelopmentStatus>(
        row.developmentStatus,
        DEVELOPMENT_STATUS_OPTIONS,
        status === "fixed" ? "fixed" : "not_started",
        {
          done: "fixed",
          fixed: "fixed",
          development: "in_progress",
          "in development": "in_progress",
          progress: "in_progress",
          "in progress": "in_progress",
          "dev check": "developer_check",
          "developer check": "developer_check",
          "qa check": "tester_check",
          "tester check": "tester_check",
        },
      )
    : status === "fixed"
      ? "fixed"
      : "not_started";
  const deploymentStatus = getImportOptionValue<DeploymentStatus>(
    row.deploymentStatus,
    DEPLOYMENT_STATUS_OPTIONS,
    "not_deployed",
    {
      deployed: "deployed",
      "not deployed": "not_deployed",
      queued: "queued",
      "queued for deployment": "queued",
      verified: "verified",
      "tester check": "tester_check",
      "qa check": "tester_check",
    },
  );
  const epic = row.epicTitle
    ? await ensureImportEpic(projectId, state, row.epicTitle)
    : null;
  const sprint = row.sprintName
    ? await ensureImportSprint(projectId, state, row.sprintName)
    : null;
  const release = row.releaseName
    ? await ensureImportRelease(projectId, state, row.releaseName)
    : null;

  return {
    fields: {
      title,
      description: null,
      issueType: "bug",
      status,
      priority: getImportOptionValue<IssuePriority>(
        row.priority,
        ISSUE_PRIORITY_OPTIONS,
        "medium",
        {
          blocker: "critical",
          urgent: "critical",
        },
      ),
      moduleId,
      componentId,
      epicId: epic?.id ?? null,
      sprintId: sprint?.id ?? null,
      releaseId: release?.id ?? null,
      assigneeGroup: developerAssignment?.group ?? null,
      assigneeId: developerAssignment?.userId ?? null,
      testerAssigneeGroup: testerAssignment?.group ?? null,
      testerAssigneeId: testerAssignment?.userId ?? null,
      reporterId: actor.id,
      testedById: null,
      parentIssueId: null,
      remark: normalizeOptionalText(row.remark, "Remark"),
      fixedDate,
      developmentStatus,
      deploymentStatus,
    },
    comments: normalizeTextItems(row.comments, "Comments"),
  };
}

async function allocateIssueKeys(projectId: string, count: number) {
  if (count <= 0) {
    return [];
  }

  const [projectCounter] = await db
    .update(projects)
    .set({
      nextIssueNumber: sql`${projects.nextIssueNumber} + ${count}`,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning({
      keyPrefix: projects.keyPrefix,
      nextIssueNumber: projects.nextIssueNumber,
    });

  if (!projectCounter) {
    throw new RouteError("Project not found.", 404);
  }

  const firstSequence = Number(projectCounter.nextIssueNumber) - count;

  return Array.from({ length: count }, (_, index) => {
    const sequence = firstSequence + index;

    return {
      sequence,
      key: `${projectCounter.keyPrefix}-${sequence}`,
    };
  });
}

async function createImportedIssues(
  actor: IssueActor,
  projectId: string,
  preparedIssues: PreparedImportIssue[],
) {
  if (preparedIssues.length === 0) {
    return;
  }

  await db.transaction(async () => {
    const keyFields = await allocateIssueKeys(projectId, preparedIssues.length);
    const createdIssues = await db
      .insert(issues)
      .values(
        preparedIssues.map((preparedIssue, index) => ({
          projectId,
          ...keyFields[index],
          ...preparedIssue.fields,
          fixedDate: getAutomaticFixedDate(preparedIssue.fields),
        })),
      )
      .returning({
        id: issues.id,
        key: issues.key,
      });

    await db.insert(issueActivity).values(
      createdIssues.map((createdIssue) => ({
        projectId,
        issueId: createdIssue.id,
        actorId: actor.id,
        action: "created",
        toValue: createdIssue.key,
      })),
    );

    const commentRows = preparedIssues.flatMap((preparedIssue, index) =>
      preparedIssue.comments.map((body) => ({
        projectId,
        issueId: createdIssues[index].id,
        authorId: actor.id,
        body,
      })),
    );

    if (commentRows.length > 0) {
      await db.insert(issueComments).values(commentRows);
    }
  });
}

export async function importIssuesFromExcel(
  actor: IssueActor,
  teamId: string,
  projectId: string,
  mainModuleId: string | null,
  importedSheets: IssueExcelSheet[],
): Promise<IssueExcelImportResponse> {
  await requireEditableProjectForUser(actor, teamId, projectId);

  const warnings = new Set<string>();
  const state = await loadIssueImportLookupState(
    teamId,
    projectId,
    mainModuleId,
  );
  let createdCount = 0;
  let skippedCount = 0;
  const preparedIssues: PreparedImportIssue[] = [];

  for (const sheet of importedSheets) {
    for (const row of sheet.rows) {
      const rowLabel = getImportRowLabel(sheet, row);

      if (!normalizeImportName(row.title)) {
        skippedCount += 1;
        addImportWarning(warnings, `${rowLabel}: Issue title is required.`);
        continue;
      }

      try {
        const preparedIssue = await buildImportIssuePayload(
          actor,
          projectId,
          state,
          sheet,
          row,
          warnings,
        );

        preparedIssues.push(preparedIssue);
        createdCount += 1;
      } catch (error) {
        skippedCount += 1;
        addImportWarning(
          warnings,
          `${rowLabel}: ${
            error instanceof Error ? error.message : "Could not import row."
          }`,
        );
      }
    }
  }

  await createImportedIssues(actor, projectId, preparedIssues);

  return {
    createdCount,
    updatedCount: 0,
    skippedCount,
    warnings: Array.from(warnings),
    message:
      createdCount > 0
        ? `Imported ${createdCount} issue${createdCount === 1 ? "" : "s"}.`
        : "No issues were imported.",
  };
}
