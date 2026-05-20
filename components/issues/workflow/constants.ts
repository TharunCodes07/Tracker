import type { ComponentType } from "react";

import type { SortingState } from "@tanstack/react-table";
import {
  Archive,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Component as ComponentIcon,
  Flag,
  KanbanSquare,
  Layers3,
  Settings,
} from "lucide-react";

import type { ProjectWorkflowView } from "./types";

export const NONE_VALUE = "__none__";
export const ALL_VALUE = "__all__";
export const DEFAULT_SORTING: SortingState = [{ id: "updatedAt", desc: true }];

export const VIEW_NAVIGATION: {
  value: Exclude<ProjectWorkflowView, "issue" | "reports" | "components">;
  label: string;
  icon: ComponentType<{ className?: string }>;
  path: string;
}[] = [
  { value: "summary", label: "Summary", icon: ChartColumn, path: "" },
  { value: "board", label: "Board", icon: KanbanSquare, path: "/board" },
  { value: "issues", label: "Issues", icon: ClipboardList, path: "/issues" },
  { value: "backlog", label: "Backlog", icon: Archive, path: "/backlog" },
  { value: "modules", label: "Modules", icon: ComponentIcon, path: "/modules" },
  { value: "releases", label: "Releases", icon: Flag, path: "/releases" },
  { value: "epics", label: "Epics", icon: Layers3, path: "/epics" },
  { value: "sprints", label: "Sprints", icon: CalendarDays, path: "/sprints" },
  { value: "settings", label: "Settings", icon: Settings, path: "/settings" },
];
