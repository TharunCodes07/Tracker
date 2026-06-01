import { Hand } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { IssueListItem } from "@/routes/issues/types";
import type { TeamMemberRole } from "@/routes/teams/types";

export type IssueClaimRole = "developer" | "tester";

export interface IssueClaimMember {
  userId: string;
  roles: TeamMemberRole[];
}

export function getClaimableIssueRoles(
  issue: IssueListItem,
  member: IssueClaimMember | null,
): IssueClaimRole[] {
  if (!member) {
    return [];
  }

  const roles: IssueClaimRole[] = [];

  if (
    member.roles.includes("developer") &&
    issue.assigneeGroup === "development" &&
    !issue.assigneeId
  ) {
    roles.push("developer");
  }

  if (
    member.roles.includes("tester") &&
    issue.testerAssigneeGroup === "testing" &&
    !issue.testerAssigneeId
  ) {
    roles.push("tester");
  }

  return roles;
}

export function IssueClaimActions({
  roles,
  pending,
  onClaim,
  className,
}: {
  roles: IssueClaimRole[];
  pending?: boolean;
  onClaim: (role: IssueClaimRole) => void;
  className?: string;
}) {
  if (roles.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {roles.map((role) => (
        <Button
          key={role}
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-full"
          disabled={pending}
          onClick={() => onClaim(role)}
        >
          <Hand className="h-3.5 w-3.5" />
          Claim {role === "developer" ? "dev" : "test"}
        </Button>
      ))}
    </div>
  );
}
