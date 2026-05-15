import { NextResponse } from "next/server";

import { handleRouteError, withRouteOrganization } from "@/routes/http";
import { acceptTeamInviteForUser } from "@/routes/teams/mutations";
import type { TeamInviteAcceptanceResponse } from "@/routes/teams/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId } = await context.params;
      const team = await acceptTeamInviteForUser(actor, teamId);

      return NextResponse.json<TeamInviteAcceptanceResponse>({
        teamId: team.id,
        message: team.alreadyActive ? `You are already a member of ${team.name}.` : `Joined ${team.name}.`,
      });
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while accepting the invitation.");
  }
}
