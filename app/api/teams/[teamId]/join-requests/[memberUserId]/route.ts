import { NextResponse } from "next/server";

import { handleRouteError, requireRouteUser } from "@/routes/http";
import {
  approveTeamJoinRequestForUser,
  rejectTeamJoinRequestForUser,
} from "@/routes/teams/mutations";
import type { TeamJoinRequestMutationResponse } from "@/routes/teams/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string; memberUserId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, memberUserId } = await context.params;
    const approvedMemberUserId = await approveTeamJoinRequestForUser(actor, teamId, memberUserId);

    return NextResponse.json<TeamJoinRequestMutationResponse>({
      memberUserId: approvedMemberUserId,
      message: "Join request approved.",
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while approving the join request.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ teamId: string; memberUserId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, memberUserId } = await context.params;
    const rejectedMemberUserId = await rejectTeamJoinRequestForUser(actor, teamId, memberUserId);

    return NextResponse.json<TeamJoinRequestMutationResponse>({
      memberUserId: rejectedMemberUserId,
      message: "Join request declined.",
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while declining the join request.");
  }
}
