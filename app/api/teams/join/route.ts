import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { joinTeamForUser } from "@/routes/teams/mutations";
import type { JoinTeamInput, JoinTeamMutationResponse } from "@/routes/teams/types";

export async function POST(request: Request) {
  try {
    const actor = await requireRouteUser(request);
    const body = await readJsonBody<JoinTeamInput>(request);
    const team = await joinTeamForUser(actor, body);

    return NextResponse.json<JoinTeamMutationResponse>({
      teamId: team.id,
      message: `Requested access to ${team.name}.`,
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the team request.");
  }
}
