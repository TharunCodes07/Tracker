import { type ComponentType, type FormEvent } from "react";

import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  GitBranch,
  MessageSquareText,
  Plus,
  RotateCcw,
  TestTube2,
  Trash2,
  UserRound,
} from "lucide-react";

import { IssueMediaPicker } from "@/components/issues/media/issue-media";
import {
  joinBulletItems,
  splitBulletItems,
} from "@/components/issues/shared/issue-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEPLOYMENT_STATUS_OPTIONS,
  DEVELOPMENT_STATUS_OPTIONS,
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  type DeploymentStatus,
  type DevelopmentStatus,
  type IssueAssignmentGroup,
  type IssueListItem,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
  type ProjectComponentListItem,
  type ProjectIssuesWorkspaceResponse,
} from "@/routes/issues/types";

import { NONE_VALUE } from "../constants";
import type { IssueFormState } from "../types";
import { Field } from "../ui";

type TeamMember = ProjectIssuesWorkspaceResponse["members"][number];
type AssignmentRole = "developer" | "tester";

export function IssueEditorDialog({
  open,
  pending,
  form,
  workspace,
  issues,
  editingIssue,
  componentsForForm,
  currentUserId,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  form: IssueFormState;
  workspace: ProjectIssuesWorkspaceResponse;
  issues: IssueListItem[];
  editingIssue: IssueListItem | null;
  componentsForForm: ProjectComponentListItem[];
  currentUserId: string | null;
  onOpenChange: (open: boolean) => void;
  onChange: (form: IssueFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const parentCandidates = issues.filter(
    (issue) => issue.id !== editingIssue?.id,
  );
  const developerMembers = workspace.members.filter((member) =>
    memberHasRole(member, "developer"),
  );
  const testerMembers = workspace.members.filter((member) =>
    memberHasRole(member, "tester"),
  );
  const currentMember = workspace.members.find(
    (member) => member.userId === currentUserId,
  );
  const reporterFallbackLabel = currentMember
    ? `${currentMember.name} (default)`
    : "Signed-in reporter";
  const developmentAssignmentValue = getRoleAssignmentValue(
    form,
    workspace.members,
    "developer",
  );
  const testingAssignmentValue = getRoleAssignmentValue(
    form,
    workspace.members,
    "tester",
  );
  const canReopen = Boolean(
    editingIssue && canReopenIssue(editingIssue, form.status),
  );

  function updateForm(values: Partial<IssueFormState>) {
    onChange({ ...form, ...values });
  }

  function updateStatus(status: IssueStatus) {
    updateForm({ status, reopen: false });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-hidden p-0 sm:max-w-6xl">
        <form
          className="flex max-h-[92svh] min-h-0 flex-col"
          onSubmit={onSubmit}
        >
          <DialogHeader className="relative shrink-0 border-b border-border/70 px-5 py-4 pr-14">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/80 to-cyan-400/80" />
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {editingIssue ? (
                    <Badge variant="secondary" className="font-mono">
                      {editingIssue.key}
                    </Badge>
                  ) : null}
                </div>
                <DialogTitle className="text-xl tracking-tight">
                  {editingIssue ? "Edit issue" : "Create issue"}
                </DialogTitle>
                <DialogDescription>
                  Track the lifecycle as status, then use development and
                  deployment to show the exact handoff point.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="tracker-thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <section id="issue-editor-delivery" className="mb-5">
              <WorkflowStrip
                form={form}
                onStatusChange={updateStatus}
                onDevelopmentChange={(developmentStatus) =>
                  updateForm({ developmentStatus, reopen: false })
                }
                onDeploymentChange={(deploymentStatus) =>
                  updateForm({ deploymentStatus, reopen: false })
                }
              />
            </section>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <main className="min-w-0 space-y-5">
                <section id="issue-editor-issue" className="space-y-4">
                  <SectionHeader icon={ClipboardList} title="Issue" />
                  <Field label="Title">
                    <Textarea
                      value={form.title}
                      onChange={(event) =>
                        updateForm({ title: event.target.value })
                      }
                      placeholder="Short, specific issue title"
                      rows={3}
                      required
                    />
                  </Field>
                  <Field label="Description">
                    <Textarea
                      value={form.description}
                      onChange={(event) =>
                        updateForm({ description: event.target.value })
                      }
                      placeholder="Expected behavior, reproduction notes, acceptance criteria, or context."
                      rows={7}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Type">
                      <Select
                        value={form.issueType}
                        onValueChange={(value) =>
                          updateForm({
                            issueType: value as IssueType,
                            parentIssueId:
                              value === "subtask"
                                ? form.parentIssueId
                                : NONE_VALUE,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ISSUE_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Status">
                      <Select
                        value={form.status}
                        onValueChange={(value) =>
                          updateStatus(value as IssueStatus)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ISSUE_STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Priority">
                      <Select
                        value={form.priority}
                        onValueChange={(value) =>
                          updateForm({ priority: value as IssuePriority })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ISSUE_PRIORITY_OPTIONS.map((priority) => (
                            <SelectItem
                              key={priority.value}
                              value={priority.value}
                            >
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </section>

                <section
                  id="issue-editor-notes"
                  className="space-y-4 border-t border-border/70 pt-5"
                >
                  <SectionHeader icon={MessageSquareText} title="Notes" />
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Field label="Comments">
                      <BulletListEditor
                        value={form.comments}
                        onChange={(comments) => updateForm({ comments })}
                        placeholder="Discussion notes, QA notes, or follow-up comments."
                      />
                    </Field>
                    <Field label="Remarks">
                      <BulletListEditor
                        value={form.remark}
                        onChange={(remark) => updateForm({ remark })}
                        placeholder="Internal note, validation result, or resolution summary."
                      />
                    </Field>
                  </div>
                  <IssueMediaPicker
                    issueId={editingIssue?.id ?? "__new_issue__"}
                    media={form.media}
                    mediaFiles={form.mediaFiles}
                    removeMediaIds={form.removeMediaIds}
                    disabled={pending}
                    onChange={(patch) => updateForm(patch)}
                  />
                </section>
              </main>

              <aside className="grid content-start gap-5 md:grid-cols-2 xl:grid-cols-1">
                <section id="issue-editor-planning" className="space-y-4">
                  <SectionHeader icon={GitBranch} title="Planning" />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <Field label="Module">
                      <Select
                        value={form.moduleId}
                        onValueChange={(value) =>
                          updateForm({
                            moduleId: value,
                            componentId:
                              value === NONE_VALUE ||
                              workspace.components.some(
                                (component) =>
                                  component.id === form.componentId &&
                                  component.moduleId === value,
                              )
                                ? form.componentId
                                : NONE_VALUE,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>No module</SelectItem>
                          {workspace.modules.map((moduleItem) => (
                            <SelectItem
                              key={moduleItem.id}
                              value={moduleItem.id}
                            >
                              {moduleItem.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Component">
                      <Select
                        value={form.componentId}
                        onValueChange={(value) => {
                          const selectedComponent = workspace.components.find(
                            (component) => component.id === value,
                          );
                          updateForm({
                            componentId: value,
                            moduleId:
                              selectedComponent?.moduleId ?? form.moduleId,
                          });
                        }}
                        disabled={componentsForForm.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>
                            No component
                          </SelectItem>
                          {componentsForForm.map((component) => (
                            <SelectItem key={component.id} value={component.id}>
                              {component.moduleName} / {component.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Epic">
                      <Select
                        value={form.epicId}
                        onValueChange={(value) => updateForm({ epicId: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>No epic</SelectItem>
                          {workspace.epics.map((epic) => (
                            <SelectItem key={epic.id} value={epic.id}>
                              {epic.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Parent issue">
                      <Select
                        value={form.parentIssueId}
                        onValueChange={(value) =>
                          updateForm({ parentIssueId: value })
                        }
                        disabled={form.issueType !== "subtask"}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>No parent</SelectItem>
                          {parentCandidates.map((issue) => (
                            <SelectItem key={issue.id} value={issue.id}>
                              {issue.key} {issue.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Sprint">
                      <Select
                        value={form.sprintId}
                        onValueChange={(value) =>
                          updateForm({ sprintId: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Backlog</SelectItem>
                          {workspace.sprints.map((sprint) => (
                            <SelectItem key={sprint.id} value={sprint.id}>
                              {sprint.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Release">
                      <Select
                        value={form.releaseId}
                        onValueChange={(value) =>
                          updateForm({ releaseId: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>No release</SelectItem>
                          {workspace.releases.map((release) => (
                            <SelectItem key={release.id} value={release.id}>
                              {release.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </section>

                <section id="issue-editor-owners" className="space-y-4">
                  <SectionHeader icon={UserRound} title="Assignments" />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <Field label="Developer">
                      <RoleAssignmentSelect
                        role="developer"
                        value={developmentAssignmentValue}
                        members={developerMembers}
                        currentUserId={currentUserId}
                        onChange={(value) =>
                          updateForm(
                            parseRoleAssignmentValue(value, "developer"),
                          )
                        }
                      />
                    </Field>
                    <Field label="Tester">
                      <RoleAssignmentSelect
                        role="tester"
                        value={testingAssignmentValue}
                        members={testerMembers}
                        currentUserId={currentUserId}
                        onChange={(value) =>
                          updateForm(parseRoleAssignmentValue(value, "tester"))
                        }
                      />
                    </Field>
                    <Field label="Reporter">
                      <Select
                        value={form.reporterId}
                        onValueChange={(value) =>
                          updateForm({ reporterId: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>
                            {reporterFallbackLabel}
                          </SelectItem>
                          {workspace.members.map((member) => (
                            <SelectItem
                              key={member.userId}
                              value={member.userId}
                            >
                              {formatMemberName(member, currentUserId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </section>
              </aside>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/70 bg-background/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              data-intent={canReopen ? "reopen" : undefined}
            >
              {canReopen ? <RotateCcw className="h-3.5 w-3.5" /> : null}
              {pending
                ? "Saving..."
                : canReopen
                  ? "Reopen issue"
                  : editingIssue
                    ? "Save issue"
                    : "Create issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowStrip({
  form,
  onStatusChange,
  onDevelopmentChange,
  onDeploymentChange,
}: {
  form: IssueFormState;
  onStatusChange: (status: IssueStatus) => void;
  onDevelopmentChange: (status: DevelopmentStatus) => void;
  onDeploymentChange: (status: DeploymentStatus) => void;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="grid gap-2 md:grid-cols-4">
        <WorkflowStep
          icon={AlertCircle}
          label="To Do"
          active={form.status === "todo"}
        />
        <WorkflowStep
          icon={ClipboardList}
          label="In Progress"
          active={form.status === "in_progress"}
        />
        <WorkflowStep
          icon={TestTube2}
          label="In Review"
          active={form.status === "review"}
        />
        <WorkflowStep
          icon={CheckCircle2}
          label="Fixed"
          active={form.status === "fixed"}
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field label="Status">
          <Select
            value={form.status}
            onValueChange={(value) => onStatusChange(value as IssueStatus)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ISSUE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Development">
          <Select
            value={form.developmentStatus}
            onValueChange={(value) =>
              onDevelopmentChange(value as DevelopmentStatus)
            }
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEVELOPMENT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Deployment">
          <Select
            value={form.deploymentStatus}
            onValueChange={(value) =>
              onDeploymentChange(value as DeploymentStatus)
            }
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPLOYMENT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </section>
  );
}

function WorkflowStep({
  icon: Icon,
  label,
  active,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        active
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border/70 bg-background text-muted-foreground"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </div>
  );
}

function RoleAssignmentSelect({
  role,
  value,
  members,
  currentUserId,
  onChange,
}: {
  role: AssignmentRole;
  value: string;
  members: TeamMember[];
  currentUserId: string | null;
  onChange: (value: string) => void;
}) {
  const teamValue = role === "developer" ? "team:development" : "team:testing";
  const teamLabel = role === "developer" ? "Development team" : "Testing team";
  const groupLabel = role === "developer" ? "Developer" : "Tester";

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-72">
        <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>{groupLabel}</SelectLabel>
          <SelectItem value={teamValue}>{teamLabel}</SelectItem>
          {members.map((member) => (
            <SelectItem
              key={`${role}:${member.userId}`}
              value={`user:${role}:${member.userId}`}
            >
              {formatMemberName(member, currentUserId)}
            </SelectItem>
          ))}
        </SelectGroup>
        {members.length === 0 ? (
          <SelectItem value={`__no_${role}_members__`} disabled>
            No {role === "developer" ? "developer" : "tester"} members
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
}

function memberHasRole(member: TeamMember, role: AssignmentRole) {
  return member.roles.includes(role);
}

function formatMemberName(member: TeamMember, currentUserId: string | null) {
  return member.userId === currentUserId ? `${member.name} (you)` : member.name;
}

function inferAssignmentGroup(
  member: TeamMember | undefined,
  role: AssignmentRole,
): IssueAssignmentGroup | null {
  if (!member || !memberHasRole(member, role)) {
    return null;
  }

  return role === "developer" ? "development" : "testing";
}

function getRoleAssignmentValue(
  form: IssueFormState,
  members: TeamMember[],
  role: AssignmentRole,
) {
  const assigneeId =
    role === "developer" ? form.assigneeId : form.testerAssigneeId;
  const assigneeGroup =
    role === "developer" ? form.assigneeGroup : form.testerAssigneeGroup;
  const expectedGroup = role === "developer" ? "development" : "testing";

  if (assigneeId !== NONE_VALUE) {
    const member = members.find((item) => item.userId === assigneeId);
    const group =
      assigneeGroup !== NONE_VALUE
        ? assigneeGroup
        : inferAssignmentGroup(member, role);

    if (group === expectedGroup) {
      return `user:${role}:${assigneeId}`;
    }
  }

  if (assigneeGroup === expectedGroup) {
    return `team:${expectedGroup}`;
  }

  return NONE_VALUE;
}

function parseRoleAssignmentValue(
  value: string,
  role: AssignmentRole,
): Partial<IssueFormState> {
  const group = role === "developer" ? "development" : "testing";

  if (value === NONE_VALUE) {
    return role === "developer"
      ? {
          assigneeGroup: NONE_VALUE,
          assigneeId: NONE_VALUE,
        }
      : {
          testerAssigneeGroup: NONE_VALUE,
          testerAssigneeId: NONE_VALUE,
        };
  }

  if (value === `team:${group}`) {
    return role === "developer"
      ? {
          assigneeGroup: group,
          assigneeId: NONE_VALUE,
        }
      : {
          testerAssigneeGroup: group,
          testerAssigneeId: NONE_VALUE,
        };
  }

  if (value.startsWith(`user:${role}:`)) {
    const userId = value.replace(`user:${role}:`, "");

    return role === "developer"
      ? {
          assigneeGroup: group,
          assigneeId: userId || NONE_VALUE,
        }
      : {
          testerAssigneeGroup: group,
          testerAssigneeId: userId || NONE_VALUE,
        };
  }

  return {};
}

function canReopenIssue(issue: IssueListItem, nextStatus: IssueStatus) {
  return (
    (issue.status === "review" || issue.status === "fixed") &&
    (nextStatus === "todo" || nextStatus === "in_progress")
  );
}

function BulletListEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const parsedItems = splitBulletItems(value);
  const items = parsedItems.length > 0 ? parsedItems : [""];

  function updateItems(nextItems: string[]) {
    onChange(joinBulletItems(nextItems));
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex min-w-0 items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
          <Input
            value={item}
            onChange={(event) => {
              const nextItems = [...items];
              nextItems[index] = event.target.value;
              updateItems(nextItems);
            }}
            placeholder={index === 0 ? placeholder : ""}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-lg text-muted-foreground hover:text-destructive"
            onClick={() =>
              updateItems(items.filter((_, itemIndex) => itemIndex !== index))
            }
            disabled={items.length === 1 && !item}
            aria-label="Remove bullet point"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => updateItems([...items, ""])}
        className="rounded-full"
      >
        <Plus className="h-3.5 w-3.5" />
        Add point
      </Button>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
        <Icon className="h-4 w-4" />
      </span>
      {title}
    </div>
  );
}
