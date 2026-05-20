import type {
  DeploymentStatus,
  DevelopmentStatus,
  EpicStatus,
  IssuePriority,
  IssueStatus,
  IssueType,
  IssueMediaListItem,
  ProjectReleaseStatus,
  SprintStatus,
} from "@/routes/issues/types";

export type ProjectWorkflowView =
  | "summary"
  | "board"
  | "issues"
  | "backlog"
  | "modules"
  | "components"
  | "releases"
  | "release-detail"
  | "epics"
  | "epic-detail"
  | "sprints"
  | "sprint-detail"
  | "reports"
  | "settings"
  | "issue";

export interface IssueFormState {
  title: string;
  description: string;
  issueType: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  moduleId: string;
  componentId: string;
  epicId: string;
  sprintId: string;
  releaseId: string;
  assigneeId: string;
  reporterId: string;
  testedById: string;
  parentIssueId: string;
  comments: string;
  remark: string;
  fixedDate: string;
  developmentStatus: DevelopmentStatus;
  deploymentStatus: DeploymentStatus;
  media: IssueMediaListItem[];
  mediaFiles: File[];
  removeMediaIds: string[];
}

export interface ModuleFormState {
  name: string;
  description: string;
}

export interface ComponentFormState extends ModuleFormState {
  moduleId: string;
}

export interface EpicFormState {
  title: string;
  description: string;
  status: EpicStatus;
  startDate: string;
  targetDate: string;
}

export interface ReleaseFormState {
  name: string;
  description: string;
  status: ProjectReleaseStatus;
  startDate: string;
  targetDate: string;
}

export interface SprintFormState {
  name: string;
  goal: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
}
