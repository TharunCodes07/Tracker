"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to update password.";
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to update password.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/60 bg-background/90 shadow-xl shadow-black/5">
      <CardHeader>
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl border bg-muted">
          <KeyRound className="h-5 w-5 text-emerald-500" />
        </div>
        <CardTitle>Change your password</CardTitle>
        <CardDescription>
          This account was created by an administrator. Set a private password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                id="new-password"
                autoComplete="new-password"
                minLength={8}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-new-password">Confirm password</FieldLabel>
              <Input
                id="confirm-new-password"
                autoComplete="new-password"
                minLength={8}
                required
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </Field>
            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button className="h-10 w-full justify-between" disabled={pending} type="submit">
              <span>{pending ? "Updating" : "Update password"}</span>
              {pending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
