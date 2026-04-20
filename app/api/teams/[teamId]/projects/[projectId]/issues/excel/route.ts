import { NextRequest, NextResponse } from "next/server";

import { RouteError } from "@/routes/errors";
import { handleRouteError, requireRouteUser } from "@/routes/http";
import {
  buildIssueWorkbook,
  buildIssueWorkbookBundle,
  readIssueWorkbook,
} from "@/routes/issues/excel-bridge";
import { readListProjectIssuesInput } from "@/routes/issues/http";
import { importIssuesFromExcel } from "@/routes/issues/mutations";
import {
  listProjectIssueWorkbookBundleForUser,
  listProjectIssuesForExcelForUser,
} from "@/routes/issues/queries";
import type { IssueExcelImportResponse } from "@/routes/issues/types";

export const runtime = "nodejs";

function parseExportMode(value: string | null) {
  return value === "bundle" ? "bundle" : "current";
}

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
    const exportMode = parseExportMode(request.nextUrl.searchParams.get("mode"));
    const projectLabel = slugifyFileNamePart(
      request.nextUrl.searchParams.get("project") ?? projectId
    );

    if (exportMode === "bundle") {
      const workbooks = await listProjectIssueWorkbookBundleForUser(
        actor.id,
        teamId,
        projectId,
        request.nextUrl.searchParams.get("project") ?? projectId
      );

      if (!workbooks) {
        return NextResponse.json({ message: "Project not found." }, { status: 404 });
      }

      const bundle = await buildIssueWorkbookBundle(workbooks);
      const fileName = `${projectLabel || "project"}-issues.zip`;

      return new NextResponse(bundle, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const listInput = readListProjectIssuesInput(request, {
      defaultPageSize: 2147483647,
      maxPageSize: 2147483647,
    });
    const issues = await listProjectIssuesForExcelForUser(actor.id, teamId, projectId, listInput);

    if (!issues) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    const workbook = await buildIssueWorkbook(issues);
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
    const mainModuleId = String(formData.get("mainModuleId") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Choose an Excel file to import." }, { status: 400 });
    }

    if (!mainModuleId) {
      return NextResponse.json({ message: "Choose a main module for this import." }, { status: 400 });
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

    const result = await importIssuesFromExcel(
      actor,
      teamId,
      projectId,
      mainModuleId,
      workbookRows
    );

    return NextResponse.json<IssueExcelImportResponse>(result);
  } catch (error) {
    return handleRouteError(error, "Something went wrong while importing the Excel file.");
  }
}
