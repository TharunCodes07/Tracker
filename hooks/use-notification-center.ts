"use client";

import { startTransition, useCallback, useEffect, useState } from "react";

import type {
  NotificationListItem,
  NotificationMutationResponse,
  NotificationsResponse,
} from "@/routes/notifications/types";

const DEFAULT_LIMIT = 12;
const REFRESH_INTERVAL_MS = 60_000;

async function requestJson<TResponse>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(data?.message ?? "Request failed.");
  }

  return data as TResponse;
}

function buildNotificationsUrl(limit: number) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
  });

  return `/api/notifications?${searchParams.toString()}`;
}

type RefreshMode = "initial" | "background" | "foreground";

export function useNotificationCenter(limit = DEFAULT_LIMIT) {
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async (mode: RefreshMode = "foreground") => {
    if (mode === "initial") {
      setIsLoading(true);
    }

    if (mode === "foreground") {
      setIsRefreshing(true);
    }

    try {
      const data = await requestJson<NotificationsResponse>(buildNotificationsUrl(limit));

      startTransition(() => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setLoadError(null);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load notifications.";

      startTransition(() => {
        setLoadError(message);
      });
    } finally {
      if (mode === "initial") {
        setIsLoading(false);
      }

      if (mode === "foreground") {
        setIsRefreshing(false);
      }
    }
  }, [limit]);

  const markAsRead = useCallback(async (notification: NotificationListItem) => {
    if (!notification.isRead) {
      const readAt = new Date().toISOString();

      startTransition(() => {
        setNotifications((currentNotifications) =>
          currentNotifications.map((currentNotification) =>
            currentNotification.id === notification.id
              ? {
                  ...currentNotification,
                  isRead: true,
                  readAt,
                }
              : currentNotification
          )
        );
        setUnreadCount((currentUnreadCount) => Math.max(0, currentUnreadCount - 1));
      });
    }

    try {
      await requestJson<NotificationMutationResponse>(`/api/notifications/${notification.id}`, {
        method: "PATCH",
      });
    } catch {
      await refresh("background");
    }
  }, [refresh]);

  useEffect(() => {
    let isActive = true;

    async function loadInitialNotifications() {
      try {
        const data = await requestJson<NotificationsResponse>(buildNotificationsUrl(limit));

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
          setLoadError(null);
          setIsLoading(false);
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Could not load notifications.";

        startTransition(() => {
          setLoadError(message);
          setIsLoading(false);
        });
      }
    }

    void loadInitialNotifications();

    return () => {
      isActive = false;
    };
  }, [limit]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh("background");
      }
    }, REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      void refresh("background");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh("background");
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    loadError,
    refreshNotifications: () => refresh("foreground"),
    markNotificationAsRead: markAsRead,
  };
}
