"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { NavigationConfig, defaultNavigationConfig } from "../navigation-config";

export interface BreadcrumbSegment {
    label: string;
    href?: string;
    isCurrentPage?: boolean;
    isDynamicSegment?: boolean;
}

interface NavigationHistoryState {
    entries: string[];
    index: number;
}

const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

const isNumericId = (str: string): boolean => {
    return /^\d+$/.test(str);
};

const NAVIGATION_HISTORY_STORAGE_KEY = "tracker-navigation-history";

const navigationHistoryListeners = new Set<() => void>();
let navigationHistoryState: NavigationHistoryState = { entries: [], index: -1 };
let hasInitializedNavigationHistory = false;

function subscribeNavigationHistory(listener: () => void) {
    navigationHistoryListeners.add(listener);

    return () => {
        navigationHistoryListeners.delete(listener);
    };
}

function getNavigationHistorySnapshot() {
    return navigationHistoryState;
}

function getServerNavigationHistorySnapshot(): NavigationHistoryState {
    return { entries: [], index: -1 };
}

function sanitizeNavigationHistoryState(value: unknown): NavigationHistoryState {
    if (!value || typeof value !== "object") {
        return { entries: [], index: -1 };
    }

    const candidate = value as Partial<NavigationHistoryState>;
    const entries = Array.isArray(candidate.entries)
        ? candidate.entries.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
        : [];

    if (entries.length === 0) {
        return { entries: [], index: -1 };
    }

    const index =
        typeof candidate.index === "number" && Number.isFinite(candidate.index)
            ? Math.min(Math.max(Math.trunc(candidate.index), 0), entries.length - 1)
            : entries.length - 1;

    return { entries, index };
}

function readNavigationHistoryState(): NavigationHistoryState {
    if (typeof window === "undefined") {
        return { entries: [], index: -1 };
    }

    try {
        const rawValue = window.sessionStorage.getItem(NAVIGATION_HISTORY_STORAGE_KEY);

        if (!rawValue) {
            return { entries: [], index: -1 };
        }

        return sanitizeNavigationHistoryState(JSON.parse(rawValue));
    } catch {
        return { entries: [], index: -1 };
    }
}

function writeNavigationHistoryState(nextState: NavigationHistoryState) {
    navigationHistoryState = nextState;

    if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
            NAVIGATION_HISTORY_STORAGE_KEY,
            JSON.stringify(nextState)
        );
    }

    navigationHistoryListeners.forEach((listener) => listener());
}

function ensureNavigationHistory(currentPath: string) {
    if (typeof window === "undefined") {
        return;
    }

    if (!hasInitializedNavigationHistory) {
        navigationHistoryState = readNavigationHistoryState();
        hasInitializedNavigationHistory = true;

        if (navigationHistoryState.entries.length > 0) {
            writeNavigationHistoryState(navigationHistoryState);
            return;
        }
    }

    if (navigationHistoryState.entries.length === 0) {
        writeNavigationHistoryState({ entries: [currentPath], index: 0 });
        return;
    }

    if (
        navigationHistoryState.index < 0 ||
        navigationHistoryState.index >= navigationHistoryState.entries.length
    ) {
        writeNavigationHistoryState({
            entries: navigationHistoryState.entries,
            index: navigationHistoryState.entries.length - 1,
        });
    }
}

function syncNavigationHistory(currentPath: string) {
    ensureNavigationHistory(currentPath);

    if (navigationHistoryState.entries.length === 0) {
        return;
    }

    const currentIndex = navigationHistoryState.index;
    const currentEntry = navigationHistoryState.entries[currentIndex];

    if (currentEntry === currentPath) {
        return;
    }

    const previousEntry = navigationHistoryState.entries[currentIndex - 1];
    if (previousEntry === currentPath) {
        writeNavigationHistoryState({
            entries: navigationHistoryState.entries,
            index: currentIndex - 1,
        });
        return;
    }

    const nextEntry = navigationHistoryState.entries[currentIndex + 1];
    if (nextEntry === currentPath) {
        writeNavigationHistoryState({
            entries: navigationHistoryState.entries,
            index: currentIndex + 1,
        });
        return;
    }

    const nextEntries = navigationHistoryState.entries.slice(0, currentIndex + 1);
    nextEntries.push(currentPath);

    writeNavigationHistoryState({
        entries: nextEntries,
        index: nextEntries.length - 1,
    });
}

