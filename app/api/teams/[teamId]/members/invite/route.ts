import { after, NextRequest, NextResponse } from "next/server";

import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { dispatchNotificationEvents } from "@/routes/notifications/service";
import type { NotificationEvent } from "@/routes/notifications/types";
import { inviteTeamMemberForUser } from "@/routes/teams/mutations";
import { searchTeamInviteCandidatesForUser } from "@/routes/teams/queries";
import type {
  TeamInviteMemberInput,
  TeamInviteMemberResponse,
  TeamInviteSearchResponse,
} from "@/routes/teams/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId } = await context.params;
      const searchResult = await searchTeamInviteCandidatesForUser(
        actor.id,
        teamId,
        request.nextUrl.searchParams.get("query") ?? ""
      );

      if (!searchResult) {
        return NextResponse.json({ message: "Team not found." }, { status: 404 });
      }

      return NextResponse.json<TeamInviteSearchResponse>(searchResult);
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while searching users.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
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
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while sending the invitation.");
  }
}
