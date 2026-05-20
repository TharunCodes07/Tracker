import type { ComponentType, FormEvent } from "react";

import { ClipboardList, GitBranch, MessageSquareText, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IssueMediaPicker } from "@/components/issues/media/issue-media";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVE_ISSUE_STATUS_OPTIONS,
  DEPLOYMENT_STATUS_OPTIONS,
  DEVELOPMENT_STATUS_OPTIONS,
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  type DeploymentStatus,
  type DevelopmentStatus,
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
  const parentCandidates = issues.filter((issue) => issue.id !== editingIssue?.id);
  const assigneeMembers = currentUserId
    ? workspace.members.filter((member) => member.userId !== currentUserId)
    : workspace.members;

  function updateForm(values: Partial<IssueFormState>) {
    onChange({ ...form, ...values });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-hidden p-0 sm:max-w-5xl">
        <form className="flex max-h-[92svh] min-h-0 flex-col" onSubmit={onSubmit}>
          <DialogHeader className="relative shrink-0 border-b border-border/70 px-5 py-4 pr-14">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/80 to-cyan-400/80" />
            <DialogTitle className="text-xl tracking-tight">
              {editingIssue ? "Edit issue" : "Create issue"}
            </DialogTitle>
            <DialogDescription>
              Keep the core issue clear first, then attach ownership, planning, and test details.
            </DialogDescription>
          </DialogHeader>

          <div className="tracker-thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
              <section className="space-y-4">
                <SectionHeader icon={ClipboardList} title="Issue" />
                <Field label="Title">
                  <Textarea
                    value={form.title}
                    onChange={(event) => updateForm({ title: event.target.value })}
                    placeholder="Short, specific issue title"
                    rows={3}
                    required
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={form.description}
                    onChange={(event) => updateForm({ description: event.target.value })}
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
                          parentIssueId: value === "subtask" ? form.parentIssueId : NONE_VALUE,
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
                      onValueChange={(value) => updateForm({ status: value as IssueStatus })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVE_ISSUE_STATUS_OPTIONS.map((status) => (
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
                      onValueChange={(value) => updateForm({ priority: value as IssuePriority })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_PRIORITY_OPTIONS.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </section>

              <section className="space-y-4">
                <SectionHeader icon={GitBranch} title="Planning" />
                <div className="grid gap-3 sm:grid-cols-2">
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
                                component.id === form.componentId && component.moduleId === value
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
                          <SelectItem key={moduleItem.id} value={moduleItem.id}>
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
                          (component) => component.id === value
                        );
                        updateForm({
                          componentId: value,
                          moduleId: selectedComponent?.moduleId ?? form.moduleId,
                        });
                      }}
                      disabled={componentsForForm.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>No component</SelectItem>
                        {componentsForForm.map((component) => (
                          <SelectItem key={component.id} value={component.id}>
                            {component.moduleName} / {component.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Epic">
                    <Select value={form.epicId} onValueChange={(value) => updateForm({ epicId: value })}>
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
                      onValueChange={(value) => updateForm({ parentIssueId: value })}
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
                      onValueChange={(value) => updateForm({ sprintId: value })}
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
                      onValueChange={(value) => updateForm({ releaseId: value })}
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

                <SectionHeader icon={UserRound} title="People" />
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <Field label="Assignee">
                    <Select
                      value={form.assigneeId}
                      onValueChange={(value) => updateForm({ assigneeId: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                        {currentUserId ? <SelectItem value={currentUserId}>Me</SelectItem> : null}
                        {assigneeMembers.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Reporter">
                    <Select
                      value={form.reporterId}
                      onValueChange={(value) => updateForm({ reporterId: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Current user</SelectItem>
                        {workspace.members.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Tested By">
                    <Select
                      value={form.testedById}
                      onValueChange={(value) => updateForm({ testedById: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Not tested</SelectItem>
                        {workspace.members.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </section>
            </div>

            <section className="mt-6 space-y-4 border-t border-border/70 pt-5">
              <IssueMediaPicker
                issueId={editingIssue?.id ?? "__new_issue__"}
                media={form.media}
                mediaFiles={form.mediaFiles}
                removeMediaIds={form.removeMediaIds}
                disabled={pending}
                onChange={(patch) => updateForm(patch)}
              />

              <SectionHeader icon={MessageSquareText} title="Notes and delivery" />
              <div className="grid gap-3 lg:grid-cols-2">
                <Field label="Comments">
                  <Textarea
                    value={form.comments}
                    onChange={(event) => updateForm({ comments: event.target.value })}
                    placeholder="Discussion notes, QA notes, or follow-up comments."
                    rows={4}
                  />
                </Field>
                <Field label="Remark">
                  <Textarea
                    value={form.remark}
                    onChange={(event) => updateForm({ remark: event.target.value })}
                    placeholder="Internal note, validation result, or resolution summary."
                    rows={4}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Fixed Date">
                  <Input
                    type="date"
                    value={form.fixedDate}
                    onChange={(event) => updateForm({ fixedDate: event.target.value })}
                  />
                </Field>
                <Field label="Development">
                  <Select
                    value={form.developmentStatus}
                    onValueChange={(value) =>
                      updateForm({ developmentStatus: value as DevelopmentStatus })
                    }
                  >
                    <SelectTrigger className="w-full">
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
                      updateForm({ deploymentStatus: value as DeploymentStatus })
                    }
                  >
                    <SelectTrigger className="w-full">
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
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : editingIssue ? "Save issue" : "Create issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
