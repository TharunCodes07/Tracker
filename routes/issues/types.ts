import type { ProjectListItem } from "@/routes/projects/types";
import type { TeamListItem, TeamMemberListItem } from "@/routes/teams/types";

export const GENERAL_MODULE_FILTER_VALUE = "__general__";
export const MAIN_MODULE_ISSUES_SHEET_NAME = "Issues";
export const UNCLASSIFIED_ISSUE_TYPE_FILTER_VALUE = "__unclassified__";

export const ISSUE_TYPE_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "task", label: "Task" },
  { value: "improvement", label: "Improvement" },
  { value: "subtask", label: "Subtask" },
] as const;

export const ISSUE_PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export const ACTIVE_ISSUE_STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "fixed", label: "Fixed" },
] as const;

export const ISSUE_STATUS_OPTIONS = ACTIVE_ISSUE_STATUS_OPTIONS;

export const DEVELOPMENT_STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Development" },
  { value: "developer_check", label: "Developer Check" },
  { value: "tester_check", label: "Tester Check" },
  { value: "blocked", label: "Blocked" },
  { value: "fixed", label: "Fixed" },
] as const;

export const DEPLOYMENT_STATUS_OPTIONS = [
  { value: "not_deployed", label: "Not Deployed" },
  { value: "queued", label: "Queued for Deployment" },
  { value: "deployed", label: "Deployed" },
  { value: "tester_check", label: "Tester Check" },
  { value: "verified", label: "Verified" },
] as const;

export const ISSUE_ASSIGNMENT_GROUP_OPTIONS = [
  { value: "development", label: "Development team" },
  { value: "testing", label: "Testing team" },
] as const;

export const EPIC_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
] as const;

export const RELEASE_STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "released", label: "Released" },
  { value: "archived", label: "Archived" },
] as const;

export const SPRINT_STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

export const ISSUE_MEDIA_TYPES = ["image", "video"] as const;
export const ISSUE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const ISSUE_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const ISSUE_IMAGE_ACCEPT = "image/*";
export const ISSUE_VIDEO_ACCEPT = "video/*";

export const ISSUE_EXCEL_HEADERS = [
  "No",
  "Module",
  "Component",
  "Issue",
  "Priority",
  "Developer",
  "Status",
  "Comments",
  "Remark",
  "Tester",
  "Fixed Date",
  "Development",
  "Deployment",
  "Epic",
  "Sprint",
  "Release",
] as const;

export type IssueType = (typeof ISSUE_TYPE_OPTIONS)[number]["value"];
export type IssuePriority = (typeof ISSUE_PRIORITY_OPTIONS)[number]["value"];
export type IssueStatus = (typeof ISSUE_STATUS_OPTIONS)[number]["value"];
export type DevelopmentStatus =
  (typeof DEVELOPMENT_STATUS_OPTIONS)[number]["value"];
export type DeploymentStatus =
  (typeof DEPLOYMENT_STATUS_OPTIONS)[number]["value"];
export type IssueAssignmentGroup =
  (typeof ISSUE_ASSIGNMENT_GROUP_OPTIONS)[number]["value"];
export type EpicStatus = (typeof EPIC_STATUS_OPTIONS)[number]["value"];
export type ProjectReleaseStatus =
  (typeof RELEASE_STATUS_OPTIONS)[number]["value"];
export type SprintStatus = (typeof SPRINT_STATUS_OPTIONS)[number]["value"];
export type IssueMediaType = (typeof ISSUE_MEDIA_TYPES)[number];
export type IssueResolutionFilter =
  | "all"
  | "open"
  | "review"
  | "resolved"
  | "reopened";
export type IssueAssigneeFilterValue =
  | "current-user"
  | "current-role"
  | "unassigned";
export type IssueReporterFilterValue = "current-user";
export type IssueTestedByFilterValue = "current-user" | "untested";

export const ISSUE_LIST_SORT_FIELDS = [
  "updatedAt",
  "serialNumber",
  "no",
  "key",
  "issueKey",
  "title",
  "navigation",
  "issueType",
  "type",
  "issueClassName",
  "status",
  "priority",
  "module",
  "moduleName",
  "component",
  "componentName",
  "epic",
  "epicTitle",
  "release",
  "releaseName",
  "sprint",
  "sprintName",
  "assignee",
  "assigneeName",
  "assignedToName",
  "testerAssigneeName",
  "testerAssignedToName",
  "testedBy",
  "testedByName",
  "reviewedByName",
  "fixedDate",
  "developmentStatus",
  "deploymentStatus",
] as const;

