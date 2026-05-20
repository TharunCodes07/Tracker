import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  EPIC_STATUS_OPTIONS,
  RELEASE_STATUS_OPTIONS,
  SPRINT_STATUS_OPTIONS,
  type EpicStatus,
  type ProjectModuleListItem,
  type ProjectReleaseStatus,
  type SprintStatus,
} from "@/routes/issues/types";

import { NONE_VALUE } from "../constants";
import type {
  ComponentFormState,
  EpicFormState,
  ModuleFormState,
  ReleaseFormState,
  SprintFormState,
} from "../types";
import { Field } from "../ui";

export function ModuleDialog({
  open,
  pending,
  form,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  form: ModuleFormState;
  onOpenChange: (open: boolean) => void;
  onChange: (form: ModuleFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create module</DialogTitle>
          <DialogDescription>Modules are parent product areas. Components live under modules.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Incidents"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(event) => onChange({ ...form, description: event.target.value })}
              placeholder="Parent product area."
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create module"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ComponentDialog({
  open,
  pending,
  modules,
  form,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  modules: ProjectModuleListItem[];
  form: ComponentFormState;
  onOpenChange: (open: boolean) => void;
  onChange: (form: ComponentFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create component</DialogTitle>
          <DialogDescription>Components are child areas under a module.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Parent module">
            <Select value={form.moduleId} onValueChange={(value) => onChange({ ...form, moduleId: value })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Choose module</SelectItem>
                {modules.map((moduleItem) => (
                  <SelectItem key={moduleItem.id} value={moduleItem.id}>
                    {moduleItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Create Incidents"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(event) => onChange({ ...form, description: event.target.value })}
              placeholder="Specific child area inside the module."
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || form.moduleId === NONE_VALUE}>
              {pending ? "Creating..." : "Create component"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EpicDialog({
  open,
  pending,
  form,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  form: EpicFormState;
  onOpenChange: (open: boolean) => void;
  onChange: (form: EpicFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create epic</DialogTitle>
          <DialogDescription>Epics group issues by goal. They are not issue types.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(event) => onChange({ ...form, title: event.target.value })}
              placeholder="Incident Form Validation Improvements"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(event) => onChange({ ...form, description: event.target.value })}
              placeholder="What this epic is meant to accomplish."
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-1">
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(value) => onChange({ ...form, status: value as EpicStatus })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EPIC_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create epic"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReleaseDialog({
  open,
  pending,
  form,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  form: ReleaseFormState;
  onOpenChange: (open: boolean) => void;
  onChange: (form: ReleaseFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create release</DialogTitle>
          <DialogDescription>Releases group issues planned for a shipping package.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="v1.4.0 Incident Fixes"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(event) => onChange({ ...form, description: event.target.value })}
              placeholder="What this release should ship."
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-1">
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(value) => onChange({ ...form, status: value as ProjectReleaseStatus })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELEASE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create release"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SprintDialog({
  open,
  pending,
  form,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  form: SprintFormState;
  onOpenChange: (open: boolean) => void;
  onChange: (form: SprintFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create sprint</DialogTitle>
          <DialogDescription>Sprints time-box issues. Releases still own shipping plans.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Sprint 12"
            />
          </Field>
          <Field label="Goal">
            <Textarea
              value={form.goal}
              onChange={(event) => onChange({ ...form, goal: event.target.value })}
              placeholder="Main outcome for this sprint."
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(value) => onChange({ ...form, status: value as SprintStatus })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPRINT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Start date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => onChange({ ...form, startDate: event.target.value })}
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => onChange({ ...form, endDate: event.target.value })}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create sprint"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
