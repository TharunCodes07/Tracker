import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { updateProjectEpicStatus } from "@/routes/issues/mutations";
import type { EpicStatus, ProjectEpicMutationResponse } from "@/routes/issues/types";

interface UpdateProjectEpicStatusInput {
  status?: EpicStatus | null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string; epicId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId, epicId } = await context.params;
      const body = await readJsonBody<UpdateProjectEpicStatusInput>(request);
      const epic = await updateProjectEpicStatus(actor, teamId, projectId, epicId, body);

      return NextResponse.json<ProjectEpicMutationResponse>({
        epic,
        message: `${epic.title} has been updated.`,
      });
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the epic request.");
  }
}
