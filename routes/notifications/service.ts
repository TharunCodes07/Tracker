import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { teamMemberRoles, usersToTeams } from "@/db/schema";

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
    .where(
      and(
        eq(usersToTeams.teamId, teamId),
        eq(usersToTeams.membershipStatus, "active"),
      ),
    );

  return rows.map((row) => row.userId);
}

async function listTeamRecipientIdsByRole(
  teamId: string,
  role: "developer" | "tester",
) {
  const rows = await db
    .select({
      userId: teamMemberRoles.userId,
    })
    .from(teamMemberRoles)
    .innerJoin(
      usersToTeams,
      and(
        eq(teamMemberRoles.teamId, usersToTeams.teamId),
        eq(teamMemberRoles.userId, usersToTeams.userId),
      ),
    )
    .where(
      and(
        eq(teamMemberRoles.teamId, teamId),
        eq(teamMemberRoles.role, role),
        eq(usersToTeams.membershipStatus, "active"),
      ),
    );

  return rows.map((row) => row.userId);
}

function issueHref(event: {
  teamId: string;
  projectId: string;
  issueId: string;
}) {
  return `/teams/${event.teamId}/projects/${event.projectId}/issues/${event.issueId}`;
}

async function buildProjectCreatedNotifications(
  event: Extract<NotificationEvent, { type: "project.created" }>,
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
      }),
    );
}

async function buildTeamInvitedNotifications(
  event: Extract<NotificationEvent, { type: "team.invited" }>,
) {
  if (event.invitedUserId === event.actorId) {
    return [];
  }

  const actorName = normalizeActorName(event.actorName);

  return [
    {
      userId: event.invitedUserId,
      trigger: event.type,
      teamId: event.teamId,
      title: "Team invitation",
      message: `${actorName} invited you to join ${event.teamName}.`,
      href: "/teams",
    } satisfies CreateNotificationInput,
  ];
}

async function buildTeamRoleAssignedNotifications(
  event: Extract<NotificationEvent, { type: "team.role_assigned" }>,
) {
  if (event.memberUserId === event.actorId || event.roles.length === 0) {
    return [];
  }

  const actorName = normalizeActorName(event.actorName);
  const roleLabel = event.roles.join(" and ");

  return [
    {
      userId: event.memberUserId,
      trigger: event.type,
      teamId: event.teamId,
      title: "Team role assigned",
      message: `${actorName} assigned you as ${roleLabel} in ${event.teamName}.`,
      href: `/teams/${event.teamId}`,
    } satisfies CreateNotificationInput,
  ];
}

async function buildIssueCreatedNotifications(
  event: Extract<NotificationEvent, { type: "issue.created" }>,
) {
  const teamMemberIds = await listTeamRecipientIds(event.teamId);
  const excludedUserIds = new Set([event.actorId]);

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
        title: "New issue available",
        message: `${actorName} created ${issueLabel}.`,
        href: issueHref(event),
      }),
    );
}

async function buildIssueAssignedNotifications(
  event: Extract<NotificationEvent, { type: "issue.assigned" }>,
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
      href: issueHref(event),
    } satisfies CreateNotificationInput,
  ];
}

async function buildIssueAssignedToRoleNotifications(
  event: Extract<NotificationEvent, { type: "issue.assigned_to_role" }>,
) {
  const recipientIds = await listTeamRecipientIdsByRole(
    event.teamId,
    event.role,
  );
  const actorName = normalizeActorName(event.actorName);
  const issueLabel = `#${event.issueNo} ${event.issueTitle}`;
  const roleLabel =
    event.role === "developer" ? "development team" : "testing team";

  return recipientIds
    .filter((userId) => userId !== event.actorId)
    .map(
      (userId): CreateNotificationInput => ({
        userId,
        trigger: event.type,
        teamId: event.teamId,
        projectId: event.projectId,
        issueId: event.issueId,
        title: `Issue assigned to ${roleLabel}`,
        message: `${actorName} assigned ${issueLabel} to your ${roleLabel}.`,
        href: issueHref(event),
      }),
    );
}

