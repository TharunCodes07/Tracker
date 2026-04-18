"use client";

import { ShieldCheck, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamAccessLevel, TeamMemberListItem } from "@/routes/teams/types";

interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string;
  members: TeamMemberListItem[];
  isLoading: boolean;
  canManageMembers: boolean;
  pendingMemberId?: string | null;
  onAccessChange: (memberUserId: string, accessLevel: TeamAccessLevel) => void;
}

function AccessBadge({ accessLevel, isOwner }: { accessLevel: TeamAccessLevel; isOwner: boolean }) {
  if (isOwner) {
    return <Badge variant="default">Owner access</Badge>;
  }

  return (
    <Badge variant={accessLevel === "edit" ? "outline" : "secondary"}>
      {accessLevel === "edit" ? "Edit access" : "Read access"}
    </Badge>
  );
}

export function TeamMembersDialog({
  open,
  onOpenChange,
  teamName,
  members,
  isLoading,
  canManageMembers,
  pendingMemberId = null,
  onAccessChange,
}: TeamMembersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-2xl">
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="break-words">Team members</DialogTitle>
          <DialogDescription>
            Review who belongs to {teamName}. Owners can switch members between edit and read access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
              ))
            : members.map((member) => (
                <div
                  key={member.userId}
                  className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate font-medium text-foreground">{member.name}</div>
                      <Badge variant={member.isOwner ? "default" : "secondary"}>
                        {member.isOwner ? "Owner" : "Member"}
                      </Badge>
                      {member.isCurrentUser ? <Badge variant="outline">You</Badge> : null}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{member.email}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {canManageMembers && !member.isOwner ? (
                      <Select
                        value={member.accessLevel}
                        onValueChange={(value) =>
                          onAccessChange(member.userId, value as TeamAccessLevel)
                        }
                        disabled={pendingMemberId === member.userId}
                      >
                        <SelectTrigger className="w-[132px]" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="edit">Edit access</SelectItem>
                          <SelectItem value="read">Read access</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <AccessBadge accessLevel={member.accessLevel} isOwner={member.isOwner} />
                    )}
                  </div>
                </div>
              ))}

          {!isLoading && members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
              No members found for this team.
            </div>
          ) : null}
        </div>

        <DialogFooter showCloseButton className="justify-between sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {canManageMembers ? (
              <>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Owners can update member access here.
              </>
            ) : (
              <>
                <UsersRound className="h-4 w-4 text-cyan-400" />
                You can view team roles and access here.
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
