"use client";

import { useEffect, useState } from "react";

const RECENT_PROJECTS_STORAGE_KEY = "tracker-recent-projects";
const RECENT_PROJECTS_EVENT_NAME = "tracker:recent-projects-changed";
const MAX_RECENT_PROJECTS = 6;

export interface RecentProjectEntry {
  teamId: string;
  projectId: string;
  projectName: string;
  teamName: string;
  href: string;
  accessedAt: string;
}

function normalizeProjectHref(value: string, teamId: string, projectId: string) {
  const fallbackHref = `/teams/${teamId}/projects/${projectId}`;
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return fallbackHref;
  }

  return normalizedValue.replace(/\/+$/, "") || fallbackHref;
}

function dedupeRecentProjects(entries: RecentProjectEntry[]) {
  const seenProjectKeys = new Set<string>();
  const dedupedEntries: RecentProjectEntry[] = [];

  for (const entry of entries) {
    const projectKey = `${entry.teamId}:${entry.projectId}`;

    if (seenProjectKeys.has(projectKey)) {
      continue;
    }

    seenProjectKeys.add(projectKey);
    dedupedEntries.push({
      ...entry,
      href: normalizeProjectHref(entry.href, entry.teamId, entry.projectId),
    });
  }

  return dedupedEntries;
}

function isRecentProjectEntry(value: unknown): value is RecentProjectEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RecentProjectEntry>;

  return (
    typeof candidate.teamId === "string" &&
    typeof candidate.projectId === "string" &&
    typeof candidate.projectName === "string" &&
    typeof candidate.teamName === "string" &&
    typeof candidate.href === "string" &&
    typeof candidate.accessedAt === "string"
  );
}

function readRecentProjectsFromStorage() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return dedupeRecentProjects(parsedValue.filter(isRecentProjectEntry));
  } catch {
    return [];
  }
}

function writeRecentProjectsToStorage(entries: RecentProjectEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(RECENT_PROJECTS_EVENT_NAME));
}

export function saveRecentProject(
  entry: Omit<RecentProjectEntry, "accessedAt" | "href"> & { href?: string }
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedEntry: RecentProjectEntry = {
    ...entry,
    href: normalizeProjectHref(
      entry.href ?? `/teams/${entry.teamId}/projects/${entry.projectId}`,
      entry.teamId,
      entry.projectId
    ),
    accessedAt: new Date().toISOString(),
  };

  const nextEntries = dedupeRecentProjects([
    normalizedEntry,
    ...readRecentProjectsFromStorage().filter(
      (currentEntry) =>
        !(
          currentEntry.teamId === normalizedEntry.teamId &&
          currentEntry.projectId === normalizedEntry.projectId
        )
    ),
  ]).slice(0, MAX_RECENT_PROJECTS);

  writeRecentProjectsToStorage(nextEntries);
}

export function useRecentProjects(limit = MAX_RECENT_PROJECTS) {
  const [projects, setProjects] = useState<RecentProjectEntry[]>([]);

  useEffect(() => {
    function syncRecentProjects() {
      setProjects(readRecentProjectsFromStorage().slice(0, limit));
    }

    syncRecentProjects();

    window.addEventListener(RECENT_PROJECTS_EVENT_NAME, syncRecentProjects);
    window.addEventListener("storage", syncRecentProjects);

    return () => {
      window.removeEventListener(RECENT_PROJECTS_EVENT_NAME, syncRecentProjects);
      window.removeEventListener("storage", syncRecentProjects);
    };
  }, [limit]);

  return projects;
}