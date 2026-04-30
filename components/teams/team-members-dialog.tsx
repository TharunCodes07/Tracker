"use client";

import { MailPlus, ShieldCheck, UserCheck, UsersRound, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TEAM_ACCESS_LEVEL_OPTIONS,
  TEAM_MEMBER_ROLE_OPTIONS,
  type TeamAccessLevel,
  type TeamInviteCandidate,
  type TeamInviteMemberInput,
  type TeamMemberListItem,
  type TeamMemberRole,
  type TeamPendingJoinRequestListItem,
  type UpdateTeamMemberInput,
} from "@/routes/teams/types";

interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string;
  members: TeamMemberListItem[];
  pendingRequests: TeamPendingJoinRequestListItem[];
  isLoading: boolean;
  canManageMemberAccess: boolean;
  canManageMemberRoles: boolean;
  pendingMemberId?: string | null;
  pendingJoinRequestUserId?: string | null;
  inviteEmail: string;
  inviteCandidates: TeamInviteCandidate[];
  inviteSearchPending: boolean;
  inviteSearchError?: string | null;
  inviteAccessLevel: Exclude<TeamAccessLevel, "owner">;
  invitePending: boolean;
  onMemberChange: (memberUserId: string, input: UpdateTeamMemberInput) => void;
  onApproveRequest: (memberUserId: string) => void;
  onRejectRequest: (memberUserId: string) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteCandidateSelect: (candidate: TeamInviteCandidate) => void;
  onInviteAccessLevelChange: (value: TeamInviteMemberInput["accessLevel"]) => void;
  onInviteSubmit: () => void;
}

function formatAccessLabel(accessLevel: TeamAccessLevel) {
  return TEAM_ACCESS_LEVEL_OPTIONS.find((option) => option.value === accessLevel)?.label ?? accessLevel;
}

function AccessBadge({ accessLevel }: { accessLevel: TeamAccessLevel }) {
  if (accessLevel === "owner") {
    return <Badge variant="default">Owner access</Badge>;
  }

  return (
    <Badge variant={accessLevel === "edit" ? "outline" : "secondary"}>
      {accessLevel === "edit" ? "Edit access" : "Read access"}
    </Badge>
  );
}

