import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { usersToTeams } from "@/db/schema";

import { createNotifications, type CreateNotificationInput } from "./mutations";
import type { NotificationEvent } from "./types";

function normalizeActorName(name: string) {
  const value = name.trim();

  return value || "Someone";
}

async function listTeamRecipientIds(teamId: string) {
  const rows = await db
    .select({
      userId: usersToTeams.userId,
    })
    .from(usersToTeams)
    .where(eq(usersToTeams.teamId, teamId));

  return rows.map((row) => row.userId);
}

async function buildProjectCreatedNotifications(
  event: Extract<NotificationEvent, { type: "project.created" }>
) {
  const teamMemberIds = await listTeamRecipientIds(event.teamId);
  const actorName = normalizeActorName(event.actorName);

  return teamMemberIds
    .filter((userId) => userId !== event.actorId)
    .map(
      (userId): CreateNotificationInput => ({
        userId,
        trigger: event.type,
        teamId: event.teamId,
        projectId: event.projectId,
        title: "New project added",
        message: `${actorName} added ${event.projectName}.`,
        href: `/teams/${event.teamId}`,
      })
    );
}

async function buildIssueCreatedNotifications(
  event: Extract<NotificationEvent, { type: "issue.created" }>
) {
  const teamMemberIds = await listTeamRecipientIds(event.teamId);
  const excludedUserIds = new Set([event.actorId]);

  if (event.assignedTo && event.assignedTo !== event.actorId) {
    excludedUserIds.add(event.assignedTo);
  }

  const actorName = normalizeActorName(event.actorName);
  const issueLabel = `#${event.issueNo} ${event.issueTitle}`;

  return teamMemberIds
    .filter((userId) => !excludedUserIds.has(userId))
    .map(
      (userId): CreateNotificationInput => ({
        userId,
        trigger: event.type,
        teamId: event.teamId,
        projectId: event.projectId,
        issueId: event.issueId,
        title: "New issue created",
        message: `${actorName} created ${issueLabel}.`,
        href: `/teams/${event.teamId}/projects/${event.projectId}`,
      })
    );
}

async function buildIssueAssignedNotifications(
  event: Extract<NotificationEvent, { type: "issue.assigned" }>
) {
  if (event.assigneeId === event.actorId) {
    return [];
  }

  const actorName = normalizeActorName(event.actorName);
  const issueLabel = `#${event.issueNo} ${event.issueTitle}`;

  return [
    {
      userId: event.assigneeId,
      trigger: event.type,
      teamId: event.teamId,
      projectId: event.projectId,
      issueId: event.issueId,
      title: "Issue assigned to you",
      message: `${actorName} assigned ${issueLabel} to you.`,
      href: `/teams/${event.teamId}/projects/${event.projectId}`,
    } satisfies CreateNotificationInput,
  ];
}

async function buildNotificationEntries(event: NotificationEvent) {
  switch (event.type) {
    case "project.created":
      return buildProjectCreatedNotifications(event);
    case "issue.created":
      return buildIssueCreatedNotifications(event);
    case "issue.assigned":
      return buildIssueAssignedNotifications(event);
    default:
      return [];
  }
}

export async function dispatchNotificationEvent(event: NotificationEvent) {
  const entries = await buildNotificationEntries(event);

  await createNotifications(entries);
}

export async function dispatchNotificationEvents(events: NotificationEvent[]) {
  const results = await Promise.allSettled(
    events.map((event) => dispatchNotificationEvent(event))
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Failed to dispatch notification event.", {
        event: events[index],
        error: result.reason,
      });
    }
  });
}
