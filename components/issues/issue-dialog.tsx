"use client";

import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  ISSUE_PRIORITY_OPTIONS,
  ISSUE_STATUS_OPTIONS,
  type IssueClassListItem,
  type IssuePriority,
  type IssueStatus,
  type ProjectModuleListItem,
} from "@/routes/issues/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TeamMemberListItem } from "@/routes/teams/types";

const NONE_VALUE = "__none__";

export interface IssueFormValues {
  title: string;
  description: string;
  moduleId: string;
  issueClassId: string;
  priority: IssuePriority;
  status: IssueStatus;
  assignedTo: string;
  reviewedBy: string;
  testedBy: string;
}

interface IssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  values: IssueFormValues;
  modules: ProjectModuleListItem[];
  issueClasses: IssueClassListItem[];
  members: TeamMemberListItem[];
  onChange: (patch: Partial<IssueFormValues>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  title?: string;
  descriptionText?: string;
  submitLabel?: string;
}

function normalizeOptionalValue(value: string) {
  return value === NONE_VALUE ? "" : value;
}

function getOptionalValue(value: string) {
  return value || NONE_VALUE;
}

export function IssueDialog({
  open,
  onOpenChange,
  pending,
  values,
  modules,
  issueClasses,
  members,
  onChange,
  onSubmit,
  title = "Create Issue",
  descriptionText = "Add a general issue or tie it to a project module, then assign the right teammates for build, review, and testing.",
  submitLabel = "Create issue",
}: IssueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-2xl">
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <form className="min-w-0" onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="issue-title">Issue title</FieldLabel>
              <Input
                id="issue-title"
                value={values.title}
                onChange={(event) => onChange({ title: event.target.value })}
                placeholder="Login button breaks after redirect"
                autoComplete="off"
                disabled={pending}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="issue-description">Description</FieldLabel>
              <Textarea
                id="issue-description"
                value={values.description}
                onChange={(event) => onChange({ description: event.target.value })}
                placeholder="Describe the issue, reproduction notes, or expected outcome."
                rows={5}
                disabled={pending}
              />
              <FieldDescription>
                Add reproduction notes, expected behavior, or handoff details for the team.
              </FieldDescription>
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Module</FieldLabel>
                <Select
                  value={getOptionalValue(values.moduleId)}
                  onValueChange={(value) => onChange({ moduleId: normalizeOptionalValue(value) })}
                  disabled={pending}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="General issue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>General issue</SelectItem>
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Issue class</FieldLabel>
                <Select
                  value={values.issueClassId}
                  onValueChange={(value) => onChange({ issueClassId: value })}
                  disabled={pending || issueClasses.length === 0}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Choose an issue class" />
                  </SelectTrigger>
                  <SelectContent>
                    {issueClasses.map((issueClass) => (
                      <SelectItem key={issueClass.id} value={issueClass.id}>
                        {issueClass.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Priority</FieldLabel>
                <Select
                  value={values.priority}
                  onValueChange={(value) => onChange({ priority: value as IssuePriority })}
                  disabled={pending}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={values.status}
                  onValueChange={(value) => onChange({ status: value as IssueStatus })}
                  disabled={pending}
                >
                  <SelectTrigger className="h-10 w-full">
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
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel>Assigned to</FieldLabel>
                <Select
                  value={getOptionalValue(values.assignedTo)}
                  onValueChange={(value) =>
                    onChange({ assignedTo: normalizeOptionalValue(value) })
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Reviewed by</FieldLabel>
                <Select
                  value={getOptionalValue(values.reviewedBy)}
                  onValueChange={(value) =>
                    onChange({ reviewedBy: normalizeOptionalValue(value) })
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="No reviewer yet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No reviewer yet</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Tested by</FieldLabel>
                <Select
                  value={getOptionalValue(values.testedBy)}
                  onValueChange={(value) => onChange({ testedBy: normalizeOptionalValue(value) })}
                  disabled={pending}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="No tester yet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No tester yet</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <DialogFooter className="w-full flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full bg-linear-to-r from-emerald-400 to-cyan-400 text-black shadow-[0_0_18px_rgba(16,185,129,0.25)] hover:opacity-90 sm:w-auto"
                disabled={pending || issueClasses.length === 0}
              >
                {pending ? "Saving..." : submitLabel}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
