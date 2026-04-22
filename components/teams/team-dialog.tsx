"use client";

import type * as React from "react";

import { EntityDialog } from "@/components/ui/entity-dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TEAM_VISIBILITY_OPTIONS,
  type TeamVisibility,
} from "@/routes/teams/types";

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  visibility: TeamVisibility;
  pending: boolean;
  title?: string;
  descriptionText?: string;
  submitLabel?: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onVisibilityChange: (value: TeamVisibility) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function TeamDialog({
  open,
  onOpenChange,
  name,
  description,
  visibility,
  pending,
  title = "Create Team",
  descriptionText = "Set up a team workspace, choose whether everyone can discover it, and generate an invite code.",
  submitLabel = "Create team",
  onNameChange,
  onDescriptionChange,
  onVisibilityChange,
  onSubmit,
}: TeamDialogProps) {
  return (
    <EntityDialog
      open={open}
      onOpenChange={onOpenChange}
      name={name}
      description={description}
      pending={pending}
      title={title}
      descriptionText={descriptionText}
      submitLabel={submitLabel}
      nameLabel="Team name"
      nameInputId="team-name"
      namePlaceholder="Product Design"
      descriptionInputId="team-description"
      descriptionPlaceholder="What this team owns, ships, or collaborates on."
      descriptionHelpText="Keep it short and practical so teammates can recognize the workspace quickly."
      onNameChange={onNameChange}
      onDescriptionChange={onDescriptionChange}
      onSubmit={onSubmit}
    >
      <Field className="min-w-0">
        <FieldLabel>Visibility</FieldLabel>
        <Select
          value={visibility}
          onValueChange={(value) => onVisibilityChange(value as TeamVisibility)}
          disabled={pending}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEAM_VISIBILITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          Public teams are visible to everyone in the workspace. Private teams only appear to
          members or people with the invite code.
        </FieldDescription>
      </Field>
    </EntityDialog>
  );
}
