import { NextResponse } from "next/server";

import { handleRouteError, withRouteOrganization } from "@/routes/http";
import { getIssueMediaSignedUrlForUser } from "@/routes/issues/media";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ teamId: string; projectId: string; issueId: string; mediaId: string }>;
  }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId, issueId, mediaId } = await context.params;
      const response = await getIssueMediaSignedUrlForUser(
        actor.id,
        teamId,
        projectId,
        issueId,
        mediaId
      );

      if (!response) {
        return NextResponse.json({ message: "Media not found." }, { status: 404 });
      }

      return NextResponse.redirect(response.url);
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while opening issue media.");
  }
}
