import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { createProjectForTeam } from "@/routes/projects/mutations";
import type {
  CreateProjectInput,
  ProjectMutationResponse,
  TeamProjectsResponse,
} from "@/routes/projects/types";
import { getTeamProjectsForUser } from "@/routes/projects/queries";

export async function GET(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId } = await context.params;
    const teamProjects = await getTeamProjectsForUser(actor.id, teamId);

    if (!teamProjects) {
      return NextResponse.json({ message: "Team not found." }, { status: 404 });
    }

    return NextResponse.json<TeamProjectsResponse>(teamProjects);
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the project request.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId } = await context.params;
    const body = await readJsonBody<CreateProjectInput>(request);
    const project = await createProjectForTeam(actor, teamId, body);

    return NextResponse.json<ProjectMutationResponse>(
      {
        project,
        message: `${project.name} is ready.`,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the project request.");
  }
}
