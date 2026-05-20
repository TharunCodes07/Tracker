import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { updateProjectReleaseStatus } from "@/routes/issues/mutations";
import type {
  ProjectReleaseMutationResponse,
  ProjectReleaseStatus,
} from "@/routes/issues/types";

interface UpdateProjectReleaseStatusInput {
  status?: ProjectReleaseStatus | null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string; releaseId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId, releaseId } = await context.params;
      const body = await readJsonBody<UpdateProjectReleaseStatusInput>(request);
      const release = await updateProjectReleaseStatus(actor, teamId, projectId, releaseId, body);

      return NextResponse.json<ProjectReleaseMutationResponse>({
        release,
        message: `${release.name} has been updated.`,
      });
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the release request.");
  }
}
