import type { NextRequest } from "next/server";

import type {
  IssueAssigneeFilterValue,
  IssueListSortDirection,
  IssueListSortField,
  IssuePriority,
  IssueReporterFilterValue,
  IssueResolutionFilter,
  IssueStatus,
  IssueTestedByFilterValue,
  IssueType,
  ListProjectIssuesInput,
} from "@/routes/issues/types";
import {
  ISSUE_LIST_SORT_FIELDS,
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
} from "@/routes/issues/types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 250;
const MAX_SEARCH_LENGTH = 120;

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function parseSortBy(value: string | null): IssueListSortField {
  if (!value) {
    return "updatedAt";
  }

  return (ISSUE_LIST_SORT_FIELDS as readonly string[]).includes(value)
    ? (value as IssueListSortField)
    : "updatedAt";
}

function parseSortDirection(value: string | null): IssueListSortDirection {
  return value === "asc" ? "asc" : "desc";
}

function parseResolution(value: string | null): IssueResolutionFilter {
  switch (value) {
    case "open":
    case "review":
    case "resolved":
    case "reopened":
    case "all":
      return value;
    default:
      return "all";
  }
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function parseIssueTypes(values: string[]): IssueType[] {
  const allowed = new Set(ISSUE_TYPE_OPTIONS.map((option) => option.value));

  return uniqueStrings(values).filter((value): value is IssueType =>
    allowed.has(value as IssueType)
  );
}

function parseStatuses(values: string[]): IssueStatus[] {
  const allowed = new Set<string>(ISSUE_STATUS_OPTIONS.map((option) => option.value));

  return uniqueStrings(values).filter((value): value is IssueStatus =>
    allowed.has(value)
  );
}

function parsePriorities(values: string[]): IssuePriority[] {
  const allowed = new Set(ISSUE_PRIORITY_OPTIONS.map((option) => option.value));

  return uniqueStrings(values).filter((value): value is IssuePriority =>
    allowed.has(value as IssuePriority)
  );
}

function parseAssigneeFilters(values: string[]): IssueAssigneeFilterValue[] {
  return uniqueStrings(values).filter(
    (value): value is IssueAssigneeFilterValue =>
      value === "current-user" || value === "unassigned"
  );
}

function parseReporterFilters(values: string[]): IssueReporterFilterValue[] {
  return uniqueStrings(values).filter(
    (value): value is IssueReporterFilterValue => value === "current-user"
  );
}

function parseTestedByFilters(values: string[]): IssueTestedByFilterValue[] {
  return uniqueStrings(values).filter(
    (value): value is IssueTestedByFilterValue =>
      value === "current-user" || value === "untested"
  );
}

export function readListProjectIssuesInput(
  request: NextRequest,
  options?: {
    defaultPageSize?: number;
    maxPageSize?: number;
  }
): ListProjectIssuesInput {
  const { searchParams } = request.nextUrl;
  const defaultPageSize = options?.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const maxPageSize = options?.maxPageSize ?? MAX_PAGE_SIZE;
  const issueTypeFilters = parseIssueTypes([
    ...searchParams.getAll("typeFilter"),
    ...searchParams.getAll("issueTypeFilter"),
  ]);
  const moduleFilters = uniqueStrings(searchParams.getAll("moduleFilter"));
  const componentFilters = uniqueStrings(searchParams.getAll("componentFilter"));

  return {
    page: parsePositiveInteger(searchParams.get("page"), DEFAULT_PAGE),
    pageSize: Math.min(parsePositiveInteger(searchParams.get("pageSize"), defaultPageSize), maxPageSize),
    search: searchParams.get("search")?.trim().slice(0, MAX_SEARCH_LENGTH) ?? "",
    resolution: parseResolution(searchParams.get("resolution")),
    typeFilters: issueTypeFilters,
    statusFilters: parseStatuses(searchParams.getAll("statusFilter")),
    moduleFilters,
    componentFilters,
    epicFilters: uniqueStrings(searchParams.getAll("epicFilter")),
    releaseFilters: uniqueStrings(searchParams.getAll("releaseFilter")),
    sprintFilters: uniqueStrings(searchParams.getAll("sprintFilter")),
    priorityFilters: parsePriorities(searchParams.getAll("priorityFilter")),
    assigneeFilters: parseAssigneeFilters(searchParams.getAll("assigneeFilter")),
    reporterFilters: parseReporterFilters(searchParams.getAll("reporterFilter")),
    testedByFilters: parseTestedByFilters(searchParams.getAll("testedByFilter")),
    backlogOnly: searchParams.get("backlog") === "true",
    sortBy: parseSortBy(searchParams.get("sortBy")),
    sortDirection: parseSortDirection(searchParams.get("sortDirection")),
    issueTypeFilters,
  };
}
