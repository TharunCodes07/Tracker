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
import { cn } from "@/lib/utils";

interface EntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  pending: boolean;
  title: string;
  descriptionText: string;
  submitLabel: string;
  nameLabel: string;
  nameInputId: string;
  namePlaceholder: string;
  descriptionInputId: string;
  descriptionPlaceholder: string;
  descriptionHelpText: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  children?: React.ReactNode;
  contentClassName?: string;
  bodyClassName?: string;
}

export function EntityDialog({
  open,
  onOpenChange,
  name,
  description,
  pending,
  title,
  descriptionText,
  submitLabel,
  nameLabel,
  nameInputId,
  namePlaceholder,
  descriptionInputId,
  descriptionPlaceholder,
  descriptionHelpText,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  children,
  contentClassName,
  bodyClassName,
}: EntityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "grid max-h-[calc(100svh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-lg",
          contentClassName
        )}
      >
        <DialogHeader className="min-w-0 border-b border-border/60 px-4 py-4 pr-12">
          <DialogTitle className="break-words">{title}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 min-w-0 flex-col overflow-hidden" onSubmit={onSubmit}>
          <div
            className={cn(
              "tracker-thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4",
              bodyClassName
            )}
          >
            <FieldGroup className="min-w-0">
              <Field className="min-w-0">
                <FieldLabel htmlFor={nameInputId}>{nameLabel}</FieldLabel>
                <Input
                  id={nameInputId}
                  value={name}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder={namePlaceholder}
                  autoComplete="off"
                  disabled={pending}
                  required
                />
              </Field>

              <Field className="min-w-0">
                <FieldLabel htmlFor={descriptionInputId}>Description</FieldLabel>
                <Textarea
                  id={descriptionInputId}
                  value={description}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                  placeholder={descriptionPlaceholder}
                  disabled={pending}
                  rows={5}
                />
                <FieldDescription>{descriptionHelpText}</FieldDescription>
              </Field>

              {children}
            </FieldGroup>
          </div>

          <DialogFooter className="m-0 w-full flex-wrap">
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
