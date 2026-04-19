import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { RouteError } from "@/routes/errors";

import type { NotificationListItem, NotificationTrigger } from "./types";

export interface CreateNotificationInput {
  userId: string;
  trigger: NotificationTrigger;
  title: string;
  message: string;
  href: string;
  teamId?: string | null;
  projectId?: string | null;
  issueId?: string | null;
}

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
    trigger: row.trigger as NotificationTrigger,
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

export async function createNotifications(entries: CreateNotificationInput[]) {
  if (entries.length === 0) {
    return [];
  }

  const rows = await db
    .insert(notifications)
    .values(
      entries.map((entry) => ({
        userId: entry.userId,
        trigger: entry.trigger,
        title: entry.title,
        message: entry.message,
        href: entry.href,
        teamId: entry.teamId ?? null,
        projectId: entry.projectId ?? null,
        issueId: entry.issueId ?? null,
      }))
    )
    .returning({
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
    });

  return rows.map(toNotificationListItem);
}

export async function markNotificationAsReadForUser(userId: string, notificationId: string) {
  const [notification] = await db
    .update(notifications)
    .set({
      readAt: new Date(),
    })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning({
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
    });

  if (!notification) {
    throw new RouteError("Notification not found.", 404);
  }

  return toNotificationListItem(notification);
}
