"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationMutationResponse } from "@/routes/notifications/types";
import type { TeamInviteAcceptanceResponse } from "@/routes/teams/types";

async function requestJson<TResponse>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(data?.message ?? "Request failed.");
  }

  return data as TResponse;
}

interface TeamInviteNotificationActionProps {
  notificationId: string;
  teamId: string | null;
  className?: string;
  onAccepted?: () => void;
}

export function TeamInviteNotificationAction({
  notificationId,
  teamId,
  className,
  onAccepted,
}: TeamInviteNotificationActionProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);

  async function handleAccept(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!teamId) {
      toast.error("This invitation is missing its team.");
      return;
    }

    setIsAccepting(true);

    try {
      const data = await requestJson<TeamInviteAcceptanceResponse>(
        `/api/teams/${teamId}/invite`,
        {
          method: "PATCH",
        }
      );

      await requestJson<NotificationMutationResponse>(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });

      toast.success(data.message);
      onAccepted?.();
      router.refresh();
      router.push(`/teams/${teamId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not accept the invitation.");
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("shrink-0", className)}
      onClick={handleAccept}
      disabled={isAccepting}
    >
      {isAccepting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
      {isAccepting ? "Accepting..." : "Accept invite"}
    </Button>
  );
}
