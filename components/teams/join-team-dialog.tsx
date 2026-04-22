"use client";

import type * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface JoinTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  pending: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function JoinTeamDialog({
  open,
  onOpenChange,
  code,
  pending,
  onCodeChange,
  onSubmit,
}: JoinTeamDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Team Access</DialogTitle>
          <DialogDescription>
            Enter the shared team code to send an access request to that team&apos;s owners.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="team-join-code">Join code</FieldLabel>
              <Input
                id="team-join-code"
                value={code}
                onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
                placeholder="A1B2C3D4"
                autoComplete="off"
                disabled={pending}
                className="font-mono tracking-[0.25em] uppercase"
                required
              />
              <FieldDescription>
                Team codes are case-insensitive. Owners must approve the request before you join.
              </FieldDescription>
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
                {pending ? "Requesting..." : "Request access"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
