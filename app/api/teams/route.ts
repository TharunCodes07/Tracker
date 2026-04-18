import { NextResponse } from "next/server";

import type {
  CreateTeamInput,
  TeamMutationResponse,
  TeamsListResponse,
} from "@/routes/teams/types";
import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { createTeamForUser } from "@/routes/teams/mutations";
import { listTeamsForUser } from "@/routes/teams/queries";

export async function GET(request: Request) {
  try {
    const actor = await requireRouteUser(request);
    const teams = await listTeamsForUser(actor.id);

    return NextResponse.json<TeamsListResponse>({ teams });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the team request.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRouteUser(request);
    const body = await readJsonBody<CreateTeamInput>(request);
    const team = await createTeamForUser(actor, body);

    return NextResponse.json<TeamMutationResponse>(
      {
        team,
        message: `${team.name} is ready.`,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the team request.");
  }
}
