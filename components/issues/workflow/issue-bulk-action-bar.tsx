import { useMemo, useState } from "react";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  IssuePriority,
  IssueStatus,
  ProjectComponentListItem,
  ProjectEpicListItem,
  ProjectModuleListItem,
  ProjectReleaseListItem,
  ProjectSprintListItem,
} from "@/routes/issues/types";
import {
  ACTIVE_ISSUE_STATUS_OPTIONS,
  DEPLOYMENT_STATUS_OPTIONS,
  DEVELOPMENT_STATUS_OPTIONS,
  ISSUE_PRIORITY_OPTIONS,
} from "@/routes/issues/types";
import type { TeamMemberListItem } from "@/routes/teams/types";

import { NONE_VALUE } from "./constants";
import type { IssueFormState } from "./types";

export type IssueBulkPatch = Partial<
  Pick<
    IssueFormState,
    | "status"
    | "priority"
    | "moduleId"
    | "componentId"
    | "epicId"
    | "sprintId"
    | "releaseId"
    | "assigneeId"
    | "testedById"
    | "developmentStatus"
    | "deploymentStatus"
  >
>;

type BulkAction =
  | "status"
  | "priority"
  | "moduleId"
  | "componentId"
  | "epicId"
  | "sprintId"
  | "releaseId"
  | "assigneeId"
  | "testedById"
  | "developmentStatus"
  | "deploymentStatus";

interface BulkOption {
  value: string;
  label: string;
}

const ACTION_OPTIONS: { value: BulkAction; label: string }[] = [
  { value: "status", label: "Change status" },
  { value: "priority", label: "Change priority" },
  { value: "moduleId", label: "Assign module" },
  { value: "componentId", label: "Assign component" },
  { value: "epicId", label: "Move to epic" },
  { value: "sprintId", label: "Move to sprint" },
  { value: "releaseId", label: "Move to release" },
  { value: "assigneeId", label: "Assign to" },
  { value: "testedById", label: "Set tested by" },
  { value: "developmentStatus", label: "Development" },
  { value: "deploymentStatus", label: "Deployment" },
];

function nullableOptions(items: BulkOption[], emptyLabel: string) {
  return [{ value: NONE_VALUE, label: emptyLabel }, ...items];
}

function buildTargetOptions(options: {
  action: BulkAction;
  modules: ProjectModuleListItem[];
  components: ProjectComponentListItem[];
  epics: ProjectEpicListItem[];
  sprints: ProjectSprintListItem[];
  releases: ProjectReleaseListItem[];
  members: TeamMemberListItem[];
}): BulkOption[] {
  switch (options.action) {
    case "status":
      return ACTIVE_ISSUE_STATUS_OPTIONS.map((status) => ({ value: status.value, label: status.label }));
    case "priority":
      return ISSUE_PRIORITY_OPTIONS.map((priority) => ({
        value: priority.value,
        label: priority.label,
      }));
    case "moduleId":
      return nullableOptions(
        options.modules.map((moduleItem) => ({ value: moduleItem.id, label: moduleItem.name })),
        "No module"
      );
    case "componentId":
      return nullableOptions(
        options.components.map((component) => ({
          value: component.id,
          label: `${component.moduleName} / ${component.name}`,
        })),
        "No component"
      );
    case "epicId":
      return nullableOptions(
        options.epics.map((epic) => ({ value: epic.id, label: epic.name })),
        "No epic"
      );
    case "sprintId":
      return nullableOptions(
        options.sprints.map((sprint) => ({ value: sprint.id, label: sprint.name })),
        "Backlog"
      );
    case "releaseId":
      return nullableOptions(
        options.releases.map((release) => ({ value: release.id, label: release.name })),
        "No release"
      );
    case "assigneeId":
      return nullableOptions(
        options.members.map((member) => ({ value: member.userId, label: member.name })),
        "Unassigned"
      );
    case "testedById":
      return nullableOptions(
        options.members.map((member) => ({ value: member.userId, label: member.name })),
        "Not tested"
      );
    case "developmentStatus":
      return DEVELOPMENT_STATUS_OPTIONS.map((status) => ({
        value: status.value,
        label: status.label,
      }));
    case "deploymentStatus":
      return DEPLOYMENT_STATUS_OPTIONS.map((status) => ({
        value: status.value,
        label: status.label,
      }));
  }
}

export function IssueBulkActionBar({
  selectedCount,
  pending,
  modules,
  components,
  epics,
  sprints,
  releases,
  members,
  onApply,
  onClearSelection,
}: {
  selectedCount: number;
  pending: boolean;
  modules: ProjectModuleListItem[];
  components: ProjectComponentListItem[];
  epics: ProjectEpicListItem[];
  sprints: ProjectSprintListItem[];
  releases: ProjectReleaseListItem[];
  members: TeamMemberListItem[];
  onApply: (patch: IssueBulkPatch) => void;
  onClearSelection: () => void;
}) {
  const [action, setAction] = useState<BulkAction>("status");
  const targetOptions = useMemo(
    () =>
      buildTargetOptions({
        action,
        modules,
        components,
        epics,
        sprints,
        releases,
        members,
      }),
    [action, components, epics, members, modules, releases, sprints]
  );
  const [target, setTarget] = useState(targetOptions[0]?.value ?? "");
  const selectedTarget = targetOptions.some((option) => option.value === target)
    ? target
    : targetOptions[0]?.value ?? "";

  function handleActionChange(value: string) {
    const nextAction = value as BulkAction;
    const nextOptions = buildTargetOptions({
      action: nextAction,
      modules,
      components,
      epics,
      sprints,
      releases,
      members,
    });

    setAction(nextAction);
    setTarget(nextOptions[0]?.value ?? "");
  }

  function handleApply() {
    if (!selectedTarget) return;

    if (action === "status") {
      onApply({ status: selectedTarget as IssueStatus });
      return;
    }

    if (action === "priority") {
      onApply({ priority: selectedTarget as IssuePriority });
      return;
    }

    if (action === "moduleId") {
      onApply({ moduleId: selectedTarget, componentId: NONE_VALUE });
      return;
    }

    switch (action) {
      case "componentId":
        onApply({ componentId: selectedTarget });
        return;
      case "epicId":
        onApply({ epicId: selectedTarget });
        return;
      case "sprintId":
        onApply({ sprintId: selectedTarget });
        return;
      case "releaseId":
        onApply({ releaseId: selectedTarget });
        return;
      case "assigneeId":
        onApply({ assigneeId: selectedTarget });
        return;
      case "testedById":
        onApply({ testedById: selectedTarget });
        return;
      case "developmentStatus":
        onApply({ developmentStatus: selectedTarget as IssueFormState["developmentStatus"] });
        return;
      case "deploymentStatus":
        onApply({ deploymentStatus: selectedTarget as IssueFormState["deploymentStatus"] });
        return;
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium">{selectedCount} selected</div>
        <div className="text-xs text-muted-foreground">
          Bulk changes update the selected issues in this project.
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={action} onValueChange={handleActionChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedTarget}
          onValueChange={setTarget}
          disabled={targetOptions.length === 0}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Choose target" />
          </SelectTrigger>
          <SelectContent>
            {targetOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button type="button" onClick={handleApply} disabled={pending || !selectedTarget}>
            <Check className="h-4 w-4" />
            Apply
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClearSelection}
            disabled={pending}
            aria-label="Clear selected issues"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
