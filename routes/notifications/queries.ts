import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";

import type { NotificationListItem, NotificationsResponse } from "./types";

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNotificationListItem(row: {
  id: string;
  trigger: string;
  title: string;
  message: string;
  href: string;
  teamId: string | null;
  projectId: string | null;
  issueId: string | null;
  readAt: Date | string | null;
  createdAt: Date | string;
}): NotificationListItem {
  return {
    id: row.id,
    trigger: row.trigger as NotificationListItem["trigger"],
    title: row.title,
    message: row.message,
    href: row.href,
    teamId: row.teamId,
    projectId: row.projectId,
    issueId: row.issueId,
    isRead: row.readAt !== null,
    readAt: row.readAt ? toIsoString(row.readAt) : null,
    createdAt: toIsoString(row.createdAt),
  };
}

async function getUnreadNotificationCount(userId: string) {
  const [result] = await db
    .select({
      unreadCount: count(notifications.id),
    })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return Number(result?.unreadCount ?? 0);
}

async function getNotificationRowsForUser(userId: string, limit: number) {
  return db
    .select({
      id: notifications.id,
      trigger: notifications.trigger,
      title: notifications.title,
      message: notifications.message,
      href: notifications.href,
      teamId: notifications.teamId,
      projectId: notifications.projectId,
      issueId: notifications.issueId,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}

export async function listNotificationsForUser(
  userId: string,
  limit: number
): Promise<NotificationsResponse> {
  const [rows, unreadCount] = await Promise.all([
    getNotificationRowsForUser(userId, limit),
    getUnreadNotificationCount(userId),
  ]);

  return {
    notifications: rows.map(toNotificationListItem),
    unreadCount,
  };
}
