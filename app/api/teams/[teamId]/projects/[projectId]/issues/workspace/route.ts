import { NextResponse } from "next/server";

import { handleRouteError, withRouteOrganization } from "@/routes/http";
import { getProjectIssuesWorkspaceForUser } from "@/routes/issues/queries";
import type { ProjectIssuesWorkspaceResponse } from "@/routes/issues/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId } = await context.params;
      const workspace = await getProjectIssuesWorkspaceForUser(actor.id, teamId, projectId);

      if (!workspace) {
        return NextResponse.json({ message: "Project not found." }, { status: 404 });
      }

      return NextResponse.json<ProjectIssuesWorkspaceResponse>(workspace);
    });
  } catch (error) {
    return handleRouteError(
      error,
      "Something went wrong while handling the issue workspace request."
    );
  }
}
