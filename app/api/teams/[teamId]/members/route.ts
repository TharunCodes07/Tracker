import { NextResponse } from "next/server";

import { handleRouteError, requireRouteUser } from "@/routes/http";
import type { TeamMembersResponse } from "@/routes/teams/types";
import { listTeamMembersForUser } from "@/routes/teams/queries";

export async function GET(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId } = await context.params;
    const teamMembers = await listTeamMembersForUser(actor.id, teamId);

    if (!teamMembers) {
      return NextResponse.json({ message: "Team not found." }, { status: 404 });
    }

    return NextResponse.json<TeamMembersResponse>(teamMembers);
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the team members request.");
  }
}
