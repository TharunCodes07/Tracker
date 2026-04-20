import type { NextRequest } from "next/server";

import type {
  IssueAssigneeFilterValue,
  IssueListSortDirection,
  IssueListSortField,
  IssuePriority,
  IssueResolutionFilter,
  ListProjectIssuesInput,
} from "@/routes/issues/types";
import {
  GENERAL_MODULE_FILTER_VALUE,
  ISSUE_LIST_SORT_FIELDS,
  ISSUE_PRIORITY_OPTIONS,
  UNCLASSIFIED_ISSUE_TYPE_FILTER_VALUE,
} from "@/routes/issues/types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
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
    case "resolved":
    case "resolved_pending_test":
      return value;
    case "all":
    default:
      return "all";
  }
}

function parsePriorityFilters(values: string[]): IssuePriority[] {
  const allowedPriorities = new Set(ISSUE_PRIORITY_OPTIONS.map((option) => option.value));

  return Array.from(
    new Set(
      values.filter((value): value is IssuePriority =>
        allowedPriorities.has(value as IssuePriority)
      )
    )
  );
}

function parseAssigneeFilters(values: string[]): IssueAssigneeFilterValue[] {
  return Array.from(
    new Set(
      values.filter(
        (value): value is IssueAssigneeFilterValue =>
          value === "current-user" || value === "unassigned"
      )
    )
  );
}

function parseSpecialAwareFilters(values: string[], specialValue: string) {
  const seenValues = new Set<string>();
  const normalizedValues: string[] = [];

  for (const value of values) {
    if (!value || seenValues.has(value)) {
      continue;
    }

    seenValues.add(value);
    normalizedValues.push(value);
  }

  if (seenValues.has(specialValue)) {
    return normalizedValues;
  }

  return normalizedValues.filter((value) => value !== specialValue);
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

  return {
    page: parsePositiveInteger(searchParams.get("page"), DEFAULT_PAGE),
    pageSize: Math.min(parsePositiveInteger(searchParams.get("pageSize"), defaultPageSize), maxPageSize),
    search: searchParams.get("search")?.trim().slice(0, MAX_SEARCH_LENGTH) ?? "",
    resolution: parseResolution(searchParams.get("resolution")),
    moduleFilters: parseSpecialAwareFilters(
      searchParams.getAll("moduleFilter"),
      GENERAL_MODULE_FILTER_VALUE
    ),
    issueTypeFilters: parseSpecialAwareFilters(
      searchParams.getAll("issueTypeFilter"),
      UNCLASSIFIED_ISSUE_TYPE_FILTER_VALUE
    ),
    priorityFilters: parsePriorityFilters(searchParams.getAll("priorityFilter")),
    assigneeFilters: parseAssigneeFilters(searchParams.getAll("assigneeFilter")),
    sortBy: parseSortBy(searchParams.get("sortBy")),
    sortDirection: parseSortDirection(searchParams.get("sortDirection")),
  };
}
