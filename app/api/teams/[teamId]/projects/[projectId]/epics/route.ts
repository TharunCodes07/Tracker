import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { createProjectEpic } from "@/routes/issues/mutations";
import type { CreateProjectEpicInput, ProjectEpicMutationResponse } from "@/routes/issues/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId } = await context.params;
      const body = await readJsonBody<CreateProjectEpicInput>(request);
      const epic = await createProjectEpic(actor, teamId, projectId, body);

      return NextResponse.json<ProjectEpicMutationResponse>(
        {
          epic,
          message: `${epic.title} is ready.`,
        },
        { status: 201 }
      );
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the epic request.");
  }
}
