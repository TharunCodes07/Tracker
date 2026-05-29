import {
  ISSUE_ASSIGNMENT_GROUP_OPTIONS,
  type IssueAssignmentGroup,
  type IssueListItem,
} from "@/routes/issues/types";

export function splitBulletItems(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n+/)
    .map((item) => item.replace(/^([-*]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

export function joinBulletItems(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean).join("\n");
}

export function getAssignmentGroupLabel(value: IssueAssignmentGroup | null) {
  return value
    ? ISSUE_ASSIGNMENT_GROUP_OPTIONS.find((option) => option.value === value)?.label ?? value
    : null;
}

export function getIssueAssignmentLabel(issue: IssueListItem) {
  return issue.assigneeName ?? issue.assignmentGroupName ?? "Unassigned";
}

export function getIssueTesterAssignmentLabel(issue: IssueListItem) {
  return issue.testerAssigneeName ?? issue.testerAssignmentGroupName ?? "Unassigned";
}
