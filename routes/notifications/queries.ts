import "server-only";

import { and, count, desc, eq, isNull, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";

import type {
  ListNotificationsInput,
  NotificationListItem,
  NotificationsResponse,
} from "./types";

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

function buildNotificationsWhereClause(userId: string, unreadOnly: boolean) {
  const conditions: SQL[] = [eq(notifications.userId, userId)];

  if (unreadOnly) {
    conditions.push(isNull(notifications.readAt));
  }

  return and(...conditions) as SQL;
}

async function getFilteredNotificationsCount(userId: string, unreadOnly: boolean) {
  const [result] = await db
    .select({
      totalItems: count(notifications.id),
    })
    .from(notifications)
    .where(buildNotificationsWhereClause(userId, unreadOnly));

  return Number(result?.totalItems ?? 0);
}

async function getNotificationRowsForUser(userId: string, input: ListNotificationsInput) {
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
    .where(buildNotificationsWhereClause(userId, input.unreadOnly))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);
}

export async function listNotificationsForUser(
  userId: string,
  input: ListNotificationsInput
): Promise<NotificationsResponse> {
  const [totalItems, unreadCount] = await Promise.all([
    getFilteredNotificationsCount(userId, input.unreadOnly),
    getUnreadNotificationCount(userId),
  ]);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / input.pageSize) : 1;
  const page = Math.max(1, Math.min(input.page, totalPages));
  const rows = await getNotificationRowsForUser(userId, {
    ...input,
    page,
  });

  return {
    notifications: rows.map(toNotificationListItem),
    unreadCount,
    unreadOnly: input.unreadOnly,
    pagination: {
      page,
      pageSize: input.pageSize,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
}
