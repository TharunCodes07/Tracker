import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { createProjectModule } from "@/routes/issues/mutations";
import type {
  CreateProjectModuleInput,
  ProjectModuleMutationResponse,
} from "@/routes/issues/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId } = await context.params;
      const body = await readJsonBody<CreateProjectModuleInput>(request);
      const projectModule = await createProjectModule(actor, teamId, projectId, body);

      return NextResponse.json<ProjectModuleMutationResponse>(
        {
          module: projectModule,
          message: `${projectModule.name} is ready.`,
        },
        {
          status: 201,
        }
      );
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the module request.");
  }
}
