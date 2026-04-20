import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import type { IssueExcelRow, IssueExcelSheet, IssueExcelWorkbook } from "@/routes/issues/types";

const execFileAsync = promisify(execFile);
const PYTHON_BIN = process.platform === "win32" ? "python" : "python3";
const SCRIPT_PATH = join(process.cwd(), "scripts", "issues_excel.py");

export async function buildIssueWorkbook(rowsOrSheets: IssueExcelRow[] | IssueExcelSheet[]) {
  const tempDir = await mkdtemp(join(tmpdir(), "tracker-issues-export-"));
  const inputPath = join(tempDir, "issues.json");
  const outputPath = join(tempDir, "issues.xlsx");

  try {
    const payload =
      rowsOrSheets.length > 0 && "sheetName" in rowsOrSheets[0]
        ? { sheets: rowsOrSheets as IssueExcelSheet[] }
        : rowsOrSheets;

    await writeFile(inputPath, JSON.stringify(payload), "utf8");
    await execFileAsync(PYTHON_BIN, [SCRIPT_PATH, "export", inputPath, outputPath], {
      cwd: process.cwd(),
    });

    return await readFile(outputPath);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The Excel workbook could not be generated.";

    throw new Error(message);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function buildIssueWorkbookBundle(workbooks: IssueExcelWorkbook[]) {
  const tempDir = await mkdtemp(join(tmpdir(), "tracker-issues-export-bundle-"));
  const inputPath = join(tempDir, "issues.json");
  const outputPath = join(tempDir, "issues.zip");

  try {
    await writeFile(inputPath, JSON.stringify({ workbooks }), "utf8");
    await execFileAsync(PYTHON_BIN, [SCRIPT_PATH, "export-bundle", inputPath, outputPath], {
      cwd: process.cwd(),
    });

    return await readFile(outputPath);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The Excel export bundle could not be generated.";

    throw new Error(message);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function readIssueWorkbook(fileBuffer: Buffer): Promise<IssueExcelSheet[]> {
  const tempDir = await mkdtemp(join(tmpdir(), "tracker-issues-import-"));
  const inputPath = join(tempDir, "issues.xlsx");
  const outputPath = join(tempDir, "issues.json");

  try {
    await writeFile(inputPath, fileBuffer);
    await execFileAsync(PYTHON_BIN, [SCRIPT_PATH, "import", inputPath, outputPath], {
      cwd: process.cwd(),
    });

    const parsedJson = await readFile(outputPath, "utf8");

    const parsedWorkbook = JSON.parse(parsedJson) as
      | { sheets?: IssueExcelSheet[] }
      | IssueExcelRow[];

    if (Array.isArray(parsedWorkbook)) {
      return [
        {
          sheetName: "Imported issues",
          rows: parsedWorkbook,
        },
      ];
    }

    return parsedWorkbook.sheets ?? [];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The Excel workbook could not be parsed.";

    throw new Error(message);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
