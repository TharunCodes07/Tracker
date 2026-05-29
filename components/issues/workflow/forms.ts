import {
  type IssueListItem,
  type UpdateIssueInput,
  type UploadedIssueMediaInput,
} from "@/routes/issues/types";

import { NONE_VALUE } from "./constants";
import type {
  ComponentFormState,
  EpicFormState,
  IssueFormState,
  ModuleFormState,
  ReleaseFormState,
  SprintFormState,
} from "./types";

export function createEmptyIssueForm(): IssueFormState {
  return {
    title: "",
    description: "",
    issueType: "bug",
    status: "todo",
    priority: "medium",
    moduleId: NONE_VALUE,
    componentId: NONE_VALUE,
    epicId: NONE_VALUE,
    sprintId: NONE_VALUE,
    releaseId: NONE_VALUE,
    assigneeGroup: NONE_VALUE,
    assigneeId: NONE_VALUE,
    testerAssigneeGroup: NONE_VALUE,
    testerAssigneeId: NONE_VALUE,
    reporterId: NONE_VALUE,
    testedById: NONE_VALUE,
    parentIssueId: NONE_VALUE,
    comments: "",
    remark: "",
    developmentStatus: "not_started",
    deploymentStatus: "not_deployed",
    media: [],
    mediaFiles: [],
    removeMediaIds: [],
    reopen: false,
  };
}

export function createIssueFormFromIssue(issue: IssueListItem): IssueFormState {
  return {
    title: issue.title,
    description: issue.description ?? "",
    issueType: issue.issueType,
    status: issue.status,
    priority: issue.priority,
    moduleId: issue.moduleId ?? NONE_VALUE,
    componentId: issue.componentId ?? NONE_VALUE,
    epicId: issue.epicId ?? NONE_VALUE,
    sprintId: issue.sprintId ?? NONE_VALUE,
    releaseId: issue.releaseId ?? NONE_VALUE,
    assigneeGroup: issue.assigneeGroup ?? NONE_VALUE,
    assigneeId: issue.assigneeId ?? NONE_VALUE,
    testerAssigneeGroup: issue.testerAssigneeGroup ?? NONE_VALUE,
    testerAssigneeId: issue.testerAssigneeId ?? NONE_VALUE,
    reporterId: issue.reporterId ?? NONE_VALUE,
    testedById: issue.testedById ?? NONE_VALUE,
    parentIssueId: issue.parentIssueId ?? NONE_VALUE,
    comments: issue.comments ?? "",
    remark: issue.remark ?? "",
    developmentStatus: issue.developmentStatus,
    deploymentStatus: issue.deploymentStatus,
    media: issue.media,
    mediaFiles: [],
    removeMediaIds: [],
    reopen: false,
  };
}

export function createEmptyModuleForm(): ModuleFormState {
  return { name: "", description: "" };
}

export function createEmptyComponentForm(moduleId = NONE_VALUE): ComponentFormState {
  return { moduleId, name: "", description: "" };
}

export function createEmptyEpicForm(): EpicFormState {
  return {
    title: "",
    description: "",
    status: "open",
    startDate: "",
    targetDate: "",
  };
}

export function createEmptyReleaseForm(): ReleaseFormState {
  return {
    name: "",
    description: "",
    status: "planned",
    startDate: "",
    targetDate: "",
  };
}

export function createEmptySprintForm(): SprintFormState {
  return {
    name: "",
    goal: "",
    status: "planned",
    startDate: "",
    endDate: "",
  };
}

export function labelFor<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function idOrNull(value: string) {
  return value === NONE_VALUE ? null : value;
}

export function valueOrNull(value: string) {
  return value.trim() || null;
}

export function buildIssuePayload(
  form: IssueFormState,
  uploadedMedia: UploadedIssueMediaInput[] = []
): UpdateIssueInput {
  return {
    title: form.title,
    description: valueOrNull(form.description),
    issueType: form.issueType,
    status: form.status,
    priority: form.priority,
    moduleId: idOrNull(form.moduleId),
    componentId: idOrNull(form.componentId),
    epicId: idOrNull(form.epicId),
    sprintId: idOrNull(form.sprintId),
    releaseId: idOrNull(form.releaseId),
    assigneeGroup: idOrNull(form.assigneeGroup) as UpdateIssueInput["assigneeGroup"],
    assigneeId: idOrNull(form.assigneeId),
    testerAssigneeGroup: idOrNull(form.testerAssigneeGroup) as UpdateIssueInput["testerAssigneeGroup"],
    testerAssigneeId: idOrNull(form.testerAssigneeId),
    reporterId: idOrNull(form.reporterId),
    testedById: idOrNull(form.testedById),
    parentIssueId: form.issueType === "subtask" ? idOrNull(form.parentIssueId) : null,
    comments: valueOrNull(form.comments),
    remark: valueOrNull(form.remark),
    developmentStatus: form.developmentStatus,
    deploymentStatus: form.deploymentStatus,
    media: uploadedMedia,
    removeMediaIds: form.removeMediaIds,
    mediaChanged: uploadedMedia.length > 0 || form.removeMediaIds.length > 0,
    reopen: form.reopen,
  };
}
