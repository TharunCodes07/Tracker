import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { createProjectRelease } from "@/routes/issues/mutations";
import type {
  CreateProjectReleaseInput,
  ProjectReleaseMutationResponse,
} from "@/routes/issues/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId } = await context.params;
      const body = await readJsonBody<CreateProjectReleaseInput>(request);
      const release = await createProjectRelease(actor, teamId, projectId, body);

      return NextResponse.json<ProjectReleaseMutationResponse>(
        {
          release,
          message: `${release.name} is ready.`,
        },
        { status: 201 }
      );
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the release request.");
  }
}
