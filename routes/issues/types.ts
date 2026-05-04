import type { ProjectListItem } from "@/routes/projects/types";
import type { TeamMemberListItem, TeamListItem } from "@/routes/teams/types";

export const GENERAL_MODULE_FILTER_VALUE = "__general__";
export const MAIN_MODULE_ISSUES_SHEET_NAME = "Main Module";
export const UNCLASSIFIED_ISSUE_TYPE_FILTER_VALUE = "__unclassified__";
export const DEFAULT_ISSUE_CLASS_DEFINITIONS = [
  {
    name: "Bug",
    description: "Functional defects, regressions, and broken behavior.",
  },
  {
    name: "UI",
    description: "Visual, layout, accessibility, and interaction issues.",
  },
] as const;

export const ISSUE_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const ISSUE_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "done", label: "Done" },
] as const;
export const ISSUE_MEDIA_TYPES = ["image", "video"] as const;
export const ISSUE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const ISSUE_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const ISSUE_IMAGE_ACCEPT = "image/*";
export const ISSUE_VIDEO_ACCEPT = "video/*";
export const ISSUE_EXCEL_HEADERS = [
  "No",
  "Main Module",
  "Sub Module",
  "Navigation",
  "Issue",
  "Priority",
  "Assigned to",
  "Status",
  "Comments",
  "Remark",
  "Tested By",
  "Fixed Date",
  "Development",
  "Deployement",
] as const;

export type IssuePriority = (typeof ISSUE_PRIORITY_OPTIONS)[number]["value"];
export type IssueStatus = (typeof ISSUE_STATUS_OPTIONS)[number]["value"];
export type IssueMediaType = (typeof ISSUE_MEDIA_TYPES)[number];
export type IssueResolutionFilter =
  | "all"
  | "open"
  | "review"
  | "resolved"
  | "reopened";
export type IssueAssigneeFilterValue = "current-user" | "unassigned";
export const ISSUE_LIST_SORT_FIELDS = [
  "updatedAt",
  "no",
  "navigation",
  "title",
  "issueClassName",
  "moduleName",
  "priority",
  "status",
  "assignedToName",
  "reviewedByName",
  "testedByName",
] as const;
export type IssueListSortField = (typeof ISSUE_LIST_SORT_FIELDS)[number];
export type IssueListSortDirection = "asc" | "desc";

export interface ProjectModuleListItem {
  id: string;
  name: string;
  description: string | null;
  parentModuleId: string | null;
  parentModuleName: string | null;
  isMainModule: boolean;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueClassListItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  no: number;
  navigation: string | null;
  title: string;
  description: string | null;
  priority: IssuePriority;
  status: IssueStatus;
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
  reopenedAt: string | null;
  fixedDate: string | null;
  development: boolean;
  deployment: boolean;
  createdBy: string | null;
  createdByName: string | null;
  media: IssueMediaListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueModuleCount {
  moduleId: string | null;
  issueCount: number;
}

export interface IssueListSummary {
  totalIssues: number;
  openIssueCount: number;
  resolvedIssueCount: number;
  reviewIssueCount: number;
  reopenedIssueCount: number;
  criticalIssueCount: number;
  hasUnclassifiedIssues: boolean;
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
  moduleFilters: string[];
  issueTypeFilters: string[];
  priorityFilters: IssuePriority[];
  assigneeFilters: IssueAssigneeFilterValue[];
  sortBy: IssueListSortField;
  sortDirection: IssueListSortDirection;
}

export interface ProjectIssuesWorkspaceResponse {
  team: TeamListItem;
  project: ProjectListItem;
  members: TeamMemberListItem[];
  modules: ProjectModuleListItem[];
  issueClasses: IssueClassListItem[];
}

export interface ProjectIssuesListResponse {
  issues: IssueListItem[];
  summary: IssueListSummary;
  pagination: IssueListPagination;
  moduleCounts: IssueModuleCount[];
}

export interface ProjectModuleMutationResponse {
  module: ProjectModuleListItem;
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
  parentModuleId?: string | null;
}

export interface CreateIssueClassInput {
  name: string;
  description?: string | null;
}

export interface CreateIssueInput {
  navigation?: string | null;
  title: string;
  description?: string | null;
  moduleId?: string | null;
  issueClassId: string;
  priority: IssuePriority;
  status: IssueStatus;
  assignedTo?: string | null;
  reviewedBy?: string | null;
  comments?: string | null;
  remark?: string | null;
  testedBy?: string | null;
  fixedDate?: string | null;
  development?: boolean;
  deployment?: boolean;
  media?: UploadedIssueMediaInput[];
  removeMediaIds?: string[];
}

export interface UpdateIssueInput extends CreateIssueInput {
  mediaChanged?: boolean;
}

export interface IssueExcelRow {
  rowNumber?: number;
  no: number | null;
  mainModuleName?: string | null;
  subModuleName?: string | null;
  navigation: string | null;
  title: string | null;
  priority: string | null;
  assignedToName: string | null;
  status: string | null;
  comments: string | null;
  remark: string | null;
  testedByName: string | null;
  fixedDate: string | null;
  development: boolean | null;
  deployment: boolean | null;
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