function formatSegmentLabel(segment: string) {
    if (segment.match(/^\[.*\]$/) || isUUID(segment) || isNumericId(segment)) {
        return "Details";
    }

    return segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function buildTeamBreadcrumbs(pathname: string): BreadcrumbSegment[] | null {
    const segments = pathname.split("/").filter(Boolean);

    if (segments[0] !== "teams") {
        return null;
    }

    if (segments.length === 1) {
        return [
            {
                label: "Teams",
                href: "/teams",
                isCurrentPage: true,
            },
        ];
    }

    if (segments.length === 2) {
        return [
            {
                label: "Teams",
                href: "/teams",
            },
            {
                label: "Projects",
                isCurrentPage: true,
                isDynamicSegment: true,
            },
        ];
    }

    if (segments[2] === "projects" && segments[3]) {
        const breadcrumbs: BreadcrumbSegment[] = [
            {
                label: "Teams",
                href: "/teams",
            },
            {
                label: "Projects",
                isDynamicSegment: true,
            },
            {
                label: "Issues",
                isCurrentPage: segments.length === 4,
                isDynamicSegment: true,
            },
        ];

        if (segments.length > 4) {
            let currentPath = `/teams/${segments[1]}/projects/${segments[3]}`;

            segments.slice(4).forEach((segment, index) => {
                currentPath += `/${segment}`;

                breadcrumbs.push({
                    label: formatSegmentLabel(segment),
                    href:
                        index === segments.length - 5
                            ? undefined
                            : currentPath,
                    isCurrentPage: index === segments.length - 5,
                    isDynamicSegment:
                        segment.match(/^\[.*\]$/) !== null ||
                        isUUID(segment) ||
                        isNumericId(segment),
                });
            });
        }

        return breadcrumbs;
    }

    return null;
}

export function useNavigation(customConfig?: NavigationConfig) {
    const router = useRouter();
    const pathname = usePathname();
    const navigationHistory = useSyncExternalStore(
        subscribeNavigationHistory,
        getNavigationHistorySnapshot,
        getServerNavigationHistorySnapshot
    );

    const navigationConfig = useMemo(
        () => ({
            ...defaultNavigationConfig,
            ...customConfig,
        }),
        [customConfig]
    );

    useEffect(() => {
        syncNavigationHistory(pathname);
    }, [pathname]);

    const canGoBack = navigationHistory.index > 0;
    const canGoForward =
        navigationHistory.index >= 0 &&
        navigationHistory.index < navigationHistory.entries.length - 1;

    const goBack = useCallback(() => {
        if (canGoBack) {
            router.back();
        }
    }, [canGoBack, router]);

    const goForward = useCallback(() => {
        if (canGoForward) {
            router.forward();
        }
    }, [canGoForward, router]);

    const navigateTo = useCallback(
        (path: string) => {
            router.push(path);
        },
        [router]
    );

    const generateBreadcrumbs = useCallback((): BreadcrumbSegment[] => {
        const teamBreadcrumbs = buildTeamBreadcrumbs(pathname);

        if (teamBreadcrumbs) {
            return teamBreadcrumbs;
        }

        const segments = pathname.split("/").filter(Boolean);
        const breadcrumbs: BreadcrumbSegment[] = [];

        let currentPath = "";
        let parentPath = "";

        segments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const isLastSegment = index === segments.length - 1;
            let isDynamicSegment = false;
            let linkHref = currentPath; // Default to current path

            // Check if we have a custom label for this exact path
            const config = navigationConfig[currentPath];
            let label = config?.label;

            // If no exact match, check if this might be a dynamic segment
            if (!label) {
                // Check if the parent path has dynamic segment configuration
                const parentConfig = navigationConfig[parentPath];

                if (parentConfig?.dynamicSegments) {
                    // Check if this segment matches any dynamic pattern
                    if (isUUID(segment)) {
                        label = parentConfig.dynamicSegments["uuid"];
                        isDynamicSegment = true;
                        linkHref = parentPath;
                    } else if (isNumericId(segment)) {
                        label = parentConfig.dynamicSegments["id"];
                        isDynamicSegment = true;
                        linkHref = parentPath;
                    } else if (parentConfig.dynamicSegments[segment]) {
                        label = parentConfig.dynamicSegments[segment];
                        isDynamicSegment = true;
                        linkHref = parentPath;
                    }
                }
            }

            // If still no label, try to generate one from the segment
            if (!label) {
                // Handle dynamic routes (e.g., [id])
                if (segment.match(/^\[.*\]$/)) {
                    label = "Details";
                    isDynamicSegment = true;
                    linkHref = parentPath;
                } else if (isUUID(segment)) {
                    label = "Details";
                    isDynamicSegment = true;
                    linkHref = parentPath;
                } else {
                    label = formatSegmentLabel(segment);
                }
            }

            breadcrumbs.push({
                label,
                href: !isLastSegment && linkHref ? linkHref : undefined,
                isCurrentPage: isLastSegment,
                isDynamicSegment,
            });

            parentPath = currentPath;
        });

        return breadcrumbs;
    }, [pathname, navigationConfig]);

    const breadcrumbs = useMemo(() => generateBreadcrumbs(), [generateBreadcrumbs]);

    return {
        goBack,
        goForward,
        navigateTo,
        breadcrumbs,
        currentPath: pathname,
        canGoBack,
        canGoForward,
    };
}
