"use client";

import * as React from "react";
import { format } from "date-fns";
import { Check, Plus, X } from "lucide-react";

import type { IssueFormValues } from "@/components/issues/issue-dialog";
import {
  IssuePriorityBadge,
  IssueReopenedBadge,
  IssueStatusBadge,
} from "@/components/issues/issue-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  type IssueClassListItem,
  type IssueListItem,
  type IssuePriority,
  type IssueStatus,
  type ProjectModuleListItem,
} from "@/routes/issues/types";
import type { TeamMemberListItem } from "@/routes/teams/types";

export const SELECT_NONE_VALUE = "__none__";
export const NEW_ROW_ID = "__new__";

type SelectCellOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function canSaveDraft(values: IssueFormValues) {
  return values.title.trim().length > 0 && values.issueClassId.trim().length > 0;
}

export function stopCellEvent(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function AutoFocusTextarea({
  autoFocusAndSelect,
  ...props
}: React.ComponentProps<typeof Textarea> & {
  autoFocusAndSelect?: boolean;
}) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  React.useLayoutEffect(() => {
    if (!autoFocusAndSelect) {
      return;
    }

    ref.current?.focus();
    ref.current?.select();
  }, [autoFocusAndSelect]);

  return <Textarea ref={ref} {...props} />;
}

export function AutoFocusInput({
  autoFocusAndSelect,
  ...props
}: React.ComponentProps<typeof Input> & {
  autoFocusAndSelect?: boolean;
}) {
  const ref = React.useRef<HTMLInputElement | null>(null);

  React.useLayoutEffect(() => {
    if (!autoFocusAndSelect) {
      return;
    }

    ref.current?.focus();
    ref.current?.select();
  }, [autoFocusAndSelect]);

  return <Input ref={ref} {...props} />;
}

