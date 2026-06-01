import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import { BellRing, ChevronRight, Filter, Inbox, Layers3 } from "lucide-react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TeamInviteNotificationAction } from "@/components/notifications/team-invite-notification-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  requireServerSession,
  withServerOrganization,
} from "@/lib/auth-session";
import { cn } from "@/lib/utils";
import { listNotificationsForUser } from "@/routes/notifications/queries";
import type { NotificationListItem } from "@/routes/notifications/types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function parsePositiveInteger(
  value: string | string[] | undefined,
  fallback: number,
) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

function parseUnreadOnly(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return rawValue === "true" || rawValue === "1";
}

function buildNotificationsHref(options: {
  page?: number;
  pageSize?: number;
  unreadOnly: boolean;
}) {
  const searchParams = new URLSearchParams();

  if (options.page && options.page > 1) {
    searchParams.set("page", String(options.page));
  }

  if (options.pageSize && options.pageSize !== DEFAULT_PAGE_SIZE) {
    searchParams.set("pageSize", String(options.pageSize));
  }

  if (options.unreadOnly) {
    searchParams.set("unreadOnly", "true");
  }

  const queryString = searchParams.toString();

  return queryString ? `/notifications?${queryString}` : "/notifications";
}

function getNotificationAccentClassName(notification: NotificationListItem) {
  switch (notification.trigger) {
    case "team.invited":
      return "border-sky-400/30 bg-sky-400/10 text-sky-700 dark:text-sky-300";
    case "team.role_assigned":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300";
    case "issue.ready_for_test":
    case "issue.fixed":
    case "issue.deployed":
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300";
    case "issue.marked_for_review":
      return "border-indigo-400/30 bg-indigo-400/10 text-indigo-700 dark:text-indigo-300";
    case "issue.reopened":
      return "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300";
    case "issue.assigned":
    case "issue.assigned_to_role":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300";
    case "project.created":
      return "border-violet-400/30 bg-violet-400/10 text-violet-700 dark:text-violet-300";
    case "issue.created":
    default:
      return "border-rose-400/30 bg-rose-400/10 text-rose-700 dark:text-rose-300";
  }
}

function getNotificationLabel(notification: NotificationListItem) {
  switch (notification.trigger) {
    case "team.invited":
      return "Invite";
    case "team.role_assigned":
      return "Team role";
    case "issue.ready_for_test":
      return "Ready for test";
    case "issue.fixed":
      return "Fixed";
    case "issue.deployed":
      return "Deployed";
    case "issue.marked_for_review":
      return "Review";
    case "issue.reopened":
      return "Reopened";
    case "issue.assigned":
    case "issue.assigned_to_role":
      return "Assigned";
    case "project.created":
      return "Project";
    case "issue.created":
    default:
      return "Issue";
  }
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireServerSession({
    roles: ["ADMIN", "USER"],
    organizationRequired: true,
  });
  const resolvedSearchParams = await searchParams;
  const unreadOnly = parseUnreadOnly(resolvedSearchParams.unreadOnly);
  const page = parsePositiveInteger(resolvedSearchParams.page, DEFAULT_PAGE);
  const pageSize = parsePositiveInteger(
    resolvedSearchParams.pageSize,
    DEFAULT_PAGE_SIZE,
  );
  const notificationCenter = await withServerOrganization(
    () =>
      listNotificationsForUser(session.user.id, {
        page,
        pageSize,
        unreadOnly,
      }),
    { roles: ["ADMIN", "USER"] },
  );

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[32px] border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.62))] px-5 py-5 shadow-sm dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.1),transparent_28%),linear-gradient(180deg,rgba(9,14,19,0.94),rgba(9,14,19,0.86))] sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge
              variant="outline"
              className="w-fit border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
            >
              <BellRing className="h-3.5 w-3.5" />
              Notification inbox
            </Badge>

            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Team activity in one place
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Scan the latest project and issue updates, filter unread
                activity, and jump back into the exact workspace that needs
                attention.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-border/60 bg-background/75 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Total
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">
                {notificationCenter.pagination.totalItems}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                matching this view
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/75 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Unread
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">
                {notificationCenter.unreadCount}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                still need review
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/75 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Filter
              </div>
              <div className="mt-2 text-xl font-semibold text-foreground">
                {notificationCenter.unreadOnly ? "Unread only" : "All activity"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                switch from the controls below
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-border/60 bg-card/80 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4 text-cyan-500" />
              View
            </div>
            <p className="text-sm text-muted-foreground">
              {notificationCenter.unreadOnly
                ? "Only unread notifications are shown."
                : "All notifications are shown, newest first."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant={notificationCenter.unreadOnly ? "outline" : "default"}
            >
              <Link href={buildNotificationsHref({ unreadOnly: false })}>
                All notifications
              </Link>
            </Button>
            <Button
              asChild
              variant={notificationCenter.unreadOnly ? "default" : "outline"}
            >
              <Link href={buildNotificationsHref({ unreadOnly: true })}>
                Unread only
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-border/60 bg-card/80 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              Page {notificationCenter.pagination.page} of{" "}
              {notificationCenter.pagination.totalPages}
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {notificationCenter.pagination.totalItems}{" "}
            {notificationCenter.pagination.totalItems === 1 ? "item" : "items"}
          </Badge>
        </div>

        {notificationCenter.notifications.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-muted-foreground">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Nothing here yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {notificationCenter.unreadOnly
                ? "You are fully caught up. Switch back to all notifications to review older activity."
                : "Project and issue updates will appear here as your teams work."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {notificationCenter.notifications.map((notification) => (
              <div
                key={notification.id}
                className="group flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-accent/40 sm:px-5 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <span
                    className={cn(
                      "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                      notification.isRead ? "bg-border" : "bg-rose-500",
                    )}
                  />

                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          getNotificationAccentClassName(notification),
                        )}
                      >
                        {getNotificationLabel(notification)}
                      </Badge>
                      {!notification.isRead ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-rose-400/30 bg-rose-400/10 text-rose-700 dark:text-rose-300"
                        >
                          Unread
                        </Badge>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-foreground">
                        {notification.title}
                      </h3>
                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                  {notification.trigger === "team.invited" ? (
                    <TeamInviteNotificationAction
                      notificationId={notification.id}
                      teamId={notification.teamId}
                    />
                  ) : (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                    >
                      <Link href={notification.href}>
                        Open
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {notificationCenter.pagination.totalPages > 1 ? (
        <section className="rounded-[28px] border border-border/60 bg-card/80 px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Layers3 className="h-4 w-4" />
              Showing page {notificationCenter.pagination.page} with{" "}
              {notificationCenter.pagination.pageSize} notifications per page
            </div>

            <Pagination className="mx-0 w-auto justify-start sm:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={buildNotificationsHref({
                      page: notificationCenter.pagination.page - 1,
                      pageSize: notificationCenter.pagination.pageSize,
                      unreadOnly: notificationCenter.unreadOnly,
                    })}
                    aria-disabled={
                      !notificationCenter.pagination.hasPreviousPage
                    }
                    className={
                      !notificationCenter.pagination.hasPreviousPage
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href={buildNotificationsHref({
                      page: notificationCenter.pagination.page + 1,
                      pageSize: notificationCenter.pagination.pageSize,
                      unreadOnly: notificationCenter.unreadOnly,
                    })}
                    aria-disabled={!notificationCenter.pagination.hasNextPage}
                    className={
                      !notificationCenter.pagination.hasNextPage
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </section>
      ) : null}
    </div>
  );
}
