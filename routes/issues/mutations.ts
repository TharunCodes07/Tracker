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
  fields: Pick<ValidatedIssueFields, "status" | "developmentStatus">,
  previousFixedDate?: string | Date | null,
) {
  if (!isFixedWorkflowState(fields.status, fields.developmentStatus)) {
    return null;
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

export async function importIssuesFromExcel(
  _actor: IssueActor,
  _teamId: string,
  _projectId: string,
  _mainModuleId: string,
  _importedSheets: IssueExcelSheet[],
): Promise<IssueExcelImportResponse> {
  void _actor;
  void _teamId;
  void _projectId;
  void _mainModuleId;
  void _importedSheets;

  throw new RouteError(
    "Excel import needs the new column-mapping flow before it can be enabled.",
    410,
  );
}