export function SelectCell({
  value,
  onChange,
  disabled,
  options,
  label,
  placeholder,
  autoOpen,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: SelectCellOption[];
  label: string;
  placeholder?: string;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(Boolean(autoOpen && !disabled));

  return (
    <div onClick={stopCellEvent}>
      <Select
        value={value || SELECT_NONE_VALUE}
        onValueChange={(nextValue) =>
          onChange(nextValue === SELECT_NONE_VALUE ? "" : nextValue)
        }
        disabled={disabled}
        open={open}
        onOpenChange={setOpen}
      >
        <SelectTrigger
          aria-label={label}
          className="h-8 w-full bg-background"
          onClick={stopCellEvent}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent align="start" className="z-[60]">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function getStickyColumnClassName(columnId: string, isHeader = false) {
  if (columnId !== "actions") {
    return "";
  }

  return cn(
    "sticky right-0",
    isHeader
      ? "z-50 bg-muted shadow-[-14px_0_20px_-20px_rgba(15,23,42,0.8)]"
      : "z-30 bg-background/95 shadow-[-14px_0_20px_-20px_rgba(15,23,42,0.75)] backdrop-blur"
  );
}

export function TextCell({ value, fallback }: { value: string | null; fallback: string }) {
  return (
    <div
      className="tracker-thin-scrollbar max-h-24 min-h-8 overflow-y-auto whitespace-pre-wrap text-left text-sm leading-5 text-foreground [overflow-wrap:anywhere]"
      title={value?.trim() ? value : fallback}
    >
      {value?.trim() ? value : <span className="text-muted-foreground">{fallback}</span>}
    </div>
  );
}

export function getModuleDraftPatch(moduleId: string, modules: ProjectModuleListItem[]) {
  const moduleItem = modules.find((item) => item.id === moduleId);

  if (!moduleItem) {
    return {
      mainModuleId: "",
      subModuleId: "",
    };
  }

  return {
    mainModuleId: moduleItem.parentModuleId ?? moduleItem.id,
    subModuleId: moduleItem.parentModuleId ? moduleItem.id : "",
  };
}

function getModuleSelectValue(values: IssueFormValues) {
  return values.subModuleId || values.mainModuleId || "";
}

export function IssueDraftCell({
  columnId,
  values,
  patch,
  issue,
  issueClasses,
  modules,
  members,
  isTarget,
}: {
  columnId: string;
  values: IssueFormValues;
  patch: (values: Partial<IssueFormValues>) => void;
  issue?: IssueListItem;
  issueClasses: IssueClassListItem[];
  modules: ProjectModuleListItem[];
  members: TeamMemberListItem[];
  isTarget: boolean;
}) {
  switch (columnId) {
    case "no":
      return issue ? (
        <span className="tabular-nums text-muted-foreground">#{issue.no}</span>
      ) : (
        <Badge variant="outline">New</Badge>
      );
    case "navigation":
      return (
        <AutoFocusTextarea
          aria-label="Navigation"
          value={values.navigation}
          onChange={(event) => patch({ navigation: event.target.value })}
          onClick={stopCellEvent}
          placeholder="/settings/profile"
          autoFocusAndSelect={isTarget}
          className="h-20 min-h-20 resize-none bg-background"
        />
      );
    case "title":
      return (
        <div className="space-y-2">
          <AutoFocusTextarea
            aria-label="Issue"
            value={values.title}
            onChange={(event) => patch({ title: event.target.value })}
            onClick={stopCellEvent}
            placeholder="Issue"
            required
            autoFocusAndSelect={isTarget}
            className="h-20 min-h-20 resize-none bg-background font-medium"
          />
          <AutoFocusTextarea
            aria-label="Description"
            value={values.description}
            onChange={(event) => patch({ description: event.target.value })}
            onClick={stopCellEvent}
            placeholder="Description"
            className="h-20 min-h-20 resize-none bg-background"
          />
        </div>
      );
    case "issueClassName":
      return (
        <SelectCell
          label="Issue type"
          value={values.issueClassId}
          onChange={(value) => patch({ issueClassId: value })}
          placeholder="Type"
          autoOpen={isTarget}
          options={[
            { value: SELECT_NONE_VALUE, label: "Type", disabled: true },
            ...issueClasses.map((issueClass) => ({
              value: issueClass.id,
              label: issueClass.name,
            })),
          ]}
        />
      );
    case "moduleName":
      return (
        <SelectCell
          label="Module"
          value={getModuleSelectValue(values)}
          onChange={(value) => patch(getModuleDraftPatch(value, modules))}
          autoOpen={isTarget}
          options={[
            { value: SELECT_NONE_VALUE, label: "General" },
            ...modules.map((moduleItem) => ({
              value: moduleItem.id,
              label: moduleItem.displayName,
            })),
          ]}
        />
      );
    case "priority":
      return (
        <SelectCell
          label="Priority"
          value={values.priority}
          onChange={(value) => patch({ priority: value as IssuePriority })}
          autoOpen={isTarget}
          options={ISSUE_PRIORITY_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      );
    case "status":
      return (
        <SelectCell
          label="Status"
          value={values.status}
          onChange={(value) => patch({ status: value as IssueStatus })}
          autoOpen={isTarget}
          options={ISSUE_STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      );
    case "assignedToName":
      return (
        <SelectCell
          label="Assigned to"
          value={values.assignedTo}
          onChange={(value) => patch({ assignedTo: value })}
          autoOpen={isTarget}
          options={[
            { value: SELECT_NONE_VALUE, label: "Unassigned" },
            ...members.map((member) => ({
              value: member.userId,
              label: member.name,
            })),
          ]}
        />
      );
    case "reviewedByName":
      return (
        <SelectCell
          label="Reviewed by"
          value={values.reviewedBy}
          onChange={(value) => patch({ reviewedBy: value })}
          autoOpen={isTarget}
          options={[
            { value: SELECT_NONE_VALUE, label: "No reviewer" },
            ...members.map((member) => ({
              value: member.userId,
              label: member.name,
            })),
          ]}
        />
      );
    case "comments":
      return (
        <AutoFocusTextarea
          aria-label="Comments"
          value={values.comments}
          onChange={(event) => patch({ comments: event.target.value })}
          onClick={stopCellEvent}
          placeholder="Comments"
          autoFocusAndSelect={isTarget}
          className="h-20 min-h-20 resize-none bg-background"
        />
      );
    case "remark":
      return (
        <AutoFocusTextarea
          aria-label="Remarks"
          value={values.remark}
          onChange={(event) => patch({ remark: event.target.value })}
          onClick={stopCellEvent}
          placeholder="Remarks"
          autoFocusAndSelect={isTarget}
          className="h-20 min-h-20 resize-none bg-background"
        />
      );
    case "testedByName":
      return (
        <SelectCell
          label="Tested by"
          value={values.testedBy}
          onChange={(value) => patch({ testedBy: value })}
          autoOpen={isTarget}
          options={[
            { value: SELECT_NONE_VALUE, label: "No tester" },
            ...members.map((member) => ({
              value: member.userId,
              label: member.name,
            })),
          ]}
        />
      );
    case "fixedDate":
      return (
        <AutoFocusInput
          aria-label="Fixed date"
          type="date"
          value={values.fixedDate}
          onChange={(event) => patch({ fixedDate: event.target.value })}
          onClick={stopCellEvent}
          autoFocusAndSelect={isTarget}
          className="bg-background"
        />
      );
    case "development":
      return (
        <Switch
          aria-label="Development"
          checked={values.development}
          onCheckedChange={(checked) => patch({ development: checked })}
          onClick={stopCellEvent}
          autoFocus={isTarget}
        />
      );
    case "deployment":
      return (
        <Switch
          aria-label="Deployment"
          checked={values.deployment}
          onCheckedChange={(checked) => patch({ deployment: checked })}
          onClick={stopCellEvent}
          autoFocus={isTarget}
        />
      );
    case "updatedAt":
      return issue ? (
        format(new Date(issue.updatedAt), "MMM d, yyyy")
      ) : (
        <span className="text-muted-foreground">After save</span>
      );
    case "actions":
    default:
      return null;
  }
}

export function IssueDisplayCell({
  columnId,
  issue,
}: {
  columnId: string;
  issue: IssueListItem;
}) {
  switch (columnId) {
    case "no":
      return <span className="tabular-nums text-muted-foreground">#{issue.no}</span>;
    case "navigation":
      return <TextCell value={issue.navigation} fallback="No navigation" />;
    case "title":
      return (
        <div className="space-y-1">
          <TextCell value={issue.title} fallback="Untitled issue" />
          <div className="border-t border-border/50 pt-1">
            <TextCell value={issue.description} fallback="No description" />
          </div>
        </div>
      );
    case "issueClassName":
      return <Badge variant="secondary">{issue.issueClassName ?? "Unclassified"}</Badge>;
    case "moduleName":
      return <TextCell value={issue.moduleName} fallback="General" />;
    case "priority":
      return <IssuePriorityBadge priority={issue.priority} />;
    case "status":
      return (
        <div className="flex flex-col items-center gap-1">
          <IssueStatusBadge status={issue.status} />
          {issue.reopenedAt ? <IssueReopenedBadge /> : null}
        </div>
      );
    case "assignedToName":
      return <TextCell value={issue.assignedToName} fallback="Unassigned" />;
    case "reviewedByName":
      return <TextCell value={issue.reviewedByName} fallback="Not reviewed" />;
    case "comments":
      return <TextCell value={issue.comments} fallback="No comments" />;
    case "remark":
      return <TextCell value={issue.remark} fallback="No remarks" />;
    case "testedByName":
      return <TextCell value={issue.testedByName} fallback="Not tested" />;
    case "fixedDate":
      return issue.fixedDate ? format(new Date(issue.fixedDate), "MMM d, yyyy") : "No date";
    case "development":
      return (
        <Badge variant={issue.development ? "secondary" : "outline"}>
          {issue.development ? "Yes" : "No"}
        </Badge>
      );
    case "deployment":
      return (
        <Badge variant={issue.deployment ? "secondary" : "outline"}>
          {issue.deployment ? "Yes" : "No"}
        </Badge>
      );
    case "updatedAt":
      return format(new Date(issue.updatedAt), "MMM d, yyyy");
    case "actions":
    default:
      return null;
  }
}

export function WorkbookToolbar({
  canEdit,
  isNewIssueVisible,
  editingIssue,
  editingValues,
  savingRowId,
  newIssueValues,
  onStartNewIssue,
  onSaveNewIssue,
  onCancelNewIssue,
  onSaveEditedIssue,
  onCancelEdit,
}: {
  canEdit: boolean;
  isNewIssueVisible: boolean;
  editingIssue: IssueListItem | null;
  editingValues: IssueFormValues | null;
  savingRowId: string | null;
  newIssueValues: IssueFormValues;
  onStartNewIssue: () => void;
  onSaveNewIssue: () => void;
  onCancelNewIssue: () => void;
  onSaveEditedIssue: () => void;
  onCancelEdit: () => void;
}) {
  if (!canEdit) {
    return null;
  }

  const isSaving = Boolean(savingRowId);

  if (isNewIssueVisible) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
        <Badge variant="outline">New issue</Badge>
        <span className="text-sm text-muted-foreground">Fill the highlighted row, then save.</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onSaveNewIssue}
            disabled={!canSaveDraft(newIssueValues) || isSaving}
          >
            <Check className="h-3.5 w-3.5" />
            {savingRowId === NEW_ROW_ID ? "Adding" : "Add issue"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancelNewIssue}
            disabled={isSaving}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (editingIssue && editingValues) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-3 py-2">
        <Badge variant="outline">Editing #{editingIssue.no}</Badge>
        <span className="min-w-0 truncate text-sm text-muted-foreground">{editingIssue.title}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onSaveEditedIssue}
            disabled={!canSaveDraft(editingValues) || isSaving}
          >
            <Check className="h-3.5 w-3.5" />
            {savingRowId === editingIssue.id ? "Saving" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancelEdit}
            disabled={isSaving}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
      <Button type="button" size="sm" onClick={onStartNewIssue}>
        <Plus className="h-3.5 w-3.5" />
        New issue
      </Button>
      <span className="text-sm text-muted-foreground">
        Click a cell to edit inline. Use the pencil icon for the full modal.
      </span>
    </div>
  );
}
