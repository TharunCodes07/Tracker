import type { MouseEvent } from "react";

import { format } from "date-fns";
import {
  CalendarDays,
  Copy,
  Globe2,
  Lock,
  PencilLine,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeamListItem } from "@/routes/teams/types";

interface TeamCardProps {
  team: TeamListItem;
  onEdit: (team: TeamListItem) => void;
  onDelete: (team: TeamListItem) => void;
  onCopyCode: (code: string) => void;
  onRequestAccess: (team: TeamListItem) => void;
  actionPending?: boolean;
  pendingRequestTeamId?: string | null;
}

function stopCardClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

export function TeamCard({
  team,
  onEdit,
  onDelete,
  onCopyCode,
  onRequestAccess,
  actionPending = false,
  pendingRequestTeamId = null,
}: TeamCardProps) {
  const isRequestPending = pendingRequestTeamId === team.id;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/70 to-cyan-400/70" />

      <CardHeader className="gap-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 pr-12 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={team.visibility === "public" ? "outline" : "secondary"}>
                {team.visibility === "public" ? (
                  <Globe2 className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {team.visibility === "public" ? "Public" : "Private"}
              </Badge>
              {team.membershipStatus === "active" ? (
                <Badge
                  variant={team.isOwner ? "default" : "secondary"}
                  className={team.isOwner ? "shadow-[0_0_12px_rgba(16,185,129,0.18)]" : undefined}
                >
                  {team.isOwner ? "Owner" : "Member"}
                </Badge>
              ) : team.membershipStatus === "pending" ? (
                <Badge variant="secondary">Request pending</Badge>
              ) : (
                <Badge variant="secondary">Not joined</Badge>
              )}
              {team.membershipStatus === "active" && !team.isOwner ? (
                <Badge variant={team.canEdit ? "outline" : "secondary"}>
                  {team.canEdit ? "Edit access" : "Read access"}
                </Badge>
              ) : null}
            </div>

            <div className="min-w-0 w-full max-w-full space-y-1.5 overflow-hidden">
              <CardTitle
                className="line-clamp-2 w-full min-w-0 max-w-full overflow-hidden text-lg leading-tight [overflow-wrap:anywhere]"
                title={team.name}
              >
                {team.name}
              </CardTitle>

              <CardDescription
                className="line-clamp-2 w-full min-w-0 max-w-full overflow-hidden [overflow-wrap:anywhere]"
                title={team.description ?? "No description added for this team yet."}
              >
                {team.description ?? "No description added for this team yet."}
              </CardDescription>
            </div>
          </div>

          {team.isOwner ? (
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 translate-y-1 transition duration-200 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-xl bg-background/80 backdrop-blur"
                onClick={(event) => {
                  stopCardClick(event);
                  onEdit(team);
                }}
                disabled={actionPending}
                aria-label={`Edit ${team.name}`}
              >
                <PencilLine className="h-3.5 w-3.5" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-xl bg-background/80 text-destructive backdrop-blur hover:text-destructive"
                onClick={(event) => {
                  stopCardClick(event);
                  onDelete(team);
                }}
                disabled={actionPending}
                aria-label={`Delete ${team.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 border-t border-border/60 pt-4 pb-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Created by
          </div>
          <div className="text-sm font-medium text-foreground">{team.createdByName}</div>
        </div>

        <div className="space-y-1.5 sm:text-right">
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:justify-end">
            <UsersRound className="h-4 w-4 text-cyan-400" />
            Members
          </div>
          <div className="text-sm font-medium text-foreground">
            {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
          </div>
          {team.isOwner && team.pendingRequestCount > 0 ? (
            <div className="text-xs text-amber-600 dark:text-amber-300">
              {team.pendingRequestCount} pending{" "}
              {team.pendingRequestCount === 1 ? "request" : "requests"}
            </div>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="mt-auto justify-between border-border/60 bg-transparent pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-emerald-400" />
          Created {format(new Date(team.createdAt), "MMM d, yyyy")}
        </div>

        <div className="flex items-center gap-1.5">
          {team.joinCode ? (
            <>
              <Badge variant="outline" className="gap-1.5 font-mono">
                Code {team.joinCode}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="rounded-lg"
                onClick={(event) => {
                  stopCardClick(event);
                  onCopyCode(team.joinCode as string);
                }}
                aria-label={`Copy code for ${team.name}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : team.membershipStatus === "pending" ? (
            <Badge variant="secondary">Awaiting approval</Badge>
          ) : team.canRequestAccess ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isRequestPending}
              onClick={(event) => {
                stopCardClick(event);
                onRequestAccess(team);
              }}
            >
              <UserPlus className="h-4 w-4" />
              {isRequestPending ? "Requesting..." : "Request access"}
            </Button>
          ) : null}
        </div>
      </CardFooter>
    </>
  );
}
