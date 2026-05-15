import { NextResponse } from "next/server";

import { handleRouteError, withRouteOrganization } from "@/routes/http";
import type { TeamMembersResponse } from "@/routes/teams/types";
import { listTeamMembersForUser } from "@/routes/teams/queries";

export async function GET(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId } = await context.params;
      const teamMembers = await listTeamMembersForUser(actor.id, teamId);

      if (!teamMembers) {
        return NextResponse.json({ message: "Team not found." }, { status: 404 });
      }

      return NextResponse.json<TeamMembersResponse>(teamMembers);
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the team members request.");
  }
}
