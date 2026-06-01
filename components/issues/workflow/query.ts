import type { SortingState } from "@tanstack/react-table";

import type {
  IssueAssigneeFilterValue,
  IssuePriority,
  IssueStatus,
  IssueType,
} from "@/routes/issues/types";

import type { ProjectWorkflowView } from "./types";

export function buildIssueListSearchParams(options: {
  activeView: ProjectWorkflowView;
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  search: string;
  typeFilters: IssueType[];
  statusFilters: IssueStatus[];
  moduleFilters: string[];
  componentFilters: string[];
  epicFilters: string[];
  releaseFilters: string[];
  sprintFilters: string[];
  priorityFilters: IssuePriority[];
  assignmentFilter: IssueAssigneeFilterValue | "all";
}) {
  const [activeSort] = options.sorting;
  const searchParams = new URLSearchParams({
    page: String(options.pageIndex + 1),
    pageSize: String(options.pageSize),
    sortBy: activeSort?.id ?? "updatedAt",
    sortDirection: activeSort?.desc ? "desc" : "asc",
  });

  if (options.search.trim()) searchParams.set("search", options.search.trim());
  if (options.activeView === "backlog") searchParams.set("backlog", "true");
  options.typeFilters.forEach((value) =>
    searchParams.append("typeFilter", value),
  );
  options.statusFilters.forEach((value) =>
    searchParams.append("statusFilter", value),
  );
  options.moduleFilters.forEach((value) =>
    searchParams.append("moduleFilter", value),
  );
  options.componentFilters.forEach((value) =>
    searchParams.append("componentFilter", value),
  );
  options.epicFilters.forEach((value) =>
    searchParams.append("epicFilter", value),
  );
  options.releaseFilters.forEach((value) =>
    searchParams.append("releaseFilter", value),
  );
  options.sprintFilters.forEach((value) =>
    searchParams.append("sprintFilter", value),
  );
  options.priorityFilters.forEach((value) =>
    searchParams.append("priorityFilter", value),
  );
  if (options.assignmentFilter !== "all") {
    searchParams.append("assigneeFilter", options.assignmentFilter);
  }

  return searchParams;
}
