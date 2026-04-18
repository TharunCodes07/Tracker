"use client";

import type * as React from "react";

import { EntityDialog } from "@/components/ui/entity-dialog";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  pending: boolean;
  title?: string;
  descriptionText?: string;
  submitLabel?: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  name,
  description,
  pending,
  title = "Create Project",
  descriptionText = "Add a project under this team so work, issues, and ownership stay grouped together.",
  submitLabel = "Create project",
  onNameChange,
  onDescriptionChange,
  onSubmit,
}: ProjectDialogProps) {
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
      nameLabel="Project name"
      nameInputId="project-name"
      namePlaceholder="Mobile App QA"
      descriptionInputId="project-description"
      descriptionPlaceholder="What this project covers, ships, or tracks."
      descriptionHelpText="Use a short description so the project is easy to distinguish in both grid and table views."
      onNameChange={onNameChange}
      onDescriptionChange={onDescriptionChange}
      onSubmit={onSubmit}
    />
  );
}
