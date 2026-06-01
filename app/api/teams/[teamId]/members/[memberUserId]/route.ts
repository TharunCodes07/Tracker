import { after, NextResponse } from "next/server";

import { withOrganizationScope } from "@/db";
import {
  handleRouteError,
  readJsonBody,
  withRouteOrganization,
} from "@/routes/http";
import { dispatchNotificationEvents } from "@/routes/notifications/service";
import type { NotificationEvent } from "@/routes/notifications/types";
import { updateTeamMemberForUser } from "@/routes/teams/mutations";
import { getTeamForUser, getTeamMemberForUser } from "@/routes/teams/queries";
import type {
  TeamMemberMutationResponse,
  UpdateTeamMemberInput,
} from "@/routes/teams/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string; memberUserId: string }> },
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, memberUserId } = await context.params;
      const body = await readJsonBody<UpdateTeamMemberInput>(request);
      const [team, previousMember] = await Promise.all([
        getTeamForUser(actor.id, teamId),
        getTeamMemberForUser(actor.id, teamId, memberUserId),
      ]);
      const member = await updateTeamMemberForUser(
        actor,
        teamId,
        memberUserId,
        body,
      );
      const addedRoles =
        body.roles?.filter((role) => !previousMember?.roles.includes(role)) ??
        [];

      if (addedRoles.length > 0 && actor.organizationId) {
        const notificationEvents: NotificationEvent[] = [
          {
            type: "team.role_assigned",
            actorId: actor.id,
            actorName: actor.name ?? "",
            teamId,
            memberUserId,
            teamName: team?.name ?? "the team",
            roles: addedRoles,
          },
        ];

        after(() =>
          withOrganizationScope(actor.organizationId!, () =>
            dispatchNotificationEvents(notificationEvents),
          ),
        );
      }

      return NextResponse.json<TeamMemberMutationResponse>({
        member,
        message: `Updated team settings for ${member.name}.`,
      });
    });
  } catch (error) {
    return handleRouteError(
      error,
      "Something went wrong while updating the team member.",
    );
  }
}
