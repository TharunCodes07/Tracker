import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { updateTeamMemberForUser } from "@/routes/teams/mutations";
import type {
  TeamMemberMutationResponse,
  UpdateTeamMemberInput,
} from "@/routes/teams/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string; memberUserId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, memberUserId } = await context.params;
    const body = await readJsonBody<UpdateTeamMemberInput>(request);
    const member = await updateTeamMemberForUser(actor, teamId, memberUserId, body);

    return NextResponse.json<TeamMemberMutationResponse>({
      member,
      message: `Updated team settings for ${member.name}.`,
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while updating the team member.");
  }
}
