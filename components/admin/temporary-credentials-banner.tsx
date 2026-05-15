"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { CreatedAccountCredentials } from "@/routes/admin/accounts";

interface TemporaryCredentialsBannerProps {
  credentials: CreatedAccountCredentials | null;
  title: string;
}

export function TemporaryCredentialsBanner({
  credentials,
  title,
}: TemporaryCredentialsBannerProps) {
  if (!credentials) {
    return null;
  }

  async function handleCopyCredentials() {
    if (!credentials) {
      return;
    }

    await navigator.clipboard.writeText(
      `Email: ${credentials.email}\nPassword: ${credentials.password}`
    );
    toast.success("Temporary credentials copied.");
  }

  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {credentials.email} / {credentials.password}
          </div>
        </div>
        <Button type="button" variant="outline" onClick={handleCopyCredentials}>
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </div>
    </div>
  );
}
