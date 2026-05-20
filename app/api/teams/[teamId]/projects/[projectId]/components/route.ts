import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { createProjectComponent } from "@/routes/issues/mutations";
import type {
  CreateProjectComponentInput,
  ProjectComponentMutationResponse,
} from "@/routes/issues/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId } = await context.params;
      const body = await readJsonBody<CreateProjectComponentInput>(request);
      const component = await createProjectComponent(actor, teamId, projectId, body);

      return NextResponse.json<ProjectComponentMutationResponse>(
        {
          component,
          message: `${component.name} is ready.`,
        },
        { status: 201 }
      );
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the component request.");
  }
}
