import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { deleteTeamForUser, updateTeamForUser } from "@/routes/teams/mutations";
import type {
  TeamDeleteResponse,
  TeamMutationResponse,
  UpdateTeamInput,
} from "@/routes/teams/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId } = await context.params;
      const body = await readJsonBody<UpdateTeamInput>(request);
      const team = await updateTeamForUser(actor, teamId, body);

      return NextResponse.json<TeamMutationResponse>({
        team,
        message: `${team.name} has been updated.`,
      });
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the team request.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId } = await context.params;
      const deletedTeam = await deleteTeamForUser(actor, teamId);

      return NextResponse.json<TeamDeleteResponse>({
        deletedTeamId: deletedTeam.id,
        message: `${deletedTeam.name} has been deleted.`,
      });
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the team request.");
  }
}
