import { NextResponse } from "next/server";

import { handleRouteError, requireRouteUser } from "@/routes/http";
import { isIssueMediaType, uploadIssueMediaForProject } from "@/routes/issues/media";
import type { IssueMediaUploadResponse } from "@/routes/issues/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, projectId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    const mediaType = String(formData.get("mediaType") ?? "");

    if (!isIssueMediaType(mediaType)) {
      return NextResponse.json({ message: "Choose a valid media type." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Choose a file to upload." }, { status: 400 });
    }

    const response = await uploadIssueMediaForProject(actor, teamId, projectId, mediaType, file);

    return NextResponse.json<IssueMediaUploadResponse>(response, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while uploading issue media.");
  }
}
