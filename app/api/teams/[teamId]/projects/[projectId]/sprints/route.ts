import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { createProjectSprint } from "@/routes/issues/mutations";
import type {
  CreateProjectSprintInput,
  ProjectSprintMutationResponse,
} from "@/routes/issues/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId } = await context.params;
      const body = await readJsonBody<CreateProjectSprintInput>(request);
      const sprint = await createProjectSprint(actor, teamId, projectId, body);

      return NextResponse.json<ProjectSprintMutationResponse>(
        {
          sprint,
          message: `${sprint.name} is ready.`,
        },
        { status: 201 }
      );
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the sprint request.");
  }
}
