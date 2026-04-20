import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import type { IssueExcelRow } from "@/routes/issues/types";

const execFileAsync = promisify(execFile);
const PYTHON_BIN = process.platform === "win32" ? "python" : "python3";
const SCRIPT_PATH = join(process.cwd(), "scripts", "issues_excel.py");

export async function buildIssueWorkbook(rows: IssueExcelRow[]) {
  const tempDir = await mkdtemp(join(tmpdir(), "tracker-issues-export-"));
  const inputPath = join(tempDir, "issues.json");
  const outputPath = join(tempDir, "issues.xlsx");

  try {
    await writeFile(inputPath, JSON.stringify(rows), "utf8");
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

export async function readIssueWorkbook(fileBuffer: Buffer): Promise<IssueExcelRow[]> {
  const tempDir = await mkdtemp(join(tmpdir(), "tracker-issues-import-"));
  const inputPath = join(tempDir, "issues.xlsx");
  const outputPath = join(tempDir, "issues.json");

  try {
    await writeFile(inputPath, fileBuffer);
    await execFileAsync(PYTHON_BIN, [SCRIPT_PATH, "import", inputPath, outputPath], {
      cwd: process.cwd(),
    });

    const parsedJson = await readFile(outputPath, "utf8");

    return JSON.parse(parsedJson) as IssueExcelRow[];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The Excel workbook could not be parsed.";

    throw new Error(message);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
