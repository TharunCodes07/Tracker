"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectModuleListItem } from "@/routes/issues/types";

interface SubModuleDraft {
  name: string;
  description: string;
}

interface ProjectModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  parentModuleId: string;
  mainModules: ProjectModuleListItem[];
  createSubModulesWithMain: boolean;
  subModuleDrafts: SubModuleDraft[];
  pending: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onParentModuleIdChange: (value: string) => void;
  onCreateSubModulesWithMainChange: (value: boolean) => void;
  onAddSubModuleDraft: () => void;
  onUpdateSubModuleDraft: (index: number, patch: Partial<SubModuleDraft>) => void;
  onRemoveSubModuleDraft: (index: number) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function ProjectModuleDialog({
  open,
  onOpenChange,
  name,
  description,
  parentModuleId,
  mainModules,
  createSubModulesWithMain,
  subModuleDrafts,
  pending,
  onNameChange,
  onDescriptionChange,
  onParentModuleIdChange,
  onCreateSubModulesWithMainChange,
  onAddSubModuleDraft,
  onUpdateSubModuleDraft,
  onRemoveSubModuleDraft,
  onSubmit,
}: ProjectModuleDialogProps) {
  const subModuleListRef = React.useRef<HTMLDivElement | null>(null);
  const previousSubModuleCountRef = React.useRef(subModuleDrafts.length);

  React.useEffect(() => {
    if (
      createSubModulesWithMain &&
      subModuleDrafts.length > previousSubModuleCountRef.current
    ) {
      window.requestAnimationFrame(() => {
        subModuleListRef.current?.lastElementChild?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    }

    previousSubModuleCountRef.current = subModuleDrafts.length;
  }, [createSubModulesWithMain, subModuleDrafts.length]);

  return (
    <EntityDialog
      open={open}
      onOpenChange={onOpenChange}
      name={name}
      description={description}
      pending={pending}
      title={parentModuleId ? "Create Sub Module" : "Create Module"}
      descriptionText={
        parentModuleId
          ? "Add a sub module under the selected main module so issues can be tracked at a more specific level."
          : "Add a top-level module and optionally create its first sub module in one step."
      }
      submitLabel={
        parentModuleId
          ? "Create sub module"
          : createSubModulesWithMain
            ? "Create module set"
            : "Create module"
      }
      nameLabel={parentModuleId ? "Sub module name" : "Main module name"}
      nameInputId="project-module-name"
      namePlaceholder={parentModuleId ? "Login form" : "Authentication"}
      descriptionInputId="project-module-description"
      descriptionPlaceholder={
        parentModuleId
          ? "What this sub module covers within the selected main module."
          : "What part of the project this main module covers."
      }
      descriptionHelpText="Leave the parent blank to create a main module. Choose one to add a sub module beneath it."
      contentClassName="sm:max-w-3xl"
      onNameChange={onNameChange}
      onDescriptionChange={onDescriptionChange}
      onSubmit={onSubmit}
    >
      <Field className="min-w-0">
        <FieldLabel>Parent main module</FieldLabel>
        <Select
          value={parentModuleId || "__main__"}
          onValueChange={(value) => onParentModuleIdChange(value === "__main__" ? "" : value)}
          disabled={pending}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Create as a main module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__main__">Create as a main module</SelectItem>
            {mainModules.map((module) => (
              <SelectItem key={module.id} value={module.id}>
                {module.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          Sub modules inherit their grouping from the selected main module.
        </FieldDescription>
      </Field>

      {!parentModuleId ? (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-3">
          <Field orientation="horizontal" className="items-start gap-3">
            <Checkbox
              id="create-first-sub-module"
              checked={createSubModulesWithMain}
              onCheckedChange={(checked) => {
                const shouldCreateSubModules = checked === true;

                onCreateSubModulesWithMainChange(shouldCreateSubModules);

                if (shouldCreateSubModules && subModuleDrafts.length === 0) {
                  onAddSubModuleDraft();
                }
              }}
              disabled={pending}
            />
            <div className="space-y-1">
              <FieldLabel htmlFor="create-first-sub-module">Create sub modules now</FieldLabel>
              <FieldDescription>
                Optional: create one or more sub modules immediately after the main module is
                created.
              </FieldDescription>
            </div>
          </Field>

          {createSubModulesWithMain ? (
            <>
              <div ref={subModuleListRef} className="space-y-3">
                {subModuleDrafts.map((subModuleDraft, index) => (
                  <div
                    key={`sub-module-draft-${index}`}
                    className="scroll-mt-4 space-y-3 rounded-xl border border-border/60 bg-background/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">
                        Sub module {index + 1}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveSubModuleDraft(index)}
                        disabled={pending}
                      >
                        Remove
                      </Button>
                    </div>

                    <Field className="min-w-0">
                      <FieldLabel htmlFor={`project-module-sub-name-${index}`}>
                        Sub module name
                      </FieldLabel>
                      <Input
                        id={`project-module-sub-name-${index}`}
                        value={subModuleDraft.name}
                        onChange={(event) =>
                          onUpdateSubModuleDraft(index, { name: event.target.value })
                        }
                        placeholder="Login form"
                        autoComplete="off"
                        disabled={pending}
                        required={createSubModulesWithMain}
                      />
                    </Field>

                    <Field className="min-w-0">
                      <FieldLabel htmlFor={`project-module-sub-description-${index}`}>
                        Sub module description
                      </FieldLabel>
                      <Input
                        id={`project-module-sub-description-${index}`}
                        value={subModuleDraft.description}
                        onChange={(event) =>
                          onUpdateSubModuleDraft(index, {
                            description: event.target.value,
                          })
                        }
                        placeholder="Optional details for this sub module"
                        autoComplete="off"
                        disabled={pending}
                      />
                    </Field>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddSubModuleDraft}
                disabled={pending}
              >
                <Plus className="h-4 w-4" />
                Add another sub module
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </EntityDialog>
  );
}
