"use client";

import type { SortingState } from "@tanstack/react-table";

import type { IssueFormValues } from "@/components/issues/issue-dialog";
import type {
  CreateIssueInput,
  IssueAssigneeFilterValue,
  IssueClassListItem,
  IssueListItem,
  IssueListSortDirection,
  IssueListSortField,
  IssuePriority,
  IssueResolutionFilter,
  ProjectModuleListItem,
} from "@/routes/issues/types";

export const DEFAULT_SORTING: SortingState = [{ id: "updatedAt", desc: true }];
export const DEFAULT_PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;
export const PROJECT_ISSUES_VIEW_STORAGE_KEY = "project-issues:view-mode";

export interface IssueWorkspaceFilterOption {
  value: string;
  label: string;
  description?: string | null;
  accentClassName?: string;
  labelClassName?: string;
}

export interface IssueWorkspaceFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function requestJson<TResponse>(input: RequestInfo, init?: RequestInit) {
  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  }).then(async (response) => {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      throw new Error(data?.message ?? "Request failed.");
    }

    return data as TResponse;
  });
}

export function createEmptyIssueForm(defaultIssueClassId = ""): IssueFormValues {
  return {
    navigation: "",
    title: "",
    description: "",
    moduleId: "",
    issueClassId: defaultIssueClassId,
    priority: "medium",
    status: "open",
    assignedTo: "",
    reviewedBy: "",
    comments: "",
    remark: "",
    testedBy: "",
    fixedDate: "",
    development: false,
    deployment: false,
  };
}

export function createIssueFormFromIssue(
  issue: IssueListItem,
  defaultIssueClassId = ""
): IssueFormValues {
  return {
    navigation: issue.navigation ?? "",
    title: issue.title,
    description: issue.description ?? "",
    moduleId: issue.moduleId ?? "",
    issueClassId: issue.issueClassId ?? defaultIssueClassId,
    priority: issue.priority,
    status: issue.status,
    assignedTo: issue.assignedTo ?? "",
    reviewedBy: issue.reviewedBy ?? "",
    comments: issue.comments ?? "",
    remark: issue.remark ?? "",
    testedBy: issue.testedBy ?? "",
    fixedDate: toDateInputValue(issue.fixedDate),
    development: issue.development,
    deployment: issue.deployment,
  };
}

export function createIssuePayload(values: IssueFormValues): CreateIssueInput {
  return {
    navigation: values.navigation || null,
    title: values.title,
    description: values.description || null,
    moduleId: values.moduleId || null,
    issueClassId: values.issueClassId,
    priority: values.priority,
    status: values.status,
    assignedTo: values.assignedTo || null,
    reviewedBy: values.reviewedBy || null,
    comments: values.comments || null,
    remark: values.remark || null,
    testedBy: values.testedBy || null,
    fixedDate: values.fixedDate || null,
    development: values.development,
    deployment: values.deployment,
  };
}

export function sortModules(modules: ProjectModuleListItem[]) {
  return [...modules].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  );
}

export function sortIssueClasses(issueClasses: IssueClassListItem[]) {
  return [...issueClasses].sort((left, right) => {
    if (left.isSystem !== right.isSystem) {
      return left.isSystem ? -1 : 1;
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });
}

export function toggleStringSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function togglePrioritySelection(values: IssuePriority[], value: IssuePriority) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function normalizeSorting(sorting: SortingState) {
  const [activeSort] = sorting;

  if (!activeSort) {
    return DEFAULT_SORTING;
  }

  return [
    {
      id: activeSort.id,
      desc: activeSort.desc ?? false,
    },
  ] satisfies SortingState;
}

function getSortValues(sorting: SortingState): {
  sortBy: IssueListSortField;
  sortDirection: IssueListSortDirection;
} {
  const [activeSort] = normalizeSorting(sorting);

  return {
    sortBy: activeSort.id as IssueListSortField,
    sortDirection: activeSort.desc ? "desc" : "asc",
  };
}

export function buildIssuesSearchParams(options: {
  teamId: string;
  projectId: string;
  pageIndex: number;
  pageSize: number;
  search: string;
  resolutionFilter: IssueResolutionFilter;
  moduleFilters: string[];
  issueTypeFilters: string[];
  priorityFilters: IssuePriority[];
  assigneeFilters: IssueAssigneeFilterValue[];
  sorting: SortingState;
}) {
  const { sortBy, sortDirection } = getSortValues(options.sorting);
  const searchParams = new URLSearchParams({
    page: String(options.pageIndex + 1),
    pageSize: String(options.pageSize),
    sortBy,
    sortDirection,
  });

  if (options.search) {
    searchParams.set("search", options.search);
  }

  if (options.resolutionFilter !== "all") {
    searchParams.set("resolution", options.resolutionFilter);
  }

  for (const value of options.moduleFilters) {
    searchParams.append("moduleFilter", value);
  }

  for (const value of options.issueTypeFilters) {
    searchParams.append("issueTypeFilter", value);
  }

  for (const value of options.priorityFilters) {
    searchParams.append("priorityFilter", value);
  }

  for (const value of options.assigneeFilters) {
    searchParams.append("assigneeFilter", value);
  }

  return searchParams;
}

export function buildIssuesRequestUrl(options: {
  teamId: string;
  projectId: string;
  pageIndex: number;
  pageSize: number;
  search: string;
  resolutionFilter: IssueResolutionFilter;
  moduleFilters: string[];
  issueTypeFilters: string[];
  priorityFilters: IssuePriority[];
  assigneeFilters: IssueAssigneeFilterValue[];
  sorting: SortingState;
}) {
  const searchParams = buildIssuesSearchParams(options);

  return `/api/teams/${options.teamId}/projects/${options.projectId}/issues?${searchParams.toString()}`;
}
