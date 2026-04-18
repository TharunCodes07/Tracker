import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { updateTeamMemberAccessForUser } from "@/routes/teams/mutations";
import type {
  TeamMemberMutationResponse,
  UpdateTeamMemberAccessInput,
} from "@/routes/teams/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string; memberUserId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, memberUserId } = await context.params;
    const body = await readJsonBody<UpdateTeamMemberAccessInput>(request);
    const member = await updateTeamMemberAccessForUser(actor, teamId, memberUserId, body);

    return NextResponse.json<TeamMemberMutationResponse>({
      member,
      message: `${member.name} now has ${member.accessLevel} access.`,
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while updating member access.");
  }
}
