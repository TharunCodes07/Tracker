from __future__ import annotations

import json
import sys
from copy import copy
from datetime import date, datetime
from pathlib import Path
from typing import Any

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill


HEADERS = [
    "No",
    "Navigation",
    "Issue",
    "Priority",
    "Assigned to",
    "Status",
    "Comments",
    "Remark",
    "Tested By",
    "Fixed Date",
    "Development",
    "Deployement",
]

HEADER_ALIASES = {
    "no": "no",
    "navigation": "navigation",
    "issue": "title",
    "priority": "priority",
    "assignedto": "assignedToName",
    "status": "status",
    "comments": "comments",
    "remark": "remark",
    "testedby": "testedByName",
    "fixeddate": "fixedDate",
    "development": "development",
    "deployement": "deployment",
    "deployment": "deployment",
}

COLUMN_WIDTHS = {
    "A": 10,
    "B": 24,
    "C": 42,
    "D": 14,
    "E": 24,
    "F": 16,
    "G": 32,
    "H": 32,
    "I": 24,
    "J": 14,
    "K": 14,
    "L": 14,
}

PRIORITY_STYLES = {
    "low": {
        "fill": PatternFill(fill_type="solid", fgColor="DCFCE7"),
        "font": Font(color="166534", bold=True),
    },
    "medium": {
        "fill": PatternFill(fill_type="solid", fgColor="FEF3C7"),
        "font": Font(color="92400E", bold=True),
    },
    "high": {
        "fill": PatternFill(fill_type="solid", fgColor="FED7AA"),
        "font": Font(color="9A3412", bold=True),
    },
    "critical": {
        "fill": PatternFill(fill_type="solid", fgColor="FECACA"),
        "font": Font(color="991B1B", bold=True),
    },
}


def normalize_header(value: Any) -> str:
    return "".join(ch for ch in str(value or "").strip().lower() if ch.isalnum())


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None

    normalized = str(value).strip()
    return normalized or None


def normalize_number(value: Any) -> int | None:
    if value in (None, ""):
        return None

    if isinstance(value, bool):
        return None

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return int(value)

    text_value = str(value).strip()
    if not text_value:
        return None

    try:
        return int(float(text_value))
    except ValueError:
        return None


def normalize_date(value: Any) -> str | None:
    if value in (None, ""):
        return None

    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, date):
        return value.isoformat()

    text_value = str(value).strip()
    return text_value or None


def normalize_boolean(value: Any) -> bool | None:
    if value in (None, ""):
        return None

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return bool(value)

    normalized_value = str(value).strip().lower()

    if normalized_value in {"yes", "y", "true", "1", "done", "checked"}:
        return True

    if normalized_value in {"no", "n", "false", "0", "pending", "unchecked"}:
        return False

    return None


def normalize_priority_key(value: Any) -> str:
    normalized_value = str(value or "").strip().lower()
    return "".join(ch for ch in normalized_value if ch.isalnum())


def export_rows(input_path: Path, output_path: Path) -> None:
    rows = json.loads(input_path.read_text(encoding="utf-8-sig"))
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Issues"
    worksheet.append(HEADERS)
    worksheet.freeze_panes = "A2"

    for row in rows:
        fixed_date = row.get("fixedDate")
        date_value: date | None = None

        if fixed_date:
            try:
                date_value = datetime.fromisoformat(str(fixed_date)).date()
            except ValueError:
                try:
                    date_value = date.fromisoformat(str(fixed_date)[:10])
                except ValueError:
                    date_value = None

        worksheet.append(
            [
                row.get("no"),
                row.get("navigation"),
                row.get("title"),
                row.get("priority"),
                row.get("assignedToName"),
                row.get("status"),
                row.get("comments"),
                row.get("remark"),
                row.get("testedByName"),
                date_value,
                "Yes" if row.get("development") else "No",
                "Yes" if row.get("deployment") else "No",
            ]
        )

    for cell in worksheet[1]:
        cell_font = copy(cell.font)
        cell_font.bold = True
        cell.font = cell_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for row in worksheet.iter_rows(min_row=2):
        priority_cell = row[3]
        priority_key = normalize_priority_key(priority_cell.value)
        priority_style = PRIORITY_STYLES.get(priority_key)

        if priority_style:
            priority_cell.fill = priority_style["fill"]
            priority_cell.font = priority_style["font"]

        priority_cell.alignment = Alignment(horizontal="center", vertical="center")
        row[9].alignment = Alignment(horizontal="center", vertical="center")
        row[10].alignment = Alignment(horizontal="center", vertical="center")
        row[11].alignment = Alignment(horizontal="center", vertical="center")

        if row[9].value:
            row[9].number_format = "yyyy-mm-dd"

    for column_name, width in COLUMN_WIDTHS.items():
        worksheet.column_dimensions[column_name].width = width

    output_path.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output_path)


def import_rows(input_path: Path, output_path: Path) -> None:
    workbook = load_workbook(input_path, data_only=True)
    worksheet = workbook.active
    rows = list(worksheet.iter_rows(values_only=True))

    if not rows:
        output_path.write_text("[]", encoding="utf-8")
        return

    header_row = rows[0]
    canonical_headers = []

    for header in header_row:
        header_key = normalize_header(header)
        canonical_header = HEADER_ALIASES.get(header_key)

        if canonical_header is None:
            canonical_headers.append(None)
            continue

        canonical_headers.append(canonical_header)

    missing_headers = [
        header
        for header_key, header in (
            ("no", "No"),
            ("navigation", "Navigation"),
            ("title", "Issue"),
            ("priority", "Priority"),
            ("assignedToName", "Assigned to"),
            ("status", "Status"),
            ("comments", "Comments"),
            ("remark", "Remark"),
            ("testedByName", "Tested By"),
            ("fixedDate", "Fixed Date"),
            ("development", "Development"),
            ("deployment", "Deployement"),
        )
        if header_key not in canonical_headers
    ]

    if missing_headers:
        raise ValueError(f"Missing required Excel header(s): {', '.join(missing_headers)}")

    parsed_rows = []

    for row_number, values in enumerate(rows[1:], start=2):
        row_payload: dict[str, Any] = {
            "rowNumber": row_number,
            "no": None,
            "navigation": None,
            "title": None,
            "priority": None,
            "assignedToName": None,
            "status": None,
            "comments": None,
            "remark": None,
            "testedByName": None,
            "fixedDate": None,
            "development": None,
            "deployment": None,
        }

        is_empty = True

        for header_key, cell_value in zip(canonical_headers, values):
            if header_key is None:
                continue

            if cell_value not in (None, ""):
                is_empty = False

            if header_key == "no":
                row_payload["no"] = normalize_number(cell_value)
            elif header_key == "fixedDate":
                row_payload["fixedDate"] = normalize_date(cell_value)
            elif header_key in {"development", "deployment"}:
                row_payload[header_key] = normalize_boolean(cell_value)
            else:
                row_payload[header_key] = normalize_text(cell_value)

        if is_empty:
            continue

        parsed_rows.append(row_payload)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(parsed_rows), encoding="utf-8")


def main() -> int:
    if len(sys.argv) != 4:
        raise SystemExit("Usage: issues_excel.py <export|import> <input> <output>")

    command = sys.argv[1]
    input_path = Path(sys.argv[2])
    output_path = Path(sys.argv[3])

    if command == "export":
        export_rows(input_path, output_path)
        return 0

    if command == "import":
        import_rows(input_path, output_path)
        return 0

    raise SystemExit(f"Unsupported command: {command}")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # pragma: no cover - CLI failure path
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