function formatRoleLabel(role: TeamMemberRole) {
  return TEAM_MEMBER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function getInviteCandidateStatusLabel(candidate: TeamInviteCandidate) {
  switch (candidate.membershipStatus) {
    case "active":
      return "Member";
    case "pending":
      return "Pending";
    case "none":
    default:
      return "Available";
  }
}

export function TeamMembersDialog({
  open,
  onOpenChange,
  teamName,
  members,
  pendingRequests,
  isLoading,
  canManageMemberAccess,
  canManageMemberRoles,
  pendingMemberId = null,
  pendingJoinRequestUserId = null,
  inviteEmail,
  inviteCandidates,
  inviteSearchPending,
  inviteSearchError = null,
  inviteAccessLevel,
  invitePending,
  onMemberChange,
  onApproveRequest,
  onRejectRequest,
  onInviteEmailChange,
  onInviteCandidateSelect,
  onInviteAccessLevelChange,
  onInviteSubmit,
}: TeamMembersDialogProps) {
  const normalizedInviteEmail = inviteEmail.trim().toLowerCase();
  const hasInviteSearchQuery = normalizedInviteEmail.length >= 2;
  const selectedInviteCandidate = inviteCandidates.find(
    (candidate) => candidate.email.toLowerCase() === normalizedInviteEmail
  );
  const canInviteSelectedCandidate = selectedInviteCandidate?.membershipStatus === "none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-3xl">
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="break-words">Team members</DialogTitle>
          <DialogDescription>
            Review who belongs to {teamName}. Owners can approve requests and update access.
            Members with edit access can manage team roles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {canManageMemberAccess ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MailPlus className="h-4 w-4 text-sky-500" />
                Invite member
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/70 p-4 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="member-invite-email">
                    Email
                  </label>
                  <Input
                    id="member-invite-email"
                    type="search"
                    autoComplete="off"
                    value={inviteEmail}
                    onChange={(event) => onInviteEmailChange(event.target.value)}
                    placeholder="Search by email"
                    disabled={invitePending}
                    className="h-9"
                  />
                  <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
                    {!hasInviteSearchQuery ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Search for a user account to invite.
                      </div>
                    ) : inviteSearchPending ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
                    ) : inviteSearchError ? (
                      <div className="px-3 py-2 text-xs text-destructive">{inviteSearchError}</div>
                    ) : inviteCandidates.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No matching user accounts.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto p-1">
                        {inviteCandidates.map((candidate) => {
                          const isInvitable = candidate.membershipStatus === "none";
                          const isSelected = candidate.email.toLowerCase() === normalizedInviteEmail;

                          return (
                            <button
                              key={candidate.userId}
                              type="button"
                              className="flex w-full min-w-0 items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => onInviteCandidateSelect(candidate)}
                              disabled={invitePending || !isInvitable}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-foreground">
                                  {candidate.name}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {candidate.email}
                                </span>
                              </span>
                              <Badge variant={isSelected ? "default" : "outline"}>
                                {getInviteCandidateStatusLabel(candidate)}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full space-y-2 sm:w-[156px]">
                  <label className="text-xs font-medium text-muted-foreground">Access</label>
                  <Select
                    value={inviteAccessLevel}
                    onValueChange={(value) =>
                      onInviteAccessLevelChange(value as TeamInviteMemberInput["accessLevel"])
                    }
                    disabled={invitePending}
                  >
                    <SelectTrigger className="h-9 w-full" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {TEAM_ACCESS_LEVEL_OPTIONS.filter((option) => option.value !== "owner").map(
                        (option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={onInviteSubmit}
                  disabled={invitePending || !canInviteSelectedCandidate}
                >
                  <MailPlus className="h-4 w-4" />
                  {invitePending ? "Sending..." : "Send invite"}
                </Button>
              </div>
            </section>
          ) : null}

          {canManageMemberAccess && pendingRequests.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <UserCheck className="h-4 w-4 text-emerald-500" />
                Pending join requests
              </div>

              {pendingRequests.map((request) => (
                <div
                  key={request.userId}
                  className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="truncate font-medium text-foreground">{request.name}</div>
                    <div className="truncate text-sm text-muted-foreground">{request.email}</div>
                    <Badge variant="secondary">{formatAccessLabel(request.requestedAccessLevel)}</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingJoinRequestUserId === request.userId}
                      onClick={() => onRejectRequest(request.userId)}
                    >
                      <UserX className="h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={pendingJoinRequestUserId === request.userId}
                      onClick={() => onApproveRequest(request.userId)}
                    >
                      <UserCheck className="h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <UsersRound className="h-4 w-4 text-cyan-500" />
              Active members
            </div>

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
                      {canManageMemberAccess ? (
                        <Select
                          value={member.accessLevel}
                          onValueChange={(value) =>
                            onMemberChange(member.userId, {
                              accessLevel: value as TeamAccessLevel,
                            })
                          }
                          disabled={pendingMemberId === member.userId}
                        >
                          <SelectTrigger className="w-[148px]" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end">
                            {TEAM_ACCESS_LEVEL_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <AccessBadge accessLevel={member.accessLevel} />
                      )}

                      {canManageMemberRoles ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={pendingMemberId === member.userId}
                            >
                              Roles
                              {member.roles.length > 0 ? ` (${member.roles.length})` : ""}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Team roles</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {TEAM_MEMBER_ROLE_OPTIONS.map((roleOption) => {
                              const isChecked = member.roles.includes(roleOption.value);

                              return (
                                <DropdownMenuCheckboxItem
                                  key={roleOption.value}
                                  checked={isChecked}
                                  onSelect={(event) => event.preventDefault()}
                                  onCheckedChange={() => {
                                    const nextRoles = isChecked
                                      ? member.roles.filter((role) => role !== roleOption.value)
                                      : [...member.roles, roleOption.value];

                                    onMemberChange(member.userId, { roles: nextRoles });
                                  }}
                                >
                                  {roleOption.label}
                                </DropdownMenuCheckboxItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}

                      {member.roles.length > 0 ? (
                        member.roles.map((role) => (
                          <Badge key={role} variant="outline">
                            {formatRoleLabel(role)}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary">No roles</Badge>
                      )}
                    </div>
                  </div>
                ))}

            {!isLoading && members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
                No members found for this team.
              </div>
            ) : null}
          </section>
        </div>

        <DialogFooter showCloseButton className="justify-between sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {canManageMemberAccess ? (
              <>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Owners can approve requests and update access here.
              </>
            ) : canManageMemberRoles ? (
              <>
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                You can update team roles because you have edit access.
              </>
            ) : (
              <>
                <UsersRound className="h-4 w-4 text-cyan-400" />
                You can review the current members and their roles here.
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
