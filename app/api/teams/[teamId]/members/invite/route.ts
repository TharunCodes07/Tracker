import { after, NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { dispatchNotificationEvents } from "@/routes/notifications/service";
import type { NotificationEvent } from "@/routes/notifications/types";
import { inviteTeamMemberForUser } from "@/routes/teams/mutations";
import type { TeamInviteMemberInput, TeamInviteMemberResponse } from "@/routes/teams/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId } = await context.params;
    const body = await readJsonBody<TeamInviteMemberInput>(request);
    const { team, invitedUser } = await inviteTeamMemberForUser(actor, teamId, body);
    const notificationEvents: NotificationEvent[] = [
      {
        type: "team.invited",
        actorId: actor.id,
        actorName: actor.name ?? "",
        teamId: team.id,
        invitedUserId: invitedUser.id,
        teamName: team.name,
      },
    ];

    after(() => dispatchNotificationEvents(notificationEvents));

    return NextResponse.json<TeamInviteMemberResponse>({
      memberUserId: invitedUser.id,
      message: `Invitation sent to ${invitedUser.name ?? invitedUser.email}.`,
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while sending the invitation.");
  }
}
