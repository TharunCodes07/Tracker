"use client";

import type { MouseEvent } from "react";

import { format } from "date-fns";
import { CalendarDays, PencilLine, Trash2, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProjectListItem } from "@/routes/projects/types";
import type { TeamListItem } from "@/routes/teams/types";

interface ProjectCardProps {
  project: ProjectListItem;
  team: TeamListItem;
  onEdit: (project: ProjectListItem) => void;
  onDelete: (project: ProjectListItem) => void;
  actionPending?: boolean;
}

function stopCardClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

export function ProjectCard({
  project,
  team,
  onEdit,
  onDelete,
  actionPending = false,
}: ProjectCardProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/70 to-cyan-400/70" />

      <CardHeader className="gap-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3 pr-12">
            <Badge variant="secondary">
              {project.issueCount} {project.issueCount === 1 ? "issue" : "issues"}
            </Badge>

            <div className="min-w-0 w-full max-w-full space-y-1.5 overflow-hidden">
              <CardTitle
                className="line-clamp-2 w-full min-w-0 max-w-full overflow-hidden text-lg leading-tight [overflow-wrap:anywhere]"
                title={project.name}
              >
                {project.name}
              </CardTitle>

              <CardDescription
                className="line-clamp-2 w-full min-w-0 max-w-full overflow-hidden [overflow-wrap:anywhere]"
                title={project.description ?? "No description added for this project yet."}
              >
                {project.description ?? "No description added for this project yet."}
              </CardDescription>
            </div>
          </div>

          {team.canEdit ? (
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 translate-y-1 transition duration-200 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-xl bg-background/80 backdrop-blur"
                onClick={(event) => {
                  stopCardClick(event);
                  onEdit(project);
                }}
                disabled={actionPending}
                aria-label={`Edit ${project.name}`}
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
                  onDelete(project);
                }}
                disabled={actionPending}
                aria-label={`Delete ${project.name}`}
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
            <UsersRound className="h-4 w-4 text-cyan-400" />
            Team
          </div>
          <div className="text-sm font-medium text-foreground">{team.name}</div>
        </div>

        <div className="space-y-1.5 sm:text-right">
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:justify-end">
            <CalendarDays className="h-4 w-4 text-emerald-400" />
            Created
          </div>
          <div className="text-sm font-medium text-foreground">
            {format(new Date(project.createdAt), "MMM d, yyyy")}
          </div>
        </div>
      </CardContent>
    </>
  );
}
