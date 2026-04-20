"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationCenter } from "@/hooks/use-notification-center";
import { cn } from "@/lib/utils";

import type { NotificationListItem } from "@/routes/notifications/types";

function NotificationMenuSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border/60 px-3 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function NotificationsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    loadError,
    refreshNotifications,
    markNotificationAsRead,
  } = useNotificationCenter();

  const hasUnreadNotifications = unreadCount > 0;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      void refreshNotifications();
    }
  }

  function handleNotificationSelect(notification: NotificationListItem) {
    void markNotificationAsRead(notification);
    setOpen(false);
    router.push(notification.href);
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "relative rounded-full",
            hasUnreadNotifications && "bg-red-500/5 text-foreground hover:bg-red-500/10"
          )}
          aria-label={
            hasUnreadNotifications
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />
          {hasUnreadNotifications ? (
            <span className="pointer-events-none absolute right-1.5 top-1.5 flex size-3 items-center justify-center">
              <span className="tracker-notification-heartbeat absolute size-4 rounded-full bg-red-500/20" />
              <span className="relative size-2.5 rounded-full border border-background bg-red-500" />
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[22rem] max-w-[calc(100vw-1rem)] rounded-2xl p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-3">
          <div className="min-w-0">
            <DropdownMenuLabel className="px-0 py-0 text-sm font-semibold text-foreground">
              Notifications
            </DropdownMenuLabel>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasUnreadNotifications ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            onClick={() => void refreshNotifications()}
            disabled={isRefreshing}
            aria-label="Refresh notifications"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
        </div>

        {isLoading && notifications.length === 0 ? (
          <NotificationMenuSkeleton />
        ) : loadError && notifications.length === 0 ? (
          <div className="space-y-3 px-3 py-6 text-center">
            <p className="text-sm font-medium text-foreground">Could not load notifications</p>
            <p className="text-xs leading-5 text-muted-foreground">{loadError}</p>
            <div className="flex justify-center">
              <Button type="button" variant="outline" size="sm" onClick={() => void refreshNotifications()}>
                Retry
              </Button>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm font-medium text-foreground">No notifications yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              New project and issue activity will show up here.
            </p>
          </div>
        ) : (
          <div>
            <div className="max-h-96 overflow-y-auto p-1.5">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <DropdownMenuItem
                    className={cn(
                      "items-start gap-3 rounded-xl px-3 py-3",
                      !notification.isRead && "bg-red-500/5"
                    )}
                    onSelect={() => handleNotificationSelect(notification)}
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2.5 shrink-0 rounded-full",
                        notification.isRead ? "bg-border" : "bg-red-500"
                      )}
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-medium text-foreground">
                          {notification.title}
                        </p>
                        <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>
                  </DropdownMenuItem>

                  {index < notifications.length - 1 ? (
                    <DropdownMenuSeparator className="mx-2" />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-border/70 p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => {
                  setOpen(false);
                  router.push("/notifications");
                }}
              >
                View all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  setOpen(false);
                  router.push("/notifications?unreadOnly=true");
                }}
              >
                Unread
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