async function buildIssueMarkedForReviewNotifications(
  event: Extract<NotificationEvent, { type: "issue.marked_for_review" }>,
) {
  const recipientIds = new Set<string>();

  if (event.reviewerId) {
    recipientIds.add(event.reviewerId);
  } else {
    const testerIds = await listTeamRecipientIdsByRole(event.teamId, "tester");

    testerIds.forEach((userId) => recipientIds.add(userId));
  }

  recipientIds.delete(event.actorId);

  const actorName = normalizeActorName(event.actorName);
  const issueLabel = `#${event.issueNo} ${event.issueTitle}`;

  return Array.from(recipientIds).map(
    (userId): CreateNotificationInput => ({
      userId,
      trigger: event.type,
      teamId: event.teamId,
      projectId: event.projectId,
      issueId: event.issueId,
      title: "Issue marked for review",
      message: `${actorName} marked ${issueLabel} for review.`,
      href: issueHref(event),
    }),
  );
}

async function buildIssueReadyForTestNotifications(
  event: Extract<NotificationEvent, { type: "issue.ready_for_test" }>,
) {
  const testerIds = await listTeamRecipientIdsByRole(event.teamId, "tester");
  const actorName = normalizeActorName(event.actorName);
  const issueLabel = `#${event.issueNo} ${event.issueTitle}`;

  return testerIds
    .filter((userId) => userId !== event.actorId)
    .map(
      (userId): CreateNotificationInput => ({
        userId,
        trigger: event.type,
        teamId: event.teamId,
        projectId: event.projectId,
        issueId: event.issueId,
        title: "Issue ready for testing",
        message: `${actorName} marked ${issueLabel} as done.`,
        href: issueHref(event),
      }),
    );
}

async function buildTesterHandoffNotifications(
  event: Extract<NotificationEvent, { type: "issue.fixed" | "issue.deployed" }>,
) {
  const recipientIds = new Set<string>();

  if (event.testerId) {
    recipientIds.add(event.testerId);
  } else {
    const testerIds = await listTeamRecipientIdsByRole(event.teamId, "tester");

    testerIds.forEach((userId) => recipientIds.add(userId));
  }

  recipientIds.delete(event.actorId);

  const actorName = normalizeActorName(event.actorName);
  const issueLabel = `#${event.issueNo} ${event.issueTitle}`;
  const title =
    event.type === "issue.fixed"
      ? "Issue fixed for testing"
      : "Deployment ready to test";
  const message =
    event.type === "issue.fixed"
      ? `${actorName} marked ${issueLabel} as fixed.`
      : `${actorName} marked ${issueLabel} as deployed.`;

  return Array.from(recipientIds).map(
    (userId): CreateNotificationInput => ({
      userId,
      trigger: event.type,
      teamId: event.teamId,
      projectId: event.projectId,
      issueId: event.issueId,
      title,
      message,
      href: issueHref(event),
    }),
  );
}

async function buildIssueReopenedNotifications(
  event: Extract<NotificationEvent, { type: "issue.reopened" }>,
) {
  const developerIds = await listTeamRecipientIdsByRole(
    event.teamId,
    "developer",
  );
  const recipientIds = new Set(developerIds);

  if (event.assigneeId) {
    recipientIds.add(event.assigneeId);
  }

  recipientIds.delete(event.actorId);

  const actorName = normalizeActorName(event.actorName);
  const issueLabel = `#${event.issueNo} ${event.issueTitle}`;

  return Array.from(recipientIds).map(
    (userId): CreateNotificationInput => ({
      userId,
      trigger: event.type,
      teamId: event.teamId,
      projectId: event.projectId,
      issueId: event.issueId,
      title: "Issue reopened",
      message: `${actorName} reopened ${issueLabel} after testing.`,
      href: issueHref(event),
    }),
  );
}

async function buildNotificationEntries(event: NotificationEvent) {
  switch (event.type) {
    case "team.invited":
      return buildTeamInvitedNotifications(event);
    case "team.role_assigned":
      return buildTeamRoleAssignedNotifications(event);
    case "project.created":
      return buildProjectCreatedNotifications(event);
    case "issue.created":
      return buildIssueCreatedNotifications(event);
    case "issue.assigned":
      return buildIssueAssignedNotifications(event);
    case "issue.assigned_to_role":
      return buildIssueAssignedToRoleNotifications(event);
    case "issue.marked_for_review":
      return buildIssueMarkedForReviewNotifications(event);
    case "issue.ready_for_test":
      return buildIssueReadyForTestNotifications(event);
    case "issue.fixed":
    case "issue.deployed":
      return buildTesterHandoffNotifications(event);
    case "issue.reopened":
      return buildIssueReopenedNotifications(event);
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
    events.map((event) => dispatchNotificationEvent(event)),
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
