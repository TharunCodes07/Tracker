"use client";

import { useSyncExternalStore } from "react";

export type ViewMode = "grid" | "table";

const viewModeListeners = new Map<string, Set<() => void>>();

function getViewModeListeners(storageKey: string) {
  let listeners = viewModeListeners.get(storageKey);

  if (!listeners) {
    listeners = new Set<() => void>();
    viewModeListeners.set(storageKey, listeners);
  }

  return listeners;
}

function readStoredViewMode(storageKey: string, fallback: ViewMode) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const storedViewMode = window.localStorage.getItem(storageKey);

    if (storedViewMode === "grid" || storedViewMode === "table") {
      return storedViewMode;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function subscribeToViewMode(
  storageKey: string,
  onStoreChange: () => void
) {
  const listeners = getViewModeListeners(storageKey);

  listeners.add(onStoreChange);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(onStoreChange);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function storeViewMode(storageKey: string, nextViewMode: ViewMode) {
  try {
    window.localStorage.setItem(storageKey, nextViewMode);
  } catch {
    // Ignore storage access errors so view switching still works in memory.
  }

  for (const listener of getViewModeListeners(storageKey)) {
    listener();
  }
}

export function usePersistedViewMode(
  storageKey: string,
  fallback: ViewMode = "grid"
) {
  const viewMode = useSyncExternalStore(
    (onStoreChange) => subscribeToViewMode(storageKey, onStoreChange),
    () => readStoredViewMode(storageKey, fallback),
    () => fallback
  );

  return {
    viewMode,
    setViewMode: (nextViewMode: ViewMode) => storeViewMode(storageKey, nextViewMode),
  };
}
