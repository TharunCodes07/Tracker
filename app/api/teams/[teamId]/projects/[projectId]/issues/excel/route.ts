import { NextRequest, NextResponse } from "next/server";

import { RouteError } from "@/routes/errors";
import { handleRouteError, requireRouteUser } from "@/routes/http";
import { buildIssueWorkbook, readIssueWorkbook } from "@/routes/issues/excel-bridge";
import { readListProjectIssuesInput } from "@/routes/issues/http";
import { importIssuesFromExcel } from "@/routes/issues/mutations";
import { listProjectIssuesForExcelForUser } from "@/routes/issues/queries";
import type { IssueExcelImportResponse } from "@/routes/issues/types";

export const runtime = "nodejs";

function slugifyFileNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, projectId } = await context.params;
    const listInput = readListProjectIssuesInput(request, {
      defaultPageSize: 2147483647,
      maxPageSize: 2147483647,
    });
    const issues = await listProjectIssuesForExcelForUser(actor.id, teamId, projectId, listInput);

    if (!issues) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    const workbook = await buildIssueWorkbook(issues);
    const projectLabel = slugifyFileNamePart(
      request.nextUrl.searchParams.get("project") ?? projectId
    );
    const fileName = `${projectLabel || "project"}-issues.xlsx`;

    return new NextResponse(workbook, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while exporting the Excel file.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, projectId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Choose an Excel file to import." }, { status: 400 });
    }

    let workbookRows;

    try {
      workbookRows = await readIssueWorkbook(Buffer.from(await file.arrayBuffer()));
    } catch (error) {
      throw new RouteError(
        error instanceof Error
          ? error.message
          : "The uploaded Excel file could not be read.",
        400
      );
    }

    const result = await importIssuesFromExcel(actor, teamId, projectId, workbookRows);

    return NextResponse.json<IssueExcelImportResponse>(result);
  } catch (error) {
    return handleRouteError(error, "Something went wrong while importing the Excel file.");
  }
}