export type IssueListSortField = (typeof ISSUE_LIST_SORT_FIELDS)[number];
export type IssueListSortDirection = "asc" | "desc";

export interface ProjectModuleListItem {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  displayName: string;
  parentModuleId: string | null;
  parentModuleName: string | null;
  isMainModule: boolean;
}

export interface ProjectComponentListItem {
  id: string;
  projectId?: string;
  moduleId: string;
  moduleName: string;
  name: string;
  description: string | null;
  leadId: string | null;
  leadName: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectEpicListItem {
  id: string;
  title: string;
  name: string;
  description: string | null;
  status: EpicStatus;
  startDate: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectReleaseListItem {
  id: string;
  name: string;
  description: string | null;
  status: ProjectReleaseStatus;
  startDate: string | null;
  targetDate: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSprintListItem {
  id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueTypeListItem {
  id: IssueType;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export type IssueClassListItem = IssueTypeListItem;

export interface IssueMediaListItem {
  id: string;
  mediaType: IssueMediaType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedIssueMediaInput {
  mediaType: IssueMediaType;
  bucket: string;
  objectKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IssueListItem {
  id: string;
  key: string;
  issueKey: string;
  sequence: number;
  serialNumber: number;
  no: number;
  issueType: IssueType;
  type: IssueType;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeGroup: IssueAssignmentGroup | null;
  testerAssigneeGroup: IssueAssignmentGroup | null;
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
  subtaskCount: number;
  commentCount: number;
  remark: string | null;
  fixedDate: string | null;
  developmentStatus: DevelopmentStatus;
  deploymentStatus: DeploymentStatus;
  media: IssueMediaListItem[];
  createdAt: string;
  updatedAt: string;

  navigation: string | null;
  mainModuleId: string | null;
  mainModuleName: string | null;
  subModuleId: string | null;
  subModuleName: string | null;
  issueClassId: IssueType;
  issueClassName: string;
  assignedTo: string | null;
  assignedToName: string | null;
  assignmentGroup: IssueAssignmentGroup | null;
  assignmentGroupName: string | null;
  testerAssignedTo: string | null;
  testerAssignedToName: string | null;
  testerAssignmentGroup: IssueAssignmentGroup | null;
  testerAssignmentGroupName: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  comments: string | null;
  testedBy: string | null;
  reopenedBy: string | null;
  reopenedByName: string | null;
  reopenedAt: string | null;
  development: boolean;
  deployment: boolean;
  createdBy: string | null;
  createdByName: string | null;
}

export interface IssueGroupCount {
  id: string | null;
  issueCount: number;
  doneCount: number;
  highPriorityCount?: number;
  openCount?: number;
}

export type IssueModuleCount = IssueGroupCount & { moduleId: string | null };

export interface IssueListSummary {
  totalIssues: number;
  openIssueCount: number;
  doneIssueCount?: number;
  reviewIssueCount: number;
  fixedIssueCount?: number;
  backlogIssueCount?: number;
  epicCount?: number;
  criticalIssueCount: number;
  unassignedIssueCount?: number;
  hasUnclassifiedIssues: boolean;
  resolvedIssueCount: number;
  reopenedIssueCount: number;
}

export interface IssueListPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ListProjectIssuesInput {
  page: number;
  pageSize: number;
  search: string;
  resolution: IssueResolutionFilter;
  typeFilters: IssueType[];
  statusFilters: IssueStatus[];
  moduleFilters: string[];
  componentFilters: string[];
  epicFilters: string[];
  releaseFilters: string[];
  sprintFilters: string[];
  priorityFilters: IssuePriority[];
  assigneeFilters: IssueAssigneeFilterValue[];
  reporterFilters: IssueReporterFilterValue[];
  testedByFilters: IssueTestedByFilterValue[];
  backlogOnly: boolean;
  sortBy: IssueListSortField;
  sortDirection: IssueListSortDirection;
  issueTypeFilters: string[];
}

export interface ProjectIssuesWorkspaceResponse {
  team: TeamListItem;
  project: ProjectListItem;
  members: TeamMemberListItem[];
  issueTypes: IssueTypeListItem[];
  modules: ProjectModuleListItem[];
  components: ProjectComponentListItem[];
  epics: ProjectEpicListItem[];
  releases: ProjectReleaseListItem[];
  sprints: ProjectSprintListItem[];
  issueClasses: IssueClassListItem[];
}

export interface ProjectIssuesListResponse {
  issues: IssueListItem[];
  summary: IssueListSummary;
  pagination: IssueListPagination;
  moduleCounts: IssueModuleCount[];
  componentCounts: IssueGroupCount[];
  releaseCounts: IssueGroupCount[];
  epicCounts: IssueGroupCount[];
  sprintCounts: IssueGroupCount[];
}

export interface ProjectModuleMutationResponse {
  module: ProjectModuleListItem;
  message: string;
}

export interface ProjectComponentMutationResponse {
  component: ProjectComponentListItem;
  message: string;
}

export interface ProjectEpicMutationResponse {
  epic: ProjectEpicListItem;
  message: string;
}

export interface ProjectReleaseMutationResponse {
  release: ProjectReleaseListItem;
  message: string;
}

export interface ProjectSprintMutationResponse {
  sprint: ProjectSprintListItem;
  message: string;
}

export interface IssueClassMutationResponse {
  issueClass: IssueClassListItem;
  message: string;
}

export interface IssueMutationResponse {
  issue: IssueListItem;
  message: string;
}

export interface IssueMediaUploadResponse {
  media: UploadedIssueMediaInput;
  message: string;
}

export interface IssueDeleteResponse {
  deletedIssueId: string;
  message: string;
}

export interface CreateProjectModuleInput {
  name: string;
  description?: string | null;
  sortOrder?: number;
  parentModuleId?: string | null;
}

export interface CreateProjectComponentInput {
  moduleId: string;
  name: string;
  description?: string | null;
  leadId?: string | null;
  sortOrder?: number;
}

export interface CreateProjectEpicInput {
  title: string;
  description?: string | null;
  status?: EpicStatus;
  startDate?: string | null;
  targetDate?: string | null;
}

export interface CreateProjectReleaseInput {
  name: string;
  description?: string | null;
  status?: ProjectReleaseStatus;
  startDate?: string | null;
  targetDate?: string | null;
  releasedAt?: string | null;
}

export interface CreateProjectSprintInput {
  name: string;
  goal?: string | null;
  status?: SprintStatus;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CreateIssueClassInput {
  name: string;
  description?: string | null;
}

export interface CreateIssueInput {
  title: string;
  description?: string | null;
  issueType?: IssueType;
  type?: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  moduleId?: string | null;
  componentId?: string | null;
  epicId?: string | null;
  sprintId?: string | null;
  releaseId?: string | null;
  assigneeGroup?: IssueAssignmentGroup | null;
  assignmentGroup?: IssueAssignmentGroup | null;
  assigneeId?: string | null;
  testerAssigneeGroup?: IssueAssignmentGroup | null;
  testerAssignmentGroup?: IssueAssignmentGroup | null;
  testerAssigneeId?: string | null;
  reporterId?: string | null;
  testedById?: string | null;
  parentIssueId?: string | null;
  remark?: string | null;
  developmentStatus?: DevelopmentStatus;
  deploymentStatus?: DeploymentStatus;
  media?: UploadedIssueMediaInput[];
  removeMediaIds?: string[];

  navigation?: string | null;
  issueClassId?: string | null;
  assignedTo?: string | null;
  testerAssignedTo?: string | null;
  reviewedBy?: string | null;
  testedBy?: string | null;
  comments?: string | null;
  development?: boolean;
  deployment?: boolean;
  reopen?: boolean;
}

export interface UpdateIssueInput extends CreateIssueInput {
  mediaChanged?: boolean;
}

export interface IssueExcelRow {
  rowNumber?: number;
  no: number | null;
  moduleName: string | null;
  componentName: string | null;
  title: string | null;
  priority: string | null;
  assignedToName: string | null;
  testerAssignedToName: string | null;
  status: string | null;
  comments: string | null;
  remark: string | null;
  fixedDate: string | null;
  developmentStatus: string | null;
  deploymentStatus: string | null;
  epicTitle: string | null;
  sprintName: string | null;
  releaseName: string | null;
}

export interface IssueExcelSheet {
  sheetName: string;
  rows: IssueExcelRow[];
}

export interface IssueExcelWorkbook {
  fileName: string;
  sheets: IssueExcelSheet[];
}

export interface IssueExcelImportResponse {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  warnings: string[];
  message: string;
}
