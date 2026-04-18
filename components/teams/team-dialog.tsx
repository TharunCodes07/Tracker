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
import { Textarea } from "@/components/ui/textarea";

interface TeamDialogProps {
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

export function TeamDialog({
  open,
  onOpenChange,
  name,
  description,
  pending,
  title = "Create Team",
  descriptionText = "Set up a team workspace and get a join code you can share immediately.",
  submitLabel = "Create team",
  onNameChange,
  onDescriptionChange,
  onSubmit,
}: TeamDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-lg">
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="break-words">{title}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <form className="min-w-0" onSubmit={onSubmit}>
          <FieldGroup className="min-w-0">
            <Field className="min-w-0">
              <FieldLabel htmlFor="team-name">Team name</FieldLabel>
              <Input
                id="team-name"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Product Design"
                autoComplete="off"
                disabled={pending}
                required
              />
            </Field>

            <Field className="min-w-0">
              <FieldLabel htmlFor="team-description">Description</FieldLabel>
              <Textarea
                id="team-description"
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="What this team owns, ships, or collaborates on."
                disabled={pending}
                rows={5}
              />
              <FieldDescription>
                Keep it short and practical so teammates can recognize the workspace quickly.
              </FieldDescription>
            </Field>

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
                disabled={pending}
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
