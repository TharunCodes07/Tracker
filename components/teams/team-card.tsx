import { format } from "date-fns";
import { CalendarDays, Copy, PencilLine, ShieldCheck, Trash2, UsersRound } from "lucide-react";

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
  actionPending?: boolean;
}

export function TeamCard({
  team,
  onEdit,
  onDelete,
  onCopyCode,
  actionPending = false,
}: TeamCardProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/70 to-cyan-400/70" />
      <CardHeader className="gap-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3 overflow-hidden pr-12">
            <Badge
              variant={team.isOwner ? "default" : "secondary"}
              className={team.isOwner ? "shadow-[0_0_12px_rgba(16,185,129,0.18)]" : undefined}
            >
              {team.isOwner ? "Owner" : "Member"}
            </Badge>
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
                onClick={() => onEdit(team)}
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
                onClick={() => onDelete(team)}
                disabled={actionPending}
                aria-label={`Delete ${team.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 border-t border-border/60 pt-4 pb-5 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Created by
          </div>
          <div
            className="line-clamp-2 break-words text-sm font-medium text-foreground"
            title={team.createdByName}
          >
            {team.createdByName}
          </div>
        </div>

        <div className="space-y-1.5 sm:text-right">
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:justify-end">
            <UsersRound className="h-4 w-4 text-cyan-400" />
            Members
          </div>
          <div className="text-sm font-medium text-foreground">
            {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto justify-between border-border/60 bg-transparent pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-emerald-400" />
          Created {format(new Date(team.createdAt), "MMM d, yyyy")}
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="gap-1.5 font-mono">
            Code {team.joinCode}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="rounded-lg"
            onClick={() => onCopyCode(team.joinCode)}
            aria-label={`Copy code for ${team.name}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardFooter>
    </>
  );
}
