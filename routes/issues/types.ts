import type { ProjectListItem } from "@/routes/projects/types";
import type { TeamMemberListItem, TeamListItem } from "@/routes/teams/types";

export const GENERAL_MODULE_FILTER_VALUE = "__general__";
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

export type IssuePriority = (typeof ISSUE_PRIORITY_OPTIONS)[number]["value"];
export type IssueStatus = (typeof ISSUE_STATUS_OPTIONS)[number]["value"];
export type IssueResolutionFilter = "all" | "open" | "resolved";
export type IssueAssigneeFilterValue = "current-user" | "unassigned";
export const ISSUE_LIST_SORT_FIELDS = [
  "updatedAt",
  "no",
  "title",
  "issueClassName",
  "moduleName",
  "priority",
  "status",
  "assignedToName",
] as const;
export type IssueListSortField = (typeof ISSUE_LIST_SORT_FIELDS)[number];
export type IssueListSortDirection = "asc" | "desc";

export interface ProjectModuleListItem {
  id: string;
  name: string;
  description: string | null;
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

export interface IssueListItem {
  id: string;
  no: number;
  title: string;
  description: string | null;
  priority: IssuePriority;
  status: IssueStatus;
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

export interface IssueDeleteResponse {
  deletedIssueId: string;
  message: string;
}

export interface CreateProjectModuleInput {
  name: string;
  description?: string | null;
}

export interface CreateIssueClassInput {
  name: string;
  description?: string | null;
}

export interface CreateIssueInput {
  title: string;
  description?: string | null;
  moduleId?: string | null;
  issueClassId: string;
  priority: IssuePriority;
  status: IssueStatus;
  assignedTo?: string | null;
  reviewedBy?: string | null;
  testedBy?: string | null;
}

export type UpdateIssueInput = CreateIssueInput;
